from fastapi import APIRouter, HTTPException
from models.schemas import CodeExecutionRequest, CodeExecutionResponse
from services.piston_service import execute_code, get_available_runtimes

router = APIRouter()


@router.post("/", response_model=CodeExecutionResponse)
async def run_code(request: CodeExecutionRequest):
    """
    Execute code via the Piston public API.
    Supports Python, JavaScript, Java, C, C++, Go, and more.
    Input/output is cross-platform normalized (\\r\\n → \\n).
    """
    try:
        result = await execute_code(
            language=request.language,
            code=request.code,
            stdin=request.stdin,
        )
        return CodeExecutionResponse(
            stdout=result["stdout"],
            stderr=result["stderr"],
            exitCode=result["exitCode"],
            signal=result.get("signal"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Code execution failed: {str(e)}")


@router.post("/run-tests")
async def run_code_with_tests(request: dict):
    """
    Execute code against multiple test cases.
    Expects: { language, version, code, testCases: [{ input, expectedOutput }] }
    """
    language = request.get("language", "python")
    code = request.get("code", "")
    test_cases = request.get("testCases", [])

    if not test_cases:
        raise HTTPException(status_code=400, detail="No test cases provided")

    results = []
    passed = 0
    total = len(test_cases)

    for i, tc in enumerate(test_cases):
        try:
            result = await execute_code(
                language=language,
                code=code,
                stdin=tc.get("input", ""),
            )

            actual_output = result["stdout"].strip()
            expected_output = tc.get("expectedOutput", "").replace("\r\n", "\n").strip()
            is_passed = actual_output == expected_output

            if is_passed:
                passed += 1

            results.append({
                "testCase": i + 1,
                "input": tc.get("input", ""),
                "expectedOutput": expected_output,
                "actualOutput": actual_output,
                "passed": is_passed,
                "stderr": result["stderr"],
                "exitCode": result["exitCode"],
            })
        except Exception as e:
            results.append({
                "testCase": i + 1,
                "input": tc.get("input", ""),
                "expectedOutput": tc.get("expectedOutput", ""),
                "actualOutput": "",
                "passed": False,
                "error": str(e),
            })

    return {
        "passed": passed,
        "total": total,
        "percentage": round((passed / total) * 100, 2) if total > 0 else 0,
        "results": results,
    }


@router.get("/runtimes")
async def list_runtimes():
    """List all available language runtimes from Piston."""
    try:
        runtimes = await get_available_runtimes()
        return {"runtimes": runtimes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch runtimes: {str(e)}")
