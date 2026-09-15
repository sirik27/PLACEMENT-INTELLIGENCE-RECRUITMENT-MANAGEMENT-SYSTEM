import os
import httpx

PISTON_API_URL = os.getenv("PISTON_API_URL", "https://emkc.org/api/v2/piston")

# Language version mappings for the Piston public API
LANGUAGE_VERSIONS = {
    "python": "3.10.0",
    "javascript": "18.15.0",
    "java": "15.0.2",
    "c": "10.2.0",
    "cpp": "10.2.0",
    "c++": "10.2.0",
    "go": "1.16.2",
    "rust": "1.68.2",
    "ruby": "3.0.1",
    "php": "8.2.3",
    "typescript": "5.0.3",
    "kotlin": "1.8.20",
    "swift": "5.3.3",
    "csharp": "6.12.0",
    "c#": "6.12.0",
}

# Map display names to Piston language identifiers
LANGUAGE_MAP = {
    "python": "python",
    "javascript": "javascript",
    "java": "java",
    "c": "c",
    "cpp": "c++",
    "c++": "c++",
    "go": "go",
    "rust": "rust",
    "ruby": "ruby",
    "php": "php",
    "typescript": "typescript",
    "kotlin": "kotlin",
    "swift": "swift",
    "csharp": "csharp",
    "c#": "csharp",
}


def normalize_output(text):
    """Cross-platform line normalization."""
    if text is None:
        return ""
    return text.replace("\r\n", "\n").strip()


async def execute_code(language, code, stdin=""):
    """
    Execute code via the Piston public API.
    Returns { stdout, stderr, exitCode, signal }.
    """
    lang_key = language.lower().strip()
    piston_lang = LANGUAGE_MAP.get(lang_key, lang_key)
    version = LANGUAGE_VERSIONS.get(lang_key, "*")

    # Normalize input
    code = normalize_output(code)
    stdin = normalize_output(stdin)

    payload = {
        "language": piston_lang,
        "version": version,
        "files": [
            {
                "name": f"main.{_get_extension(piston_lang)}",
                "content": code,
            }
        ],
        "stdin": stdin,
        "run_timeout": 10000,  # 10 second timeout
        "compile_timeout": 10000,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(f"{PISTON_API_URL}/execute", json=payload)
        response.raise_for_status()
        result = response.json()

    run = result.get("run", {})
    return {
        "stdout": normalize_output(run.get("stdout", "")),
        "stderr": normalize_output(run.get("stderr", "")),
        "exitCode": run.get("code", 0),
        "signal": run.get("signal"),
    }


async def get_available_runtimes():
    """Fetch all available runtimes from Piston."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{PISTON_API_URL}/runtimes")
        response.raise_for_status()
        return response.json()


def _get_extension(language):
    """Get file extension for a language."""
    extensions = {
        "python": "py",
        "javascript": "js",
        "java": "java",
        "c": "c",
        "c++": "cpp",
        "go": "go",
        "rust": "rs",
        "ruby": "rb",
        "php": "php",
        "typescript": "ts",
        "kotlin": "kt",
        "swift": "swift",
        "csharp": "cs",
    }
    return extensions.get(language, "txt")
