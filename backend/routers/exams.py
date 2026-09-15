from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from models.schemas import ExamAttemptCreate
from services.firebase_service import verify_id_token, get_firestore_db, sanitize_for_firestore
from algorithms.exam_seed import select_questions, grade_aptitude_exam
from algorithms.readiness import calculate_readiness_score

router = APIRouter()

# ─── Sample Question Bank (stored in Firestore in production) ─────────────
# This provides a fallback bank if Firestore /question_banks is empty.

SAMPLE_APTITUDE_BANK = [
    {"id": f"apt_{i+1}", "question": q, "options": opts, "correctIndex": ci, "topic": t, "difficulty": d}
    for i, (q, opts, ci, t, d) in enumerate([
        ("If 3x + 7 = 22, what is x?", ["3", "4", "5", "6"], 2, "Algebra", "easy"),
        ("What is 15% of 200?", ["25", "30", "35", "40"], 1, "Percentage", "easy"),
        ("A train travels 120km in 2 hours. What is its speed?", ["40 km/h", "50 km/h", "60 km/h", "70 km/h"], 2, "Speed", "easy"),
        ("Find the next number: 2, 6, 12, 20, ?", ["28", "30", "32", "24"], 1, "Series", "medium"),
        ("If the ratio of boys to girls is 3:5, and there are 40 students, how many boys?", ["15", "20", "25", "12"], 0, "Ratio", "easy"),
        ("What is the compound interest on Rs.1000 at 10% for 2 years?", ["200", "210", "220", "250"], 1, "Interest", "medium"),
        ("A can do a work in 12 days, B in 15 days. Together they finish in?", ["6.67 days", "7 days", "8 days", "5 days"], 0, "Work", "medium"),
        ("The HCF of 12, 18, 24 is?", ["4", "6", "8", "12"], 1, "Number Theory", "easy"),
        ("If APPLE is coded as 50, then MANGO is?", ["57", "52", "47", "60"], 0, "Coding", "medium"),
        ("Which number is a perfect square? 225, 226, 227, 228", ["225", "226", "227", "228"], 0, "Numbers", "easy"),
        ("Time taken for a pipe to fill a 500L tank at 25L/min?", ["15 min", "20 min", "25 min", "30 min"], 1, "Pipes", "easy"),
        ("Find the odd one out: 2, 5, 10, 17, 28, 37", ["28", "37", "17", "10"], 1, "Series", "medium"),
        ("A clock shows 3:15. What is the angle between hands?", ["7.5°", "0°", "15°", "22.5°"], 0, "Clocks", "hard"),
        ("If log₂(x) = 5, then x = ?", ["10", "25", "32", "64"], 2, "Logarithm", "medium"),
        ("Probability of getting a sum of 7 with two dice?", ["1/6", "5/36", "7/36", "1/4"], 0, "Probability", "medium"),
        ("Average of first 50 natural numbers?", ["25", "25.5", "26", "50"], 1, "Average", "easy"),
        ("If a number is increased by 20% and then decreased by 20%, net change?", ["-4%", "0%", "+4%", "-2%"], 0, "Percentage", "medium"),
        ("How many diagonals in a hexagon?", ["6", "9", "12", "15"], 1, "Geometry", "medium"),
        ("Simple interest on Rs.5000 at 8% for 3 years?", ["1000", "1200", "1400", "800"], 1, "Interest", "easy"),
        ("If 5 men can do a job in 20 days, 10 men can do it in?", ["10 days", "15 days", "8 days", "5 days"], 0, "Work", "easy"),
        ("Which is the largest 3-digit prime number?", ["991", "997", "993", "999"], 1, "Prime", "hard"),
        ("Speed of a boat upstream is 8 km/h, downstream is 12 km/h. Speed in still water?", ["9 km/h", "10 km/h", "11 km/h", "8 km/h"], 1, "Boats", "medium"),
        ("If the perimeter of a square is 48cm, find its area.", ["144 cm²", "128 cm²", "196 cm²", "100 cm²"], 0, "Geometry", "easy"),
        ("Complete the series: B, D, G, K, ?", ["O", "P", "N", "Q"], 1, "Series", "hard"),
        ("A shopkeeper sells at 25% profit. Cost price is 400. Selling price?", ["450", "475", "500", "525"], 2, "Profit/Loss", "easy"),
        ("If x² - 5x + 6 = 0, values of x?", ["2, 3", "1, 6", "3, 4", "-2, -3"], 0, "Algebra", "medium"),
        ("How many ways to arrange letters of GATE?", ["12", "24", "36", "48"], 1, "Permutation", "medium"),
        ("The LCM of 4, 6, 8 is?", ["12", "24", "48", "8"], 1, "Number Theory", "easy"),
        ("If today is Monday, what day is 100 days from now?", ["Wednesday", "Thursday", "Friday", "Tuesday"], 0, "Calendar", "medium"),
        ("A triangle has sides 3, 4, 5. What type is it?", ["Equilateral", "Isosceles", "Right-angled", "Scalene"], 2, "Geometry", "easy"),
        ("What is 0.1 × 0.01 × 0.001?", ["0.000001", "0.00001", "0.0001", "0.001"], 0, "Decimals", "easy"),
        ("If 2^n = 1024, then n = ?", ["8", "9", "10", "12"], 2, "Exponents", "easy"),
        ("Surface area of a cube with side 5cm?", ["125 cm²", "150 cm²", "175 cm²", "200 cm²"], 1, "Geometry", "medium"),
        ("Mixture: 40L milk + 10L water. Find milk percentage.", ["75%", "80%", "85%", "70%"], 1, "Mixture", "easy"),
        ("If a = 3, b = 4, find a² + b².", ["7", "12", "25", "49"], 2, "Algebra", "easy"),
        ("Income tax at 30% on Rs.50000 income?", ["12000", "15000", "18000", "20000"], 1, "Tax", "easy"),
        ("Discount of 10% on Rs.500. Net price?", ["400", "425", "450", "475"], 2, "Discount", "easy"),
        ("Which fraction is largest: 3/4, 5/7, 7/10, 2/3?", ["3/4", "5/7", "7/10", "2/3"], 0, "Fractions", "medium"),
        ("A circle has radius 7cm. Find its circumference.", ["22 cm", "44 cm", "154 cm", "38.5 cm"], 1, "Geometry", "easy"),
        ("If 5! = 120, then 6! = ?", ["360", "600", "720", "840"], 2, "Factorial", "easy"),
        ("Median of 3, 7, 1, 9, 5?", ["3", "5", "7", "9"], 1, "Statistics", "easy"),
        ("Standard deviation measures?", ["Central tendency", "Spread", "Skewness", "Correlation"], 1, "Statistics", "medium"),
        ("Binary of 13 is?", ["1100", "1101", "1110", "1011"], 1, "Binary", "medium"),
        ("Volume of a cylinder: r=3, h=7?", ["63π", "21π", "42π", "126π"], 0, "Geometry", "medium"),
        ("What is the mode of 2, 3, 3, 5, 7, 7, 7, 8?", ["3", "5", "7", "8"], 2, "Statistics", "easy"),
        ("If cos θ = 0.6, find sin θ.", ["0.4", "0.6", "0.8", "1.0"], 2, "Trigonometry", "medium"),
        ("A car depreciates 15% yearly. After 1 year on Rs.2,00,000?", ["1,70,000", "1,75,000", "1,80,000", "1,65,000"], 0, "Depreciation", "medium"),
        ("Which is not a Fibonacci number?", ["8", "13", "15", "21"], 2, "Series", "medium"),
        ("If p(A)=0.3, p(B)=0.5, p(A∩B)=0.15. Are A,B independent?", ["Yes", "No", "Cannot determine", "Need more data"], 0, "Probability", "hard"),
        ("Matrix multiplication: [2x2] × [2x1] gives?", ["2x1", "2x2", "1x2", "1x1"], 0, "Matrix", "medium"),
    ])
]


