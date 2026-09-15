from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List
from models.schemas import DriveCreate, DriveResponse, ApplicationCreate
from services.firebase_service import verify_id_token, get_firestore_db, sanitize_for_firestore

router = APIRouter()


@router.post("/")
async def create_drive(drive: DriveCreate, authorization: str = Header(None)):
    """Create a new placement drive (TPO only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    now = datetime.utcnow().isoformat()

    drive_data = sanitize_for_firestore({
        **drive.dict(),
        "status": drive.status.value if hasattr(drive.status, 'value') else drive.status,
        "createdBy": decoded.get("uid", ""),
        "createdAt": now,
        "applicationCount": 0,
    })

    doc_ref = db.collection("drives").document()
    drive_data["id"] = doc_ref.id
    doc_ref.set(drive_data)

    return {"success": True, "driveId": doc_ref.id}


@router.get("/")
async def list_drives(status: Optional[str] = None, authorization: str = Header(None)):
    """List all placement drives, optionally filtered by status."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    query = db.collection("drives")
    if status:
        query = query.where("status", "==", status)

    drives = query.stream()
    return [doc.to_dict() for doc in drives]


@router.get("/{drive_id}")
async def get_drive(drive_id: str, authorization: str = Header(None)):
    """Get a single drive by ID."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    doc = db.collection("drives").document(drive_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Drive not found")
    return doc.to_dict()


@router.put("/{drive_id}")
async def update_drive(drive_id: str, drive: DriveCreate, authorization: str = Header(None)):
    """Update a placement drive (TPO only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    doc_ref = db.collection("drives").document(drive_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Drive not found")

    update_data = sanitize_for_firestore({
        **drive.dict(),
        "status": drive.status.value if hasattr(drive.status, 'value') else drive.status,
        "updatedAt": datetime.utcnow().isoformat(),
    })
    doc_ref.update(update_data)

    return {"success": True}


@router.patch("/{drive_id}/status")
async def update_drive_status(drive_id: str, status: str, authorization: str = Header(None)):
    """Update drive status (TPO only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    doc_ref = db.collection("drives").document(drive_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Drive not found")

    doc_ref.update({"status": status, "updatedAt": datetime.utcnow().isoformat()})
    return {"success": True}


# ─── Applications ───────────────────────────────────────────────────────────

@router.post("/{drive_id}/apply")
async def apply_to_drive(drive_id: str, authorization: str = Header(None)):
    """Student applies to a placement drive."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    roll_no = decoded.get("rollNo", "")
    if not roll_no:
        raise HTTPException(status_code=400, detail="Student roll number not found in token")

    db = get_firestore_db()

    # Check drive exists and is active
    drive_doc = db.collection("drives").document(drive_id).get()
    if not drive_doc.exists:
        raise HTTPException(status_code=404, detail="Drive not found")

    drive_data = drive_doc.to_dict()

    # Check eligibility
    student_doc = db.collection("students").document(roll_no).get()
    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student = student_doc.to_dict()
    criteria = drive_data.get("eligibilityCriteria", {})

    min_cgpa = criteria.get("minCGPA", 0)
    max_backlogs = criteria.get("maxBacklogs", 99)
    eligible_branches = criteria.get("branches", [])

    if student.get("cgpa", 0) < min_cgpa:
        raise HTTPException(status_code=400, detail=f"CGPA {student['cgpa']} below minimum {min_cgpa}")
    if student.get("backlogs", 0) > max_backlogs:
        raise HTTPException(status_code=400, detail=f"Backlogs {student['backlogs']} exceed maximum {max_backlogs}")
    if eligible_branches and student.get("branch", "") not in eligible_branches:
        raise HTTPException(status_code=400, detail=f"Branch {student['branch']} not eligible")

    # Check for duplicate application
    existing = db.collection("drives").document(drive_id).collection("applications").document(roll_no).get()
    if existing.exists:
        raise HTTPException(status_code=400, detail="Already applied to this drive")

    now = datetime.utcnow().isoformat()
    application_data = sanitize_for_firestore({
        "driveId": drive_id,
        "rollNo": roll_no,
        "studentName": student.get("name", ""),
        "branch": student.get("branch", ""),
        "cgpa": student.get("cgpa", 0),
        "status": "applied",
        "appliedAt": now,
    })

    db.collection("drives").document(drive_id).collection("applications").document(roll_no).set(application_data)

    # Increment application count
    from google.cloud.firestore import Increment
    db.collection("drives").document(drive_id).update({"applicationCount": Increment(1)})

    return {"success": True, "status": "applied"}


@router.get("/{drive_id}/applications")
async def get_drive_applications(drive_id: str, authorization: str = Header(None)):
    """Get all applications for a drive (TPO/Recruiter)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    apps = db.collection("drives").document(drive_id).collection("applications").stream()
    return [doc.to_dict() for doc in apps]


@router.patch("/{drive_id}/applications/{roll_no}/status")
async def update_application_status(
    drive_id: str, roll_no: str, status: str, authorization: str = Header(None)
):
    """Update application status (TPO/Recruiter)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    doc_ref = db.collection("drives").document(drive_id).collection("applications").document(roll_no)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Application not found")

    doc_ref.update({"status": status, "updatedAt": datetime.utcnow().isoformat()})
    return {"success": True}
