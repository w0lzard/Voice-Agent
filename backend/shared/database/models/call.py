"""
Call record models and schemas.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class CallStatus(str, Enum):
    """Call status enumeration."""
    INITIATED = "initiated"
    RINGING = "ringing"
    ANSWERED = "answered"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"


class CallAnalysis(BaseModel):
    """Post-call analysis results from Gemini."""
    success: bool = False
    sentiment: str = "neutral"
    summary: str = ""
    key_topics: List[str] = []
    action_items: List[str] = []
    analyzed_at: Optional[datetime] = None


class CallRecord(BaseModel):
    """Complete call record stored in MongoDB."""
    call_id: str
    workspace_id: Optional[str] = None  # For multi-tenancy
    phone_number: str  # To number
    from_number: Optional[str] = None  # Caller ID
    status: CallStatus = CallStatus.INITIATED
    duration_seconds: int = 0
    
    # References
    assistant_id: Optional[str] = None
    sip_id: Optional[str] = None  # SIP config used
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    
    # Content
    transcript: List[Dict[str, Any]] = []
    transcript_url: Optional[str] = None
    recording_url: Optional[str] = None
    
    # Custom data
    instructions: Optional[str] = None
    webhook_url: Optional[str] = None
    metadata: Dict[str, Any] = {}
    
    # Analysis
    analysis: Optional[CallAnalysis] = None
    
    # Tracking
    webhook_sent: bool = False
    egress_id: Optional[str] = None
    room_name: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage."""
        data = self.model_dump()
        data["status"] = self.status.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CallRecord":
        """Create from MongoDB document."""
        data = dict(data)  # don't mutate the original
        if "_id" in data:
            del data["_id"]

        # Map camelCase legacy fields → snake_case
        _camel_map = {
            "callId": "call_id",
            "workspaceId": "workspace_id",
            "phoneNumber": "phone_number",
            "fromNumber": "from_number",
            "durationSeconds": "duration_seconds",
            "assistantId": "assistant_id",
            "sipId": "sip_id",
            "createdAt": "created_at",
            "startedAt": "started_at",
            "answeredAt": "answered_at",
            "endedAt": "ended_at",
            "transcriptUrl": "transcript_url",
            "recordingUrl": "recording_url",
            "webhookUrl": "webhook_url",
            "webhookSent": "webhook_sent",
            "egressId": "egress_id",
            "roomName": "room_name",
            "campaignId": None,  # not a field on CallRecord — drop it
        }
        for camel, snake in _camel_map.items():
            if camel in data:
                val = data.pop(camel)
                if snake is not None and snake not in data:
                    data[snake] = val

        # Handle transcript format variations
        transcript = data.get("transcript")
        if isinstance(transcript, dict):
            if "messages" in transcript:
                data["transcript"] = transcript.get("messages", [])
            elif "items" in transcript:
                data["transcript"] = transcript.get("items", [])
        elif transcript is None:
            data["transcript"] = []

        # Provide safe defaults for required fields that may be absent in legacy docs
        if "call_id" not in data or not data["call_id"]:
            data["call_id"] = str(data.get("_id", "unknown"))
        if "phone_number" not in data or not data["phone_number"]:
            data["phone_number"] = data.get("to", "unknown")

        # Drop unknown extra keys so Pydantic doesn't reject them
        known = {f for f in cls.model_fields}
        data = {k: v for k, v in data.items() if k in known}

        return cls(**data)


class CreateCallRequest(BaseModel):
    """Request body for creating a new call."""
    phone_number: str
    assistant_id: Optional[str] = None  # Use assistant config
    sip_id: Optional[str] = None  # Use specific SIP config (or default)
    from_number: Optional[str] = None  # Override caller ID
    instructions: Optional[str] = None  # Override assistant instructions
    webhook_url: Optional[str] = None
    metadata: Dict[str, Any] = {}


class CallResponse(CallRecord):
    """Response for call operations."""
    message: Optional[str] = None
    
    @classmethod
    def from_call_record(cls, record: CallRecord, message: str = None) -> "CallResponse":
        """Create response from call record."""
        data = record.model_dump()
        if message:
            data["message"] = message
        return cls(**data)

