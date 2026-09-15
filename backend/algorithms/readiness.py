"""
Placement Readiness Score Calculator

Readiness = (0.30 × CGPA%) + (0.25 × Aptitude%) + (0.25 × Coding%) + (0.20 × SkillMatch%)

Where:
  CGPA%      = (CGPA / 10.0) × 100
  Aptitude%  = (MCQs Correct / 20) × 100
  Coding%    = (Test Cases Passed / Total Cases) × 100
  SkillMatch%= (|Matched Skills| / |Required Skills|) × 100
"""


def calculate_cgpa_percentage(cgpa, max_cgpa=10.0):
    """Convert CGPA to percentage scale."""
    if max_cgpa <= 0:
        return 0.0
    return min((cgpa / max_cgpa) * 100, 100.0)


def calculate_aptitude_percentage(correct_answers, total_questions=20):
    """Calculate aptitude score as percentage."""
    if total_questions <= 0:
        return 0.0
    return min((correct_answers / total_questions) * 100, 100.0)


def calculate_coding_percentage(test_cases_passed, total_cases):
    """Calculate coding score as percentage."""
    if total_cases <= 0:
        return 0.0
    return min((test_cases_passed / total_cases) * 100, 100.0)


def calculate_skill_match_percentage(student_skills, required_skills):
    """
    Calculate skill match percentage using set intersection.
    All skills are normalized to lowercase for comparison.
    """
    if not required_skills:
        return 100.0  # No requirements = full match

    student_set = {s.strip().lower() for s in student_skills if s.strip()}
    required_set = {s.strip().lower() for s in required_skills if s.strip()}

    if not required_set:
        return 100.0

    matched = student_set & required_set
    return (len(matched) / len(required_set)) * 100


def calculate_readiness_score(
    cgpa,
    correct_aptitude=0,
    total_aptitude=20,
    test_cases_passed=0,
    total_test_cases=0,
    student_skills=None,
    required_skills=None,
):
    """
    Calculate the composite Placement Readiness Score.
    Returns a dict with breakdown and final score.
    """
    student_skills = student_skills or []
    required_skills = required_skills or []

    cgpa_pct = calculate_cgpa_percentage(cgpa)
    aptitude_pct = calculate_aptitude_percentage(correct_aptitude, total_aptitude)
    coding_pct = calculate_coding_percentage(test_cases_passed, total_test_cases)
    skill_pct = calculate_skill_match_percentage(student_skills, required_skills)

    readiness = (
        (0.30 * cgpa_pct) +
        (0.25 * aptitude_pct) +
        (0.25 * coding_pct) +
        (0.20 * skill_pct)
    )

    return {
        "readinessScore": round(readiness, 2),
        "breakdown": {
            "cgpaPercentage": round(cgpa_pct, 2),
            "aptitudePercentage": round(aptitude_pct, 2),
            "codingPercentage": round(coding_pct, 2),
            "skillMatchPercentage": round(skill_pct, 2),
        },
        "weights": {
            "cgpa": 0.30,
            "aptitude": 0.25,
            "coding": 0.25,
            "skillMatch": 0.20,
        },
        "weightedScores": {
            "cgpa": round(0.30 * cgpa_pct, 2),
            "aptitude": round(0.25 * aptitude_pct, 2),
            "coding": round(0.25 * coding_pct, 2),
            "skillMatch": round(0.20 * skill_pct, 2),
        },
    }
