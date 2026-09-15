import csv
import io
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from typing import List
from models.schemas import StudentCreate, RecruiterCreate, CSVUploadResponse
from services.firebase_service import (
    create_user_with_claims,
    get_firestore_db,
    verify_id_token,
    sanitize_for_firestore,
)

router = APIRouter()


def require_tpo(authorization: str):
    """Verify the caller is a TPO."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")
    # Check custom claims or Firestore
    if decoded.get("role") != "tpo":
        db = get_firestore_db()
        user_doc = db.collection("users").document(decoded["uid"]).get()
        if not user_doc.exists or user_doc.to_dict().get("role") != "tpo":
            raise HTTPException(status_code=403, detail="Only TPO can manage users")
    return decoded


@router.post("/create-student")
async def create_student(student: StudentCreate, authorization: str = Header(None)):
    """
    Create a single student account.
    TPO-only: Creates Firebase Auth user + Firestore profile.
    """
    require_tpo(authorization)

    password = student.password or f"{student.rollNo.lower()}@vbit"
    skills_list = [s.strip() for s in student.skills.split(",") if s.strip()]

    # Create Firebase Auth user with custom claims
    user_record = create_user_with_claims(
        email=student.email,
        password=password,
        display_name=student.name,
        custom_claims={"role": "student", "rollNo": student.rollNo},
    )

    # Create Firestore documents
    db = get_firestore_db()
    now = datetime.utcnow().isoformat()

    # /users/{uid} — role metadata
    user_data = sanitize_for_firestore({
        "uid": user_record.uid,
        "email": student.email,
        "role": "student",
        "displayName": student.name,
        "rollNo": student.rollNo,
        "createdAt": now,
    })
    db.collection("users").document(user_record.uid).set(user_data)

    # /students/{rollNo} — full profile
    student_data = sanitize_for_firestore({
        "rollNo": student.rollNo,
        "name": student.name,
        "email": student.email,
        "branch": student.branch,
        "section": student.section,
        "cgpa": student.cgpa,
        "backlogs": student.backlogs,
        "skills": skills_list,
        "phone": student.phone,
        "gender": student.gender,
        "tenthMarks": student.tenthMarks,
        "twelfthMarks": student.twelfthMarks,
        "entryType": student.entryType.value if hasattr(student.entryType, 'value') else student.entryType,
        "placementStatus": "unplaced",
        "createdAt": now,
        "uid": user_record.uid,
    })
    db.collection("students").document(student.rollNo).set(student_data)

    return {"success": True, "uid": user_record.uid, "rollNo": student.rollNo}


@router.post("/upload-csv", response_model=CSVUploadResponse)
async def upload_student_csv(file: UploadFile = File(...), authorization: str = Header(None)):
    """
    Bulk upload students from CSV file.
    TPO-only: Parses CSV, creates Firebase Auth users and Firestore profiles.
    """
    require_tpo(authorization)

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    db = get_firestore_db()
    success_count = 0
    failed_count = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            roll_no = row.get("RollNo", "").strip()
            name = row.get("Name", "").strip()
            email = row.get("Email", "").strip()
            branch = row.get("Branch", "").strip()
            section = row.get("Section", "").strip()
            cgpa = float(row.get("CGPA", 0))
            backlogs = int(row.get("Backlogs", 0))
            skills_str = row.get("Skills", "")
            phone = row.get("Phone", "").strip()
            gender = row.get("Gender", "").strip()
            tenth = float(row.get("10thMarks", 0))
            twelfth = float(row.get("12thMarks", 0))
            entry_type = row.get("EntryType", "Regular").strip()

            if not roll_no or not email:
                errors.append(f"Row {row_num}: Missing RollNo or Email")
                failed_count += 1
                continue

            password = f"{roll_no.lower()}@vbit"
            skills_list = [s.strip() for s in skills_str.split(",") if s.strip()]

            # Create Firebase Auth user
            user_record = create_user_with_claims(
                email=email,
                password=password,
                display_name=name,
                custom_claims={"role": "student", "rollNo": roll_no},
            )

            now = datetime.utcnow().isoformat()

            # /users/{uid}
            user_data = sanitize_for_firestore({
                "uid": user_record.uid,
                "email": email,
                "role": "student",
                "displayName": name,
                "rollNo": roll_no,
                "createdAt": now,
            })
            db.collection("users").document(user_record.uid).set(user_data)

            # /students/{rollNo}
            student_data = sanitize_for_firestore({
                "rollNo": roll_no,
                "name": name,
                "email": email,
                "branch": branch,
                "section": section,
                "cgpa": cgpa,
                "backlogs": backlogs,
                "skills": skills_list,
                "phone": phone,
                "gender": gender,
                "tenthMarks": tenth,
                "twelfthMarks": twelfth,
                "entryType": entry_type,
                "placementStatus": "unplaced",
                "createdAt": now,
                "uid": user_record.uid,
            })
            db.collection("students").document(roll_no).set(student_data)

            success_count += 1

        except Exception as e:
            failed_count += 1
            errors.append(f"Row {row_num}: {str(e)}")

    return CSVUploadResponse(
        totalRows=success_count + failed_count,
        successCount=success_count,
        failedCount=failed_count,
        errors=errors[:50],  # Cap error messages
    )


@router.post("/create-recruiter")
async def create_recruiter(recruiter: RecruiterCreate, authorization: str = Header(None)):
    """
    Create a recruiter account.
    TPO-only: Creates Firebase Auth user + Firestore profile.
    """
    require_tpo(authorization)

    user_record = create_user_with_claims(
        email=recruiter.email,
        password=recruiter.password,
        display_name=recruiter.displayName,
        custom_claims={"role": "recruiter", "company": recruiter.company},
    )

    db = get_firestore_db()
    now = datetime.utcnow().isoformat()

    # /users/{uid}
    user_data = sanitize_for_firestore({
        "uid": user_record.uid,
        "email": recruiter.email,
        "role": "recruiter",
        "displayName": recruiter.displayName,
        "company": recruiter.company,
        "createdAt": now,
    })
    db.collection("users").document(user_record.uid).set(user_data)

    # /recruiters/{uid}
    recruiter_data = sanitize_for_firestore({
        "uid": user_record.uid,
        "email": recruiter.email,
        "displayName": recruiter.displayName,
        "company": recruiter.company,
        "designation": recruiter.designation,
        "companyDomain": recruiter.companyDomain,
        "activeDriveId": recruiter.activeDriveId,
        "phone": recruiter.phone,
        "createdAt": now,
    })
    db.collection("recruiters").document(user_record.uid).set(recruiter_data)

    return {"success": True, "uid": user_record.uid}


@router.get("/students")
async def list_students(authorization: str = Header(None)):
    """List all students (TPO/Recruiter only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    students = db.collection("students").stream()
    return [doc.to_dict() for doc in students]


@router.get("/students/{roll_no}")
async def get_student(roll_no: str, authorization: str = Header(None)):
    """Get a single student profile."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    doc = db.collection("students").document(roll_no).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")
    return doc.to_dict()


@router.get("/recruiters")
async def list_recruiters(authorization: str = Header(None)):
    """List all recruiters (TPO only)."""
    require_tpo(authorization)
    db = get_firestore_db()
    recruiters = db.collection("recruiters").stream()
    return [doc.to_dict() for doc in recruiters]