@router.get("/{drive_id}/aptitude/questions")
async def get_aptitude_questions(drive_id: str, authorization: str = Header(None)):
    """
    Get deterministically selected aptitude questions for a student.
    Same student + same drive = same questions every time.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    roll_no = decoded.get("rollNo", "")
    if not roll_no:
        raise HTTPException(status_code=400, detail="Roll number not found")

    db = get_firestore_db()

    # Try to get question bank from Firestore
    bank_doc = db.collection("question_banks").document(f"{drive_id}_aptitude").get()
    if bank_doc.exists:
        question_bank = bank_doc.to_dict().get("questions", SAMPLE_APTITUDE_BANK)
    else:
        question_bank = SAMPLE_APTITUDE_BANK

    # Select 20 questions deterministically
    selected = select_questions(question_bank, roll_no, drive_id, count=20)

    # Remove correctIndex from response (don't leak answers to client)
    client_questions = []
    for q in selected:
        client_q = {k: v for k, v in q.items() if k != "correctIndex"}
        client_questions.append(client_q)

    return {
        "driveId": drive_id,
        "rollNo": roll_no,
        "totalQuestions": len(client_questions),
        "duration": 30,  # minutes
        "questions": client_questions,
    }


@router.post("/{drive_id}/aptitude/submit")
async def submit_aptitude_exam(drive_id: str, attempt: ExamAttemptCreate, authorization: str = Header(None)):
    """Submit aptitude exam answers for grading."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    roll_no = decoded.get("rollNo", attempt.rollNo)
    db = get_firestore_db()

    # Check attempt status
    attempt_ref = db.collection("drives").document(drive_id).collection("attempts").document(roll_no)
    existing = attempt_ref.get()
    if existing.exists:
        existing_data = existing.to_dict()
        if existing_data.get("status") == "disqualified_malpractice":
            raise HTTPException(status_code=403, detail="Disqualified due to malpractice")
        if existing_data.get("status") == "completed":
            raise HTTPException(status_code=400, detail="Exam already submitted")

    # Get the same questions for grading (with correctIndex)
    bank_doc = db.collection("question_banks").document(f"{drive_id}_aptitude").get()
    if bank_doc.exists:
        question_bank = bank_doc.to_dict().get("questions", SAMPLE_APTITUDE_BANK)
    else:
        question_bank = SAMPLE_APTITUDE_BANK

    selected = select_questions(question_bank, roll_no, drive_id, count=20)

    # Grade
    result = grade_aptitude_exam(selected, attempt.answers)
    now = datetime.utcnow().isoformat()

    attempt_data = sanitize_for_firestore({
        "driveId": drive_id,
        "rollNo": roll_no,
        "examType": "aptitude",
        "status": "completed",
        "answers": attempt.answers,
        "score": result["percentage"],
        "correct": result["correct"],
        "total": result["total"],
        "endTime": now,
        "submittedAt": now,
    })

    attempt_ref.set(attempt_data, merge=True)

    # Update student's aptitude score
    db.collection("students").document(roll_no).update({
        "aptitudeScore": result["percentage"],
    })

    return {
        "success": True,
        "score": result["percentage"],
        "correct": result["correct"],
        "total": result["total"],
    }


