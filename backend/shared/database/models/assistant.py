"""
Assistant model for storing AI agent configurations.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid


class VoiceConfig(BaseModel):
    """
    Voice configuration for an assistant.
    Supports both Realtime (speech-to-speech) and Pipeline (STT→LLM→TTS) modes.
    """
    # Voice settings
    voice_id: str = "alloy"  # Voice ID for TTS
    
    # Mode: "realtime" (speech-to-speech) or "pipeline" (STT→LLM→TTS)
    mode: str = "realtime"
    
    # === Realtime Mode (Speech-to-Speech) ===
    realtime_provider: str = "google"
    realtime_model: str = "gemini-2.5-flash-native-audio-preview-12-2025"

    # === Pipeline Mode (fallback) ===
    stt_provider: str = "google"
    stt_model: str = "latest_long"
    stt_language: str = "hi-IN"

    llm_provider: str = "google"
    llm_model: str = "gemini-2.5-flash"

    tts_provider: str = "google"
    tts_model: str = "gemini-2.5-flash-tts"


class ToolDefinition(BaseModel):
    """Tool/function definition for an assistant."""
    name: str
    description: str
    type: str = "webhook"  # webhook, built-in
    webhook_url: Optional[str] = None
    parameters: Dict[str, Any] = {}


class Assistant(BaseModel):
    """AI Assistant configuration stored in database."""
    assistant_id: str = Field(default_factory=lambda: f"asst_{uuid.uuid4().hex[:12]}")
    workspace_id: Optional[str] = None  # For multi-tenancy
    name: str
    description: Optional[str] = None
    
    # AI Configuration
    instructions: str = "You are a helpful voice assistant."
    first_message: Optional[str] = None  # What agent says first
    
    # Voice
    voice: VoiceConfig = Field(default_factory=VoiceConfig)
    
    # Model settings
    model_provider: str = "google"
    model_name: str = "gemini-2.5-flash-native-audio-preview-12-2025"
    temperature: float = 0.8
    
    # Tools
    tools: List[ToolDefinition] = []
    
    # Webhooks
    webhook_url: Optional[str] = None
    
    # Metadata
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage."""
        data = self.model_dump()
        # Ensure datetime is serializable
        data["created_at"] = self.created_at.isoformat()
        data["updated_at"] = self.updated_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Assistant":
        """Create from MongoDB document."""
        if "_id" in data:
            del data["_id"]
        return cls(**data)


class CreateAssistantRequest(BaseModel):
    """Request to create a new assistant."""
    name: str
    description: Optional[str] = None
    instructions: str = "You are a helpful voice assistant."
    first_message: Optional[str] = None
    voice: Optional[VoiceConfig] = None
    temperature: float = 0.8
    webhook_url: Optional[str] = None


class UpdateAssistantRequest(BaseModel):
    """Request to update an assistant."""
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    first_message: Optional[str] = None
    voice: Optional[VoiceConfig] = None
    temperature: Optional[float] = None
    webhook_url: Optional[str] = None
    is_active: Optional[bool] = None


class AssistantResponse(BaseModel):
    """Response for assistant operations."""
    assistant_id: str
    name: str
    message: str = "Success"
