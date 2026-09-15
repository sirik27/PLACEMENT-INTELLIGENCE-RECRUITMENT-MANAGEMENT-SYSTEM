from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from services.firebase_service import verify_id_token, get_firestore_db

router = APIRouter()


class LoginValidation(BaseModel):
    idToken: str
    targetRole: str  # "student", "tpo", "recruiter"


class RoleValidationResponse(BaseModel):
    valid: bool
    uid: str = ""
    role: str = ""
    email: str = ""
    displayName: str = ""
    message: str = ""


@router.post("/validate-role", response_model=RoleValidationResponse)
async def validate_role(data: LoginValidation):
    """
    Validate that the authenticated user's role matches the target portal.
    Called after client-side signInWithEmailAndPassword.
    """
    decoded = verify_id_token(data.idToken)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    uid = decoded.get("uid", "")
    email = decoded.get("email", "")

    # Check custom claims first
    claimed_role = decoded.get("role", "")

    # Also check Firestore /users/{uid} document
    db = get_firestore_db()
    user_doc = db.collection("users").document(uid).get()

    if user_doc.exists:
        user_data = user_doc.to_dict()
        firestore_role = user_data.get("role", "")
        display_name = user_data.get("displayName", user_data.get("name", email))
    else:
        firestore_role = claimed_role
        display_name = decoded.get("name", email)

    # Use Firestore role as source of truth, fall back to claims
    actual_role = firestore_role or claimed_role

    if actual_role != data.targetRole:
        return RoleValidationResponse(
            valid=False,
            uid=uid,
            role=actual_role,
            email=email,
            displayName=display_name,
            message=f"Access Denied: You cannot log into the {data.targetRole.upper()} portal with a {actual_role.upper()} account.",
        )

    return RoleValidationResponse(
        valid=True,
        uid=uid,
        role=actual_role,
        email=email,
        displayName=display_name,
        message="Authentication successful",
    )


@router.get("/me")
async def get_current_user(authorization: str = Header(None)):
    """Get the current user's profile from their token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    uid = decoded.get("uid", "")
    db = get_firestore_db()
    user_doc = db.collection("users").document(uid).get()

    if user_doc.exists:
        user_data = user_doc.to_dict()
        return {
            "uid": uid,
            "email": decoded.get("email", ""),
            "role": user_data.get("role", decoded.get("role", "")),
            "displayName": user_data.get("displayName", ""),
            "rollNo": user_data.get("rollNo", ""),
            **{k: v for k, v in user_data.items() if k not in ["uid"]},
        }
    else:
        return {
            "uid": uid,
            "email": decoded.get("email", ""),
            "role": decoded.get("role", ""),
            "displayName": decoded.get("name", ""),
        }
