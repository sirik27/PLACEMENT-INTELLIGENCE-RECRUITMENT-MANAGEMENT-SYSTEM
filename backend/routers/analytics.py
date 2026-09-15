from fastapi import APIRouter, HTTPException, Header
from services.firebase_service import verify_id_token, get_firestore_db
from algorithms.readiness import calculate_readiness_score
from algorithms.skills import analyze_skill_gap, rank_students_by_compatibility, get_learning_recommendations
from algorithms.outcome import calculate_outcome_probability, batch_calculate_outcomes
from algorithms.simulator import calculate_eligible, simulate_funnel, compare_scenarios
from algorithms.trends import run_all_anomaly_checks

router = APIRouter()


@router.get("/readiness/{roll_no}")
async def get_readiness_score(roll_no: str, drive_id: str = None, authorization: str = Header(None)):
    """Calculate placement readiness score for a student."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    student_doc = db.collection("students").document(roll_no).get()
    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")

    student = student_doc.to_dict()

    # Get drive-specific required skills if drive_id provided
    required_skills = []
    if drive_id:
        drive_doc = db.collection("drives").document(drive_id).get()
        if drive_doc.exists:
            required_skills = drive_doc.to_dict().get("requiredSkills", [])

    result = calculate_readiness_score(
        cgpa=student.get("cgpa", 0),
        correct_aptitude=int(student.get("aptitudeScore", 0) * 20 / 100) if student.get("aptitudeScore") else 0,
        total_aptitude=20,
        test_cases_passed=int(student.get("codingScore", 0) * 3 / 100) if student.get("codingScore") else 0,
        total_test_cases=3,
        student_skills=student.get("skills", []),
        required_skills=required_skills,
    )

    return {
        "rollNo": roll_no,
        "studentName": student.get("name", ""),
        **result,
    }


@router.get("/skill-gap/{roll_no}")
async def get_skill_gap(roll_no: str, drive_id: str = None, authorization: str = Header(None)):
    """Analyze skill gap for a student against drive requirements."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    student_doc = db.collection("students").document(roll_no).get()
    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")

    student = student_doc.to_dict()

    # Get required skills from all active drives or specific drive
    if drive_id:
        drive_doc = db.collection("drives").document(drive_id).get()
        if not drive_doc.exists:
            raise HTTPException(status_code=404, detail="Drive not found")
        drives = [{"id": drive_id, **drive_doc.to_dict()}]
    else:
        drives_query = db.collection("drives").where("status", "in", ["active", "upcoming"]).stream()
        drives = [{"id": doc.id, **doc.to_dict()} for doc in drives_query]

    analysis_per_drive = []
    all_missing = set()

    for drive in drives:
        required = drive.get("requiredSkills", [])
        if not required:
            continue
        gap = analyze_skill_gap(student.get("skills", []), required)
        all_missing.update(gap["missing"])
        analysis_per_drive.append({
            "driveId": drive.get("id", ""),
            "company": drive.get("company", ""),
            "role": drive.get("role", ""),
            **gap,
        })

    # Generate learning recommendations for all missing skills
    recommendations = get_learning_recommendations(list(all_missing))

    return {
        "rollNo": roll_no,
        "studentName": student.get("name", ""),
        "studentSkills": student.get("skills", []),
        "driveAnalysis": analysis_per_drive,
        "allMissingSkills": sorted(list(all_missing)),
        "learningRecommendations": recommendations,
    }


