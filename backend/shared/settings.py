"""
Configuration and environment variables loader.
"""
import os
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


def _get_realtime_provider() -> str:
    return os.getenv("REALTIME_PROVIDER", "openai").strip().lower() or "openai"


def _requires_openai_key() -> bool:
    realtime_audio = os.getenv("OPENAI_REALTIME_AUDIO", "true").strip().lower() == "true"
    return not (realtime_audio and _get_realtime_provider() == "google")


class Config:
    """Application configuration from environment variables."""
    
    # LiveKit
    LIVEKIT_URL = os.getenv("LIVEKIT_URL")
    LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
    LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
    
    # OpenAI
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_REALTIME_VOICE = os.getenv("OPENAI_REALTIME_VOICE", "alloy")
    
    # Google/Gemini (for post-call analysis and Gemini Live)
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
    
    # Server
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("PORT") or os.getenv("API_PORT", "8000"))
    
    # Internal Service Auth
    INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "vobiz_internal_secret_key_123")
    
    @classmethod
    def validate(cls):
        """Validate required configuration."""
        required = [
            ("LIVEKIT_URL", cls.LIVEKIT_URL),
            ("LIVEKIT_API_KEY", cls.LIVEKIT_API_KEY),
            ("LIVEKIT_API_SECRET", cls.LIVEKIT_API_SECRET),
            ("MONGODB_URI", cls.MONGODB_URI),
        ]
        if _requires_openai_key():
            required.append(("OPENAI_API_KEY", cls.OPENAI_API_KEY))
        else:
            required.append(("GOOGLE_API_KEY", cls.GOOGLE_API_KEY))
        missing = [name for name, value in required if not value]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        return True


# Create singleton instance
config = Config()
