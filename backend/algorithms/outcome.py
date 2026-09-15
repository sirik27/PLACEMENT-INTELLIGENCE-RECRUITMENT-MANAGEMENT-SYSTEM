"""
Placement Outcome Probability

Probability = (Readiness Score + Rubric Average) / 2

Where:
  Rubric Average = ((Tech + ProblemSolving + Comm + HR) / 40) × 100
  Each rubric dimension is scored 1-10 by the recruiter.
"""


def calculate_rubric_average(technical, problem_solving, communication, hr):
    """
    Calculate the interview rubric average as a percentage.
    Each dimension is scored 1-10, max total = 40.
    """
    total = technical + problem_solving + communication + hr
    return (total / 40) * 100


def calculate_outcome_probability(
    readiness_score,
    technical=None,
    problem_solving=None,
    communication=None,
    hr=None,
):
    """
    Calculate placement outcome probability.

    If interview rubric scores are not yet available,
    returns probability based on readiness alone.

    Returns:
        {
            probability: float (0-100),
            readinessScore: float,
            rubricAverage: float or None,
            interpretation: str,
            confidence: str,
        }
    """
    has_rubric = all(
        score is not None
        for score in [technical, problem_solving, communication, hr]
    )

    if has_rubric:
        rubric_avg = calculate_rubric_average(
            technical, problem_solving, communication, hr
        )
        probability = (readiness_score + rubric_avg) / 2
    else:
        rubric_avg = None
        probability = readiness_score  # Pre-interview estimate

    # Clamp to 0-100
    probability = max(0, min(100, probability))

    # Interpretation
    if probability >= 80:
        interpretation = "Excellent — Very High Chance of Selection"
        confidence = "high"
    elif probability >= 65:
        interpretation = "Good — Strong Candidate"
        confidence = "medium-high"
    elif probability >= 50:
        interpretation = "Moderate — Competitive but Needs Improvement"
        confidence = "medium"
    elif probability >= 35:
        interpretation = "Below Average — Significant Gaps to Address"
        confidence = "low"
    else:
        interpretation = "At Risk — Major Preparation Needed"
        confidence = "very-low"

    return {
        "probability": round(probability, 2),
        "readinessScore": round(readiness_score, 2),
        "rubricAverage": round(rubric_avg, 2) if rubric_avg is not None else None,
        "interpretation": interpretation,
        "confidence": confidence,
        "hasInterviewData": has_rubric,
    }


def batch_calculate_outcomes(students_data):
    """
    Calculate outcome probabilities for a batch of students.

    Args:
        students_data: list of dicts with 'readinessScore' and optional rubric scores

    Returns:
        List of outcome calculations sorted by probability (descending)
    """
    results = []
    for student in students_data:
        outcome = calculate_outcome_probability(
            readiness_score=student.get("readinessScore", 0),
            technical=student.get("technical"),
            problem_solving=student.get("problemSolving"),
            communication=student.get("communication"),
            hr=student.get("hr"),
        )
        results.append({
            "rollNo": student.get("rollNo", ""),
            "name": student.get("name", ""),
            **outcome,
        })

    results.sort(key=lambda x: x["probability"], reverse=True)
    return results
