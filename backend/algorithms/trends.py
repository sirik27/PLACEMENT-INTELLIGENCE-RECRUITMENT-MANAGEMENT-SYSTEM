"""
Trend & Anomaly Detection

Rule-based detection:
  - If (Failed HR / Total Interviews) > 0.40 → Alert: "High Rejection in HR Round"
  - If (Failed Coding / Total Submissions) > 0.50 → Alert: "Low Coding Performance"

Additional patterns:
  - Branch-wise placement rate anomalies
  - CGPA distribution shifts
  - Year-over-year trend analysis
"""


def detect_hr_rejection_anomaly(failed_hr, total_interviews, threshold=0.40):
    """
    Detect high HR round rejection rate.
    Alert if failure rate exceeds threshold.
    """
    if total_interviews <= 0:
        return None

    failure_rate = failed_hr / total_interviews

    if failure_rate > threshold:
        return {
            "alertType": "hr_rejection",
            "severity": "critical" if failure_rate > 0.60 else "warning",
            "message": "High Rejection in HR Round: Soft Skills Workshop Recommended",
            "metric": round(failure_rate * 100, 2),
            "threshold": threshold * 100,
            "details": {
                "failedHR": failed_hr,
                "totalInterviews": total_interviews,
                "failureRate": round(failure_rate * 100, 2),
            },
            "recommendation": "Organize mock interview sessions and communication workshops focusing on HR round preparation.",
        }
    return None


def detect_coding_performance_anomaly(failed_coding, total_submissions, threshold=0.50):
    """
    Detect low coding performance.
    Alert if failure rate exceeds threshold.
    """
    if total_submissions <= 0:
        return None

    failure_rate = failed_coding / total_submissions

    if failure_rate > threshold:
        return {
            "alertType": "coding_performance",
            "severity": "critical" if failure_rate > 0.70 else "warning",
            "message": "Low Coding Performance: Advanced DSA Focus Required",
            "metric": round(failure_rate * 100, 2),
            "threshold": threshold * 100,
            "details": {
                "failedCoding": failed_coding,
                "totalSubmissions": total_submissions,
                "failureRate": round(failure_rate * 100, 2),
            },
            "recommendation": "Implement mandatory DSA bootcamp and daily coding practice sessions on competitive programming platforms.",
        }
    return None


def detect_aptitude_anomaly(failed_aptitude, total_attempts, threshold=0.45):
    """
    Detect low aptitude performance.
    """
    if total_attempts <= 0:
        return None

    failure_rate = failed_aptitude / total_attempts

    if failure_rate > threshold:
        return {
            "alertType": "aptitude_performance",
            "severity": "warning",
            "message": "High Aptitude Test Failure: Quantitative Reasoning Workshop Needed",
            "metric": round(failure_rate * 100, 2),
            "threshold": threshold * 100,
            "details": {
                "failedAptitude": failed_aptitude,
                "totalAttempts": total_attempts,
                "failureRate": round(failure_rate * 100, 2),
            },
            "recommendation": "Schedule aptitude training sessions focusing on quantitative aptitude, logical reasoning, and verbal ability.",
        }
    return None


def detect_placement_rate_anomaly(placed, total_eligible, threshold=0.30):
    """
    Detect if overall placement rate is dangerously low.
    """
    if total_eligible <= 0:
        return None

    placement_rate = placed / total_eligible

    if placement_rate < threshold:
        return {
            "alertType": "low_placement_rate",
            "severity": "critical",
            "message": f"Overall Placement Rate ({round(placement_rate * 100, 1)}%) Below Target ({threshold * 100}%)",
            "metric": round(placement_rate * 100, 2),
            "threshold": threshold * 100,
            "details": {
                "placed": placed,
                "totalEligible": total_eligible,
                "placementRate": round(placement_rate * 100, 2),
            },
            "recommendation": "Review curriculum alignment with industry needs, increase company outreach, and implement intensive placement preparation programs.",
        }
    return None


def detect_branch_anomaly(branch_data):
    """
    Detect branches with significantly lower placement rates.

    Args:
        branch_data: list of { branch, placed, total }
    """
    if not branch_data:
        return []

    # Calculate overall average
    total_placed = sum(b.get("placed", 0) for b in branch_data)
    total_students = sum(b.get("total", 0) for b in branch_data)
    overall_rate = (total_placed / total_students) if total_students > 0 else 0

    alerts = []
    for branch in branch_data:
        placed = branch.get("placed", 0)
        total = branch.get("total", 0)
        if total <= 0:
            continue

        branch_rate = placed / total
        # Alert if branch rate is more than 20% below overall average
        if branch_rate < overall_rate * 0.80 and overall_rate > 0:
            alerts.append({
                "alertType": "branch_anomaly",
                "severity": "warning",
                "message": f"{branch['branch']} placement rate ({round(branch_rate * 100, 1)}%) significantly below average ({round(overall_rate * 100, 1)}%)",
                "metric": round(branch_rate * 100, 2),
                "threshold": round(overall_rate * 80, 2),
                "details": {
                    "branch": branch["branch"],
                    "placed": placed,
                    "total": total,
                    "branchRate": round(branch_rate * 100, 2),
                    "overallRate": round(overall_rate * 100, 2),
                },
                "recommendation": f"Focused placement preparation for {branch['branch']} department with industry-specific skill training.",
            })

    return alerts


def run_all_anomaly_checks(drive_stats):
    """
    Run all anomaly detection checks on drive statistics.

    Args:
        drive_stats: dict with fields for each check

    Returns:
        List of all detected alerts
    """
    alerts = []

    # HR rejection check
    hr_alert = detect_hr_rejection_anomaly(
        drive_stats.get("failedHR", 0),
        drive_stats.get("totalInterviews", 0),
    )
    if hr_alert:
        alerts.append(hr_alert)

    # Coding performance check
    coding_alert = detect_coding_performance_anomaly(
        drive_stats.get("failedCoding", 0),
        drive_stats.get("totalSubmissions", 0),
    )
    if coding_alert:
        alerts.append(coding_alert)

    # Aptitude check
    aptitude_alert = detect_aptitude_anomaly(
        drive_stats.get("failedAptitude", 0),
        drive_stats.get("totalAptitudeAttempts", 0),
    )
    if aptitude_alert:
        alerts.append(aptitude_alert)

    # Overall placement rate check
    placement_alert = detect_placement_rate_anomaly(
        drive_stats.get("placed", 0),
        drive_stats.get("totalEligible", 0),
    )
    if placement_alert:
        alerts.append(placement_alert)

    # Branch-wise check
    if "branchData" in drive_stats:
        branch_alerts = detect_branch_anomaly(drive_stats["branchData"])
        alerts.extend(branch_alerts)

    return alerts