@router.post("/{drive_id}/aptitude/start")
async def start_aptitude_exam(drive_id: str, authorization: str = Header(None)):
    """Start the aptitude exam timer (server-anchored)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    roll_no = decoded.get("rollNo", "")
    db = get_firestore_db()
    now = datetime.utcnow().isoformat()

    attempt_ref = db.collection("drives").document(drive_id).collection("attempts").document(roll_no)
    existing = attempt_ref.get()

    if existing.exists:
        data = existing.to_dict()
        if data.get("status") == "completed":
            raise HTTPException(status_code=400, detail="Exam already completed")
        if data.get("status") == "disqualified_malpractice":
            raise HTTPException(status_code=403, detail="Disqualified")
        # Return existing start time
        return {"startTime": data.get("startTime", now), "duration": 30}

    attempt_data = sanitize_for_firestore({
        "driveId": drive_id,
        "rollNo": roll_no,
        "examType": "aptitude",
        "status": "in_progress",
        "startTime": now,
        "strikes": 0,
        "violations": [],
    })
    attempt_ref.set(attempt_data)

    return {"startTime": now, "duration": 30}


@router.post("/{drive_id}/proctor/violation")
async def log_proctor_violation(drive_id: str, violation: dict, authorization: str = Header(None)):
    """Log a proctoring violation (tab switch, fullscreen exit, etc.)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    roll_no = decoded.get("rollNo", "")
    db = get_firestore_db()
    now = datetime.utcnow().isoformat()

    attempt_ref = db.collection("drives").document(drive_id).collection("attempts").document(roll_no)
    existing = attempt_ref.get()

    if existing.exists:
        data = existing.to_dict()
        strikes = data.get("strikes", 0) + 1
        violations = data.get("violations", [])
        violations.append({**violation, "timestamp": now})

        update = {"strikes": strikes, "violations": violations}

        if strikes >= 3:
            update["status"] = "disqualified_malpractice"

        attempt_ref.update(update)

        # Also log to proctor_logs subcollection
        db.collection("drives").document(drive_id).collection("proctor_logs").document(roll_no).set(
            sanitize_for_firestore({
                "driveId": drive_id,
                "rollNo": roll_no,
                "strikes": strikes,
                "violations": violations,
                "status": "disqualified" if strikes >= 3 else "warned",
                "updatedAt": now,
            }),
            merge=True,
        )

        return {"strikes": strikes, "disqualified": strikes >= 3}

    return {"strikes": 0, "disqualified": False}


@router.get("/{drive_id}/attempt/{roll_no}")
async def get_attempt(drive_id: str, roll_no: str, authorization: str = Header(None)):
    """Get exam attempt details."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split("Bearer ")[1]
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_firestore_db()
    doc = db.collection("drives").document(drive_id).collection("attempts").document(roll_no).get()
    if not doc.exists:
        return {"exists": False}
    return {**doc.to_dict(), "exists": True}
