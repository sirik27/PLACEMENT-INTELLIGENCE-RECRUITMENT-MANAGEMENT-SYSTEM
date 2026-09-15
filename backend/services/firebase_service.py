import os
import firebase_admin
from firebase_admin import credentials, auth, firestore

_app = None
_db = None


def get_firebase_app():
    """Initialize Firebase Admin SDK (singleton)."""
    global _app
    if _app is not None:
        return _app

    # Try service account JSON file first, then env vars
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    if service_account_path and os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
    else:
        # Build credentials from environment variables
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")

        if not all([project_id, client_email, private_key]):
            raise ValueError(
                "Firebase Admin credentials not configured. "
                "Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID, "
                "FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env"
            )

        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": project_id,
            "client_email": client_email,
            "private_key": private_key,
            "private_key_id": "key-id",
            "client_id": "client-id",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        })

    _app = firebase_admin.initialize_app(cred)
    return _app


def get_firestore_db():
    """Get Firestore client (singleton)."""
    global _db
    if _db is not None:
        return _db
    get_firebase_app()
    _db = firestore.client()
    return _db


def get_auth():
    """Get Firebase Auth instance."""
    get_firebase_app()
    return auth


def create_user_with_claims(email, password, display_name, custom_claims):
    """
    Create a Firebase Auth user and set custom claims.
    Used by TPO to provision students and recruiters.
    """
    get_firebase_app()
    try:
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=display_name,
            email_verified=True,
        )
        # Set custom claims (role, rollNo, etc.)
        auth.set_custom_user_claims(user_record.uid, custom_claims)
        return user_record
    except auth.EmailAlreadyExistsError:
        # User already exists, update claims
        user_record = auth.get_user_by_email(email)
        auth.set_custom_user_claims(user_record.uid, custom_claims)
        return user_record


def verify_id_token(id_token):
    """Verify a Firebase ID token from the client."""
    get_firebase_app()
    try:
        decoded = auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        return None


def sanitize_for_firestore(obj):
    """
    Remove None and undefined values to prevent
    'WriteBatch.set() does not accept undefined' crashes.
    """
    if isinstance(obj, dict):
        return {k: sanitize_for_firestore(v) for k, v in obj.items() if v is not None}
    elif isinstance(obj, list):
        return [sanitize_for_firestore(item) for item in obj]
    return obj
