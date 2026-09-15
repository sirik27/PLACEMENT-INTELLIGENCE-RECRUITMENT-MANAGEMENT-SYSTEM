"""
Drive Funnel Simulator

Simulates expected outcomes for a placement drive:
  Eligible        = Count meeting CGPA and Backlog cutoffs
  Expected Test Takers   = Eligible × 0.85
  Expected Interviewees  = Test Takers × 0.35
  Expected Offers        = Interviewees × 0.25

Supports custom conversion rates for what-if analysis.
"""


def calculate_eligible(students, min_cgpa=0.0, max_backlogs=99, required_branches=None):
    """
    Count students meeting eligibility criteria.

    Args:
        students: list of student dicts with 'cgpa', 'backlogs', 'branch'
        min_cgpa: minimum CGPA cutoff
        max_backlogs: maximum allowed backlogs
        required_branches: list of eligible branches (None = all)

    Returns:
        { eligible_count, eligible_students, filtered_out }
    """
    eligible = []
    filtered_out = []

    for student in students:
        cgpa = student.get("cgpa", 0)
        backlogs = student.get("backlogs", 0)
        branch = student.get("branch", "")

        meets_cgpa = cgpa >= min_cgpa
        meets_backlogs = backlogs <= max_backlogs
        meets_branch = (required_branches is None or
                        not required_branches or
                        branch in required_branches)

        if meets_cgpa and meets_backlogs and meets_branch:
            eligible.append(student)
        else:
            reasons = []
            if not meets_cgpa:
                reasons.append(f"CGPA {cgpa} < {min_cgpa}")
            if not meets_backlogs:
                reasons.append(f"Backlogs {backlogs} > {max_backlogs}")
            if not meets_branch:
                reasons.append(f"Branch {branch} not eligible")
            filtered_out.append({**student, "filterReasons": reasons})

    return {
        "eligibleCount": len(eligible),
        "eligibleStudents": eligible,
        "filteredOutCount": len(filtered_out),
        "filteredOut": filtered_out,
    }


def simulate_funnel(
    eligible_count,
    test_taker_rate=0.85,
    interview_rate=0.35,
    offer_rate=0.25,
):
    """
    Simulate the placement drive funnel.

    Args:
        eligible_count: number of eligible students
        test_taker_rate: % of eligible who take the test (default 85%)
        interview_rate: % of test takers who clear to interview (default 35%)
        offer_rate: % of interviewees who get offers (default 25%)

    Returns:
        Funnel breakdown with counts and rates
    """
    test_takers = eligible_count * test_taker_rate
    interviewees = test_takers * interview_rate
    offers = interviewees * offer_rate

    return {
        "eligible": eligible_count,
        "expectedTestTakers": round(test_takers, 1),
        "expectedInterviewees": round(interviewees, 1),
        "expectedOffers": round(offers, 1),
        "rates": {
            "testTakerRate": test_taker_rate,
            "interviewRate": interview_rate,
            "offerRate": offer_rate,
        },
        "conversionFunnel": [
            {"stage": "Eligible Students", "count": eligible_count, "percentage": 100},
            {"stage": "Expected Test Takers", "count": round(test_takers, 1), "percentage": round(test_taker_rate * 100, 1)},
            {"stage": "Expected Interviewees", "count": round(interviewees, 1), "percentage": round((interviewees / eligible_count) * 100, 1) if eligible_count > 0 else 0},
            {"stage": "Expected Offers", "count": round(offers, 1), "percentage": round((offers / eligible_count) * 100, 1) if eligible_count > 0 else 0},
        ],
    }


def compare_scenarios(eligible_count, scenarios):
    """
    Compare multiple funnel scenarios for what-if analysis.

    Args:
        eligible_count: number of eligible students
        scenarios: list of dicts with custom rates
            [{ name, testTakerRate, interviewRate, offerRate }]

    Returns:
        Comparison of all scenarios
    """
    results = []
    for scenario in scenarios:
        sim = simulate_funnel(
            eligible_count,
            scenario.get("testTakerRate", 0.85),
            scenario.get("interviewRate", 0.35),
            scenario.get("offerRate", 0.25),
        )
        results.append({
            "name": scenario.get("name", "Scenario"),
            **sim,
        })

    return results
