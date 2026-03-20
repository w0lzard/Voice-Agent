"""
Optimized Voice Agent Configuration
Natural conversation flow with proper delays and filtering
"""

import os
import random

# ── ENHANCED CONVERSATION SETTINGS ────────────────────────────────────────────
CONVERSATION_CONFIG = {
    # Natural timing delays (seconds)
    "min_thinking_delay": 1.2,      # Minimum thinking time for simple queries
    "max_thinking_delay": 3.0,      # Maximum thinking time for complex queries
    "silence_threshold": 1.5,       # Silence before responding
    "debounce_buffer": 0.8,         # Buffer for final transcript confirmation
    
    # Anti-repetition settings
    "repetition_threshold": 2,       # Max times same response can repeat
    "recent_response_window": 5,     # Track last 5 responses
    
    # Fast path filtering (high confidence only)
    "fast_path_confidence_threshold": 0.9,
    "min_fast_path_length": 3,       # Minimum characters for fast path
}

# ── OPTIMIZED DEEPGRAM STT SETTINGS ───────────────────────────────────────────
DEEPGRAM_CONFIG = {
    # Model settings for Hindi/English mixed
    "model": "nova-2-general",
    "language": "hi",
    "smart_format": True,
    
    # Enhanced endpointing for natural conversation
    "endpointing": {
        "min_endpointing_delay": 0.3,    # Wait 300ms after speech
        "max_endpointing_delay": 1.0,    # Max 1s wait
        "silence_detection": True,
        "silence_threshold_ms": 800,      # 800ms of silence = end of speech
    },
    
    # Filtering settings
    "filter_profanity": True,
    "replace": ["<noise>", "<crosstalk>", "[unintelligible]"],
    "interim_results": True,  # For debug dashboard only
}

# ── OPTIMIZED OPENAI LLM SETTINGS ────────────────────────────────────────────
OPENAI_CONFIG = {
    # Model selection
    "model": "gpt-4o-mini",
    "temperature": 0.7,              # Balanced creativity
    "max_tokens": 150,              # Short, concise responses
    "top_p": 0.9,
    
    # Streaming for natural flow
    "stream": True,
    
    # Timeout settings
    "request_timeout": 8.0,         # 8 seconds max
    "connect_timeout": 3.0,         # 3 seconds to connect
    
    # System prompt for natural conversation
    "system_prompt": """You are Shubhi, a warm and empathetic property consultant who cares deeply about helping people find their dream home.

🎯 Your Personality:
- Speak with genuine warmth and care in your voice
- Show empathy when users express needs or emotions
- Use affectionate, caring language (like talking to family)
- Be patient and understanding, never rushed
- Show you truly want to help them find happiness

🏠 Property Help:
- Keep responses warm and personal (under 25 words)
- Use natural Hindi/English mix with affection
- Ask one caring question at a time
- Never repeat the same response
- Focus on their happiness, not just property details

💝 Emotional Intelligence:
- When they say "mujhe ek ladki chahiye" - respond with care
- When they express needs - show you understand
- When they seem sad - be extra gentle
- Always sound like you truly care about their happiness

Examples:
- "Aapki khushi meri priority hai" 
- "Main aapki sapno ghar dilaungi"
- "Aapko achha lagega, yakin hai"

Remember: You're not just selling property, you're helping someone find happiness.""",
    
    # Context management
    "context_window": 10,            # Last 10 turns
    "context_tokens": 1000,          # Max tokens for context
}

# ── OPTIMIZED SARVAM TTS SETTINGS ─────────────────────────────────────────────
SARVAM_CONFIG = {
    # Voice settings
    "speaker": "arya",
    "language": "hi-IN",
    "model": "bulbul:v2",           # Latest Bulbul v2 model for better quality
    
    # Audio quality
    "sample_rate": 24000,
    "bit_rate": 128000,
    
    # Speed and pitch for natural speech
    "pace": 1.0,                    # Human-like pace (1.0 = normal speed)
    "pitch": 0,                      # Neutral pitch
    "loudness": 1.0,
    
    # Timeout settings (reduced for faster responses)
    "request_timeout": 3.0,         # 3 seconds max
    "connect_timeout": 1.5,         # 1.5 seconds to connect
    
    # Preprocessing
    "enable_preprocessing": True,
    "normalize_text": True,
    
    # Caching for common responses
    "cache_responses": True,
    "cache_ttl": 3600,              # 1 hour cache
}

# ── VAD (VOICE ACTIVITY DETECTION) SETTINGS ───────────────────────────────────
VAD_CONFIG = {
    "model": "silero",
    "threshold": 0.5,               # Sensitivity for speech detection
    "min_speech_duration": 0.3,      # Min 300ms of speech
    "min_silence_duration": 0.8,    # Min 800ms of silence
    "speech_pad_ms": 300,            # Padding around speech
    "window_size_samples": 1536,    # 96ms windows
}