@router.get("/prediction/{roll_no}")
async def get_prediction(roll_no: str, drive_id: str = None, authorization: str = Header(None)):
    """Get placement outcome probability for a student."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    student_doc = db.collection("students").document(roll_no).get()
    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")

    student = student_doc.to_dict()

    # Calculate readiness
    readiness = calculate_readiness_score(
        cgpa=student.get("cgpa", 0),
        correct_aptitude=int(student.get("aptitudeScore", 0) * 20 / 100) if student.get("aptitudeScore") else 0,
        total_aptitude=20,
        test_cases_passed=int(student.get("codingScore", 0) * 3 / 100) if student.get("codingScore") else 0,
        total_test_cases=3,
        student_skills=student.get("skills", []),
        required_skills=[],
    )

    # Check if interview rubric exists
    rubric_data = {}
    if drive_id:
        rubric_doc = db.collection("drives").document(drive_id).collection("recruitment_notes").document(roll_no).get()
        if rubric_doc.exists:
            rubric_data = rubric_doc.to_dict()

    prediction = calculate_outcome_probability(
        readiness_score=readiness["readinessScore"],
        technical=rubric_data.get("technical"),
        problem_solving=rubric_data.get("problemSolving"),
        communication=rubric_data.get("communication"),
        hr=rubric_data.get("hr"),
    )

    return {
        "rollNo": roll_no,
        "studentName": student.get("name", ""),
        **prediction,
    }


@router.post("/simulate")
async def simulate_drive_funnel(data: dict, authorization: str = Header(None)):
    """Run funnel simulation with custom rates."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()

    min_cgpa = data.get("minCGPA", 0)
    max_backlogs = data.get("maxBacklogs", 99)
    branches = data.get("branches", [])
    test_taker_rate = data.get("testTakerRate", 0.85)
    interview_rate = data.get("interviewRate", 0.35)
    offer_rate = data.get("offerRate", 0.25)

    # Get all students
    students_query = db.collection("students").stream()
    students = [doc.to_dict() for doc in students_query]

    eligibility = calculate_eligible(students, min_cgpa, max_backlogs, branches if branches else None)
    funnel = simulate_funnel(
        eligibility["eligibleCount"],
        test_taker_rate,
        interview_rate,
        offer_rate,
    )

    return {
        **eligibility,
        **funnel,
    }


@router.get("/trends")
async def get_trends(authorization: str = Header(None)):
    """Run anomaly detection on placement data."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()

    # Aggregate stats from all drives
    drives = db.collection("drives").stream()
    total_interviews = 0
    failed_hr = 0
    total_submissions = 0
    failed_coding = 0
    total_aptitude = 0
    failed_aptitude = 0
    placed = 0
    total_eligible = 0

    branch_stats = {}

    students = db.collection("students").stream()
    student_list = [doc.to_dict() for doc in students]

    for s in student_list:
        branch = s.get("branch", "Other")
        if branch not in branch_stats:
            branch_stats[branch] = {"branch": branch, "placed": 0, "total": 0}
        branch_stats[branch]["total"] += 1
        total_eligible += 1

        if s.get("placementStatus") == "placed":
            placed += 1
            branch_stats[branch]["placed"] += 1

        if s.get("aptitudeScore") is not None:
            total_aptitude += 1
            if s["aptitudeScore"] < 40:
                failed_aptitude += 1

        if s.get("codingScore") is not None:
            total_submissions += 1
            if s["codingScore"] < 50:
                failed_coding += 1

    drive_stats = {
        "failedHR": failed_hr,
        "totalInterviews": total_interviews,
        "failedCoding": failed_coding,
        "totalSubmissions": total_submissions,
        "failedAptitude": failed_aptitude,
        "totalAptitudeAttempts": total_aptitude,
        "placed": placed,
        "totalEligible": total_eligible,
        "branchData": list(branch_stats.values()),
    }

    alerts = run_all_anomaly_checks(drive_stats)

    return {
        "stats": drive_stats,
        "alerts": alerts,
        "branchDistribution": list(branch_stats.values()),
    }


@router.get("/dashboard-stats")
async def get_dashboard_stats(authorization: str = Header(None)):
    """Get overview stats for TPO dashboard."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()

    # Count students
    students = list(db.collection("students").stream())
    total_students = len(students)
    placed = sum(1 for s in students if s.to_dict().get("placementStatus") == "placed")

    # Count drives
    drives = list(db.collection("drives").stream())
    active_drives = sum(1 for d in drives if d.to_dict().get("status") == "active")

    # Count recruiters
    recruiters = list(db.collection("recruiters").stream())

    # Branch distribution
    branch_dist = {}
    for s in students:
        data = s.to_dict()
        branch = data.get("branch", "Other")
        if branch not in branch_dist:
            branch_dist[branch] = {"branch": branch, "total": 0, "placed": 0, "avgCGPA": 0, "cgpaSum": 0}
        branch_dist[branch]["total"] += 1
        branch_dist[branch]["cgpaSum"] += data.get("cgpa", 0)
        if data.get("placementStatus") == "placed":
            branch_dist[branch]["placed"] += 1

    for key in branch_dist:
        total = branch_dist[key]["total"]
        branch_dist[key]["avgCGPA"] = round(branch_dist[key]["cgpaSum"] / total, 2) if total > 0 else 0
        del branch_dist[key]["cgpaSum"]

    return {
        "totalStudents": total_students,
        "placedStudents": placed,
        "placementRate": round((placed / total_students) * 100, 2) if total_students > 0 else 0,
        "totalDrives": len(drives),
        "activeDrives": active_drives,
        "totalRecruiters": len(recruiters),
        "branchDistribution": list(branch_dist.values()),
    }
