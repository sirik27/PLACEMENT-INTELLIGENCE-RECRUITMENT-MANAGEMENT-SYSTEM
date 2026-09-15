"""
Skill-Gap & Compatibility Matcher

- Normalize strings to lowercase tokens
- Matched = S_student ∩ S_required
- Missing = S_required \ S_student
- Extra   = S_student \ S_required
- Compatibility% = (|Matched| / |S_required|) × 100
"""


def normalize_skills(skills_input):
    """
    Normalize a skills input to a set of lowercase, stripped tokens.
    Accepts a list of strings or a single comma-separated string.
    """
    if isinstance(skills_input, str):
        skills_input = skills_input.split(",")
    return {s.strip().lower() for s in skills_input if s.strip()}


def analyze_skill_gap(student_skills, required_skills):
    """
    Analyze the skill gap between a student's skills and the required skills.

    Returns:
        matched: skills the student has that are required
        missing: required skills the student is missing
        extra: student skills not in the requirements (bonus skills)
        compatibility: percentage match (0-100)
    """
    student_set = normalize_skills(student_skills)
    required_set = normalize_skills(required_skills)

    if not required_set:
        return {
            "matched": list(student_set),
            "missing": [],
            "extra": [],
            "compatibility": 100.0,
            "totalRequired": 0,
            "totalMatched": len(student_set),
            "totalMissing": 0,
        }

    matched = student_set & required_set
    missing = required_set - student_set
    extra = student_set - required_set
    compatibility = (len(matched) / len(required_set)) * 100

    return {
        "matched": sorted(list(matched)),
        "missing": sorted(list(missing)),
        "extra": sorted(list(extra)),
        "compatibility": round(compatibility, 2),
        "totalRequired": len(required_set),
        "totalMatched": len(matched),
        "totalMissing": len(missing),
    }


def rank_students_by_compatibility(students, required_skills):
    """
    Rank a list of students by their skill compatibility with required skills.
    Each student should be a dict with at least a 'skills' field.
    Returns students sorted by compatibility (descending).
    """
    results = []
    for student in students:
        student_skills = student.get("skills", [])
        gap_analysis = analyze_skill_gap(student_skills, required_skills)
        results.append({
            **student,
            "skillAnalysis": gap_analysis,
            "compatibility": gap_analysis["compatibility"],
        })

    results.sort(key=lambda x: x["compatibility"], reverse=True)
    return results


def get_learning_recommendations(missing_skills):
    """
    Generate learning path recommendations based on missing skills.
    Maps skill names to recommended learning resources/topics.
    """
    skill_resources = {
        "python": {"topic": "Python Programming", "priority": "high", "estimatedWeeks": 4, "resources": ["Python.org Tutorial", "Automate the Boring Stuff", "LeetCode Python Track"]},
        "java": {"topic": "Java Development", "priority": "high", "estimatedWeeks": 6, "resources": ["Oracle Java Tutorials", "Head First Java", "HackerRank Java"]},
        "react": {"topic": "React.js Frontend", "priority": "high", "estimatedWeeks": 4, "resources": ["React Official Docs", "Scrimba React Course", "Build Projects"]},
        "node.js": {"topic": "Node.js Backend", "priority": "medium", "estimatedWeeks": 4, "resources": ["Node.js Docs", "Express.js Guide", "REST API Projects"]},
        "sql": {"topic": "SQL & Databases", "priority": "high", "estimatedWeeks": 3, "resources": ["SQLZoo", "LeetCode SQL", "PostgreSQL Tutorial"]},
        "mongodb": {"topic": "MongoDB NoSQL", "priority": "medium", "estimatedWeeks": 2, "resources": ["MongoDB University", "Mongoose Docs"]},
        "aws": {"topic": "Cloud Computing (AWS)", "priority": "medium", "estimatedWeeks": 6, "resources": ["AWS Free Tier Labs", "Cloud Practitioner Cert", "A Cloud Guru"]},
        "docker": {"topic": "Containerization", "priority": "medium", "estimatedWeeks": 2, "resources": ["Docker Getting Started", "Docker Compose Tutorial"]},
        "kubernetes": {"topic": "Container Orchestration", "priority": "low", "estimatedWeeks": 4, "resources": ["Kubernetes.io Tutorials", "Minikube Labs"]},
        "machine learning": {"topic": "Machine Learning", "priority": "high", "estimatedWeeks": 8, "resources": ["Andrew Ng ML Course", "Scikit-learn Docs", "Kaggle Competitions"]},
        "deep learning": {"topic": "Deep Learning", "priority": "medium", "estimatedWeeks": 8, "resources": ["Fast.ai", "PyTorch Tutorials", "TensorFlow Developer Cert"]},
        "data structures": {"topic": "DSA", "priority": "critical", "estimatedWeeks": 8, "resources": ["NeetCode 150", "Striver's SDE Sheet", "LeetCode Patterns"]},
        "algorithms": {"topic": "Algorithms", "priority": "critical", "estimatedWeeks": 8, "resources": ["CLRS Book", "Abdul Bari YouTube", "Codeforces"]},
        "git": {"topic": "Version Control", "priority": "high", "estimatedWeeks": 1, "resources": ["Git Handbook", "GitHub Learning Lab"]},
        "ci/cd": {"topic": "CI/CD Pipelines", "priority": "medium", "estimatedWeeks": 2, "resources": ["GitHub Actions Docs", "Jenkins Tutorial"]},
    }

    recommendations = []
    for skill in missing_skills:
        skill_lower = skill.lower().strip()
        if skill_lower in skill_resources:
            recommendations.append({
                "skill": skill,
                **skill_resources[skill_lower],
            })
        else:
            recommendations.append({
                "skill": skill,
                "topic": f"Learn {skill}",
                "priority": "medium",
                "estimatedWeeks": 3,
                "resources": [f"Search '{skill} tutorial' on YouTube", f"Practice {skill} on relevant platforms"],
            })

    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    recommendations.sort(key=lambda x: priority_order.get(x["priority"], 2))

    return recommendations