# ── SESSION CONFIGURATION ─────────────────────────────────────────────────────
SESSION_CONFIG = {
    # Turn-taking settings
    "min_endpointing_delay": 0.3,    # Reduced from 0.05 for more natural timing
    "max_endpointing_delay": 0.8,    # Reduced from 0.05 for better endpointing
    "false_interruption_timeout": 0.4, # Increased from 0.2 to prevent interruptions
    "user_away_timeout": 15.0,       # 15 seconds before reprompt
    
    # Interruption handling
    "allow_interruptions": True,
    "interruption_sensitivity": 0.7,  # Less sensitive to avoid false interruptions
    
    # Safety net settings
    "llm_safety_timeout": 2.5,       # Increased from 1.5 to reduce false triggers
    "max_fallback_attempts": 2,       # Max fallback responses per turn
}

# ── ENVIRONMENT VARIABLE MAPPINGS ─────────────────────────────────────────────
ENV_MAPPINGS = {
    # Conversation timing
    "CONVERSATION_MIN_THINKING_DELAY": "min_thinking_delay",
    "CONVERSATION_MAX_THINKING_DELAY": "max_thinking_delay",
    "CONVERSATION_SILENCE_THRESHOLD": "silence_threshold",
    
    # Deepgram settings
    "DEEPGRAM_MODEL": "model",
    "DEEPGRAM_LANGUAGE": "language",
    "DEEPGRAM_MIN_ENDPOINTING_DELAY": "endpointing.min_endpointing_delay",
    "DEEPGRAM_MAX_ENDPOINTING_DELAY": "endpointing.max_endpointing_delay",
    
    # OpenAI settings
    "OPENAI_MODEL": "model",
    "OPENAI_TEMPERATURE": "temperature",
    "OPENAI_MAX_TOKENS": "max_tokens",
    "OPENAI_REQUEST_TIMEOUT": "request_timeout",
    
    # Sarvam settings
    "SARVAM_SPEAKER": "speaker",
    "SARVAM_LANGUAGE": "language",
    "SARVAM_PACE": "pace",
    "SARVAM_REQUEST_TIMEOUT": "request_timeout",
    
    # Session settings
    "SESSION_MIN_ENDPOINTING_DELAY": "min_endpointing_delay",
    "SESSION_MAX_ENDPOINTING_DELAY": "max_endpointing_delay",
    "SESSION_FALSE_INTERRUPTION_TIMEOUT": "false_interruption_timeout",
    "LLM_SAFETY_TIMEOUT_SEC": "llm_safety_timeout",
}

def get_config_value(config_dict: dict, key: str, default=None):
    """Get config value with environment variable override"""
    env_key = ENV_MAPPINGS.get(key)
    if env_key and env_key in os.environ:
        return os.environ[env_key]
    
    keys = key.split('.')
    value = config_dict
    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            return default
    return value

# ── OPTIMIZED FAST PATH RESPONSES ───────────────────────────────────────────
FAST_PATH_RESPONSES = {
    # Name queries (high confidence)
    "name": [
        "Main Shubhi bol rahi hoon, Anantasutra se.",
        "Shubhi hoon, Anantasutra ki representative.",
        "Main Shubhi hoon, property consultant."
    ],
    
    # Company queries (high confidence)
    "company": [
        "Main Anantasutra ke liye kaam karti hoon.",
        "Anantasutra se hoon, property mein help karti hoon.",
        "Anantasutra ki representative hoon."
    ],
    
    # What I do (high confidence)
    "role": [
        "Main property options shortlist karne mein help karti hoon.",
        "Property search mein help karti hoon.",
        "Aapko best property dhoondhne mein help karti hoon."
    ],
    
    # Repeat requests (high confidence)
    "repeat": [
        "Bilkul, main phir se bolti hoon.",
        "Ji, ek baar aur batati hoon.",
        "Samjha, dobara bata rahi hoon."
    ],
    
    # Property type (medium confidence)
    "property_type": [
        "Kis type ki property chahiye aapko?",
        "Aap kya property dekh rahe hain?",
        "Property type bataiye."
    ],
    
    # Budget (medium confidence)
    "budget": [
        "Aapka budget kitna hai?",
        "Budget range kya rahega?",
        "Kya budget fix kiya hai aapne?"
    ],
    
    # Location (medium confidence)
    "location": [
        "Kis area mein dekh rahe hain?",
        "Location kya hai aapka?",
        "Kahaan property chahiye?"
    ]
}

def get_fast_path_response(intent: str, last_response: str = None) -> str:
    """Get varied fast path response to avoid repetition"""
    if intent not in FAST_PATH_RESPONSES:
        return None
    
    responses = FAST_PATH_RESPONSES[intent]
    
    # Filter out last used response
    if last_response:
        responses = [r for r in responses if r != last_response]
    
    if not responses:
        responses = FAST_PATH_RESPONSES[intent]
    
    return random.choice(responses)
