from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from models.schemas import InterviewRubric
from services.firebase_service import verify_id_token, get_firestore_db, sanitize_for_firestore

router = APIRouter()


@router.post("/{drive_id}/rubric/{roll_no}")
async def submit_rubric(
    drive_id: str,
    roll_no: str,
    rubric: InterviewRubric,
    authorization: str = Header(None),
):
    """
    Submit interview rubric for a student (Recruiter/TPO only).
    Saves to /drives/{driveId}/recruitment_notes/{rollNo}.
    Students CANNOT read this collection (blocked by Firestore rules).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    role = decoded.get("role", "")
    if role not in ("tpo", "recruiter"):
        # Verify from Firestore
        db = get_firestore_db()
        user_doc = db.collection("users").document(decoded["uid"]).get()
        if not user_doc.exists or user_doc.to_dict().get("role") not in ("tpo", "recruiter"):
            raise HTTPException(status_code=403, detail="Only recruiters and TPO can submit rubrics")

    db = get_firestore_db()
    now = datetime.utcnow().isoformat()

    average_score = (rubric.technical + rubric.problemSolving + rubric.communication + rubric.hr) / 4

    rubric_data = sanitize_for_firestore({
        "driveId": drive_id,
        "rollNo": roll_no,
        "technical": rubric.technical,
        "problemSolving": rubric.problemSolving,
        "communication": rubric.communication,
        "hr": rubric.hr,
        "averageScore": round(average_score, 2),
        "privateNotes": rubric.privateNotes,
        "evaluatedBy": decoded.get("uid", ""),
        "evaluatedAt": now,
    })

    db.collection("drives").document(drive_id).collection("recruitment_notes").document(roll_no).set(rubric_data)

    return {
        "success": True,
        "averageScore": round(average_score, 2),
    }


@router.get("/{drive_id}/rubric/{roll_no}")
async def get_rubric(drive_id: str, roll_no: str, authorization: str = Header(None)):
    """Get interview rubric for a student (Recruiter/TPO only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    doc = db.collection("drives").document(drive_id).collection("recruitment_notes").document(roll_no).get()
    if not doc.exists:
        return {"exists": False}
    return {**doc.to_dict(), "exists": True}


@router.get("/{drive_id}/rubrics")
async def get_all_rubrics(drive_id: str, authorization: str = Header(None)):
    """Get all rubrics for a drive (TPO/Recruiter only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    docs = db.collection("drives").document(drive_id).collection("recruitment_notes").stream()
    return [doc.to_dict() for doc in docs]


@router.post("/{drive_id}/schedule-slot")
async def schedule_interview_slot(drive_id: str, data: dict, authorization: str = Header(None)):
    """Schedule an interview time slot for a student."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    roll_no = data.get("rollNo", "")
    slot_time = data.get("slotTime", "")
    now = datetime.utcnow().isoformat()

    # Update application status
    app_ref = db.collection("drives").document(drive_id).collection("applications").document(roll_no)
    app_doc = app_ref.get()
    if app_doc.exists:
        app_ref.update({
            "status": "interview_scheduled",
            "interviewSlot": slot_time,
            "updatedAt": now,
        })

    return {"success": True, "rollNo": roll_no, "slotTime": slot_time}
