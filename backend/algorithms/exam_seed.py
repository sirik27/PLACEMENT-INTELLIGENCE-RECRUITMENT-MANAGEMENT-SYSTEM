"""
Deterministic Exam PRNG

- Seed: SHA-256(RollNo || DriveId)
- Sample 20 questions deterministically from the 50-question bank
- Shuffle options using the same seed
- Reloads generate the EXACT same paper for the same student + drive
"""
import hashlib
import struct


def generate_seed(roll_no, drive_id):
    """
    Generate a deterministic seed from roll number and drive ID.
    Seed = SHA-256(RollNo || DriveId)
    """
    seed_input = f"{roll_no}{drive_id}"
    hash_bytes = hashlib.sha256(seed_input.encode("utf-8")).digest()
    # Use first 8 bytes as a 64-bit integer seed
    seed = struct.unpack(">Q", hash_bytes[:8])[0]
    return seed, hash_bytes


class SeededRandom:
    """
    Simple seeded PRNG (Linear Congruential Generator).
    Deterministic: same seed → same sequence every time.
    """

    def __init__(self, seed):
        self.state = seed & 0xFFFFFFFFFFFFFFFF

    def next(self):
        """Generate next pseudo-random number."""
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        return self.state

    def next_int(self, max_val):
        """Generate a random integer in [0, max_val)."""
        return self.next() % max_val

    def next_float(self):
        """Generate a random float in [0, 1)."""
        return (self.next() >> 11) / (1 << 53)


def fisher_yates_shuffle(items, rng):
    """
    Deterministic Fisher-Yates shuffle using seeded PRNG.
    Returns a NEW shuffled list (does not modify input).
    """
    arr = list(items)
    n = len(arr)
    for i in range(n - 1, 0, -1):
        j = rng.next_int(i + 1)
        arr[i], arr[j] = arr[j], arr[i]
    return arr


def select_questions(question_bank, roll_no, drive_id, count=20):
    """
    Deterministically select `count` questions from the bank.
    Same student + same drive → same questions in same order.

    Args:
        question_bank: list of question dicts (must have 'id' field)
        roll_no: student roll number (e.g., "23P61A6701")
        drive_id: placement drive ID
        count: number of questions to select (default 20)

    Returns:
        Selected questions with shuffled options.
    """
    if len(question_bank) < count:
        count = len(question_bank)

    seed, _ = generate_seed(roll_no, drive_id)
    rng = SeededRandom(seed)

    # Shuffle the entire bank, then take first `count`
    shuffled_bank = fisher_yates_shuffle(question_bank, rng)
    selected = shuffled_bank[:count]

    # Shuffle options for each MCQ question (preserving correct answer tracking)
    result = []
    for q in selected:
        q_copy = dict(q)
        if "options" in q_copy and "correctIndex" in q_copy:
            options = list(q_copy["options"])
            correct_option = options[q_copy["correctIndex"]]

            # Create a new RNG branch for this question's options
            q_rng = SeededRandom(seed ^ hash(q_copy.get("id", "")))
            shuffled_options = fisher_yates_shuffle(options, q_rng)

            q_copy["options"] = shuffled_options
            q_copy["correctIndex"] = shuffled_options.index(correct_option)

        result.append(q_copy)

    return result


def verify_answer(question, selected_index):
    """
    Check if the selected answer index is correct.
    Returns True/False.
    """
    return selected_index == question.get("correctIndex", -1)


def grade_aptitude_exam(questions, answers):
    """
    Grade an aptitude exam.

    Args:
        questions: list of question dicts with 'id' and 'correctIndex'
        answers: dict mapping question_id → selected_index

    Returns:
        { correct, total, percentage, details }
    """
    correct = 0
    total = len(questions)
    details = []

    for q in questions:
        q_id = q.get("id", "")
        selected = answers.get(q_id)
        is_correct = selected == q.get("correctIndex") if selected is not None else False

        if is_correct:
            correct += 1

        details.append({
            "questionId": q_id,
            "selectedIndex": selected,
            "correctIndex": q.get("correctIndex"),
            "isCorrect": is_correct,
        })

    return {
        "correct": correct,
        "total": total,
        "percentage": round((correct / total) * 100, 2) if total > 0 else 0,
        "details": details,
    }
