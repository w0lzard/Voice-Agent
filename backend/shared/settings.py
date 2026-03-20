"""
Configuration and environment variables loader.
"""
import os
from collections.abc import Iterable
from pathlib import Path
from dotenv import load_dotenv


def _normalize_domain(value: str | None) -> str | None:
    if not value:
        return None
    domain = value.strip()
    if domain.startswith("sip:"):
        domain = domain[4:]
    if "@" in domain:
        domain = domain.split("@", 1)[1]
    return domain.strip() or None


def _normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    phone = value.strip().replace(" ", "").replace("-", "")
    if not phone:
        return None
    return phone if phone.startswith("+") else f"+{phone}"


def _load_environment() -> None:
    """Load environment variables from common project locations."""
    backend_dir = Path(__file__).resolve().parents[1]
    repo_dir = backend_dir.parent
    candidates = (
        repo_dir / ".env",
        repo_dir / ".env.local",
        backend_dir / ".env.local",
        backend_dir / ".env",
    )
    for env_path in candidates:
        if env_path.exists():
            load_dotenv(env_path, override=False)


_load_environment()


class Config:
    """Application configuration from environment variables."""

    # LiveKit
    LIVEKIT_URL = os.getenv("LIVEKIT_URL")
    LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
    LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

    # Google/Gemini
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    
    # Additional Voice AI Providers (optional)
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
    ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
    ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
    
    # MongoDB
    MONGODB_URI = os.getenv("MONGODB_URI")
    MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "vobiz_calls")
    
    # AWS S3
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
    AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
    
    # Vobiz SIP (default, can be overridden by SIP configs)
    OUTBOUND_TRUNK_ID = os.getenv("OUTBOUND_TRUNK_ID", "").strip() or None
    VOBIZ_SIP_DOMAIN = _normalize_domain(os.getenv("VOBIZ_SIP_DOMAIN"))
    VOBIZ_AUTH_ID = (os.getenv("VOBIZ_AUTH_ID") or os.getenv("VOBIZ_USERNAME") or "").strip() or None
    VOBIZ_AUTH_TOKEN = (os.getenv("VOBIZ_AUTH_TOKEN") or os.getenv("VOBIZ_PASSWORD") or "").strip() or None
    VOBIZ_CALLER_ID = _normalize_phone(os.getenv("VOBIZ_CALLER_ID") or os.getenv("VOBIZ_OUTBOUND_NUMBER"))
    VOBIZ_TRUNK_NAME = (os.getenv("VOBIZ_TRUNK_NAME") or "vobiz-outbound-auto").strip() or "vobiz-outbound-auto"
    
    # Email — Resend API (https://resend.com, free tier 3000 emails/month)
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    EMAIL_FROM = os.getenv("EMAIL_FROM", "")  # e.g. "AI Agent <noreply@yourdomain.com>"

    # Email — Gmail SMTP fallback (used when RESEND_API_KEY is not set)
    # Use a Gmail App Password, NOT your regular Gmail password.
    # Enable at: https://myaccount.google.com/apppasswords
    GMAIL_USER = os.getenv("GMAIL_USER", "")        # e.g. you@gmail.com
    GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

    # Debug — set DEBUG=true to include OTP in API response when email fails
    DEBUG = os.getenv("DEBUG", "false").strip().lower() == "true"

    # Server — Railway injects $PORT at runtime; 8000 for local dev.
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.environ.get("PORT", 8000))
    
    # Internal Service Auth
    INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "vobiz_internal_secret_key_123")
    # Secret shared between Next.js phone-OTP verify route and the backend phone-login endpoint.
    # Set to a long random string in production. Leave empty to disable the endpoint.
    INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "")
    
    @classmethod
    def validate(cls, required_names: Iterable[str] | None = None):
        """Validate required configuration.

        When ``required_names`` is omitted, validate the baseline settings that
        all backend services rely on. Service-specific callers can pass a
        smaller or larger set of environment variable names as needed.
        """
        values = {
            "LIVEKIT_URL": cls.LIVEKIT_URL,
            "LIVEKIT_API_KEY": cls.LIVEKIT_API_KEY,
            "LIVEKIT_API_SECRET": cls.LIVEKIT_API_SECRET,
            "MONGODB_URI": cls.MONGODB_URI,
            "GOOGLE_API_KEY": cls.GOOGLE_API_KEY,
        }
        names = tuple(required_names or (
            "LIVEKIT_URL",
            "LIVEKIT_API_KEY",
            "LIVEKIT_API_SECRET",
            "MONGODB_URI",
        ))
        missing = [name for name in names if not values.get(name)]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        return True


# Create singleton instance
config = Config()
