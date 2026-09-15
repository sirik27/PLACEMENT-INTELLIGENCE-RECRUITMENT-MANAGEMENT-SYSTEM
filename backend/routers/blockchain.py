import hashlib
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from models.schemas import AnchorCredentialRequest, CredentialResponse
from services.firebase_service import verify_id_token, get_firestore_db, sanitize_for_firestore
from services.blockchain_service import anchor_credential, verify_credential

router = APIRouter()


@router.post("/anchor", response_model=CredentialResponse)
async def anchor_credential_endpoint(request: AnchorCredentialRequest, authorization: str = Header(None)):
    """
    Anchor a credential hash on-chain (TPO only).
    Students never pay gas — TPO relayer signs all transactions.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        result = await anchor_credential(
            roll_no=request.rollNo,
            doc_hash_hex=request.documentHash,
            credential_type=request.credentialType,
        )

        # Save to Firestore for quick lookups
        db = get_firestore_db()
        now = datetime.utcnow().isoformat()
        cred_data = sanitize_for_firestore({
            "rollNo": request.rollNo,
            "documentHash": request.documentHash,
            "credentialType": request.credentialType,
            "txHash": result["txHash"],
            "explorerLink": result["explorerLink"],
            "anchoredAt": now,
            "anchoredBy": decoded.get("uid", ""),
        })
        db.collection("credentials").document(request.documentHash[:20]).set(cred_data)

        return CredentialResponse(
            rollNo=request.rollNo,
            documentHash=request.documentHash,
            credentialType=request.credentialType,
            txHash=result["txHash"],
            explorerLink=result["explorerLink"],
            timestamp=now,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain transaction failed: {str(e)}")


@router.get("/verify/{doc_hash}")
async def verify_credential_endpoint(doc_hash: str, authorization: str = Header(None)):
    """Verify a credential on-chain."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        result = await verify_credential(doc_hash)
        return result
    except Exception as e:
        # Fall back to Firestore lookup
        db = get_firestore_db()
        doc = db.collection("credentials").document(doc_hash[:20]).get()
        if doc.exists:
            return {**doc.to_dict(), "source": "firestore"}
        raise HTTPException(status_code=404, detail="Credential not found")


@router.get("/student/{roll_no}")
async def get_student_credentials(roll_no: str, authorization: str = Header(None)):
    """Get all blockchain credentials for a student."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    creds = db.collection("credentials").where("rollNo", "==", roll_no).stream()
    return [doc.to_dict() for doc in creds]


@router.post("/hash")
async def generate_document_hash(data: dict):
    """Generate SHA-256 hash for a document/credential."""
    content = data.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="Content required")

    doc_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    return {"hash": doc_hash, "prefixed": f"0x{doc_hash}"}
