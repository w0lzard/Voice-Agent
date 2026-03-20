"""
Enhanced Voice Agent Conversation Manager
Fixes: STT filtering, turn-taking, response delays, anti-repetition, natural flow
"""

import asyncio
import time
import os
import random
from typing import Optional, Dict, List
from dataclasses import dataclass

# Import original functions from main agent
try:
    from .agent import _build_fast_reply
except ImportError:
    # For testing or standalone usage
    _build_fast_reply = None

# Use original _speak_scripted_line directly
_speak_scripted_line = None

@dataclass
class ConversationState:
    """Track conversation state to prevent issues"""
    last_user_utterance: str = ""
    last_agent_response: str = ""
    last_intent: str = ""
    user_speaking: bool = False
    agent_speaking: bool = False
    silence_start: float = 0.0
    last_final_transcript: str = ""
    partial_transcripts: List[str] = None
    response_pending: bool = False
    
    def __post_init__(self):
        if self.partial_transcripts is None:
            self.partial_transcripts = []

class EnhancedConversationManager:
    """Manages natural conversation flow with proper turn-taking"""
    
    def __init__(self):
        self.state = ConversationState()
        self_silence_threshold = 1.5  # seconds of silence before responding
        self.min_response_delay = 1.2  # minimum thinking time
        self.max_response_delay = 3.0  # maximum thinking time
        self.debounce_buffer = 0.8  # buffer for final transcript confirmation
        
        # Anti-repetition tracking
        self.recent_responses = []
        self.repetition_threshold = 2  # same response max 2 times
        
    def should_process_transcript(self, transcript: str, is_final: bool) -> bool:
        """
        STT Filtering: Only process high-confidence final transcripts
        """
        if not transcript or len(transcript.strip()) < 2:
            return False
            
        # Ignore partial transcripts completely
        if not is_final:
            self.state.partial_transcripts.append(transcript)
            return False
            
        # Check if this is different from last final
        if transcript == self.state.last_final_transcript:
            return False
            
        # Validate transcript quality
        if self._is_low_quality_transcript(transcript):
            return False
            
        self.state.last_final_transcript = transcript
        self.state.partial_transcripts.clear()
        return True
    
    def _is_low_quality_transcript(self, transcript: str) -> bool:
        """Filter out low-quality or ambiguous transcripts"""
        text = transcript.lower().strip()
        
        # Too short or single words that are ambiguous
        if len(text) < 3:
            return True
            
        # Common STT errors
        stt_errors = ["<noise>", "<crosstalk>", "[unintelligible]", "um", "uh", "ah"]
        if text in stt_errors:
            return True
            
        # Repetitive characters (STT confusion)
        if any(char * 3 in text for char in text):
            return True
            
        return False
    
    async def wait_for_natural_pause(self, session) -> bool:
        """
        Turn-taking: Wait for user silence before responding
        """
        if self.state.user_speaking:
            return False
            
        # Wait for natural silence period
        silence_start = time.time()
        while (time.time() - silence_start) < self.debounce_buffer:
            await asyncio.sleep(0.1)
            if self.state.user_speaking:
                return False
                
        return True
    
    async def add_thinking_delay(self, transcript_complexity: str = "medium") -> float:
        """
        Response Delay: Add natural thinking time based on complexity
        """
        complexity_delays = {
            "simple": self.min_response_delay,      # 1.2s
            "medium": 1.8,                         # 1.8s  
            "complex": self.max_response_delay      # 3.0s
        }
        
        # Determine complexity
        if len(transcript_complexity.split()) <= 3:
            delay_type = "simple"
        elif len(transcript_complexity.split()) <= 8:
            delay_type = "medium"
        else:
            delay_type = "complex"
            
        delay = complexity_delays[delay_type]
        await asyncio.sleep(delay)
        return delay
    
    def should_use_fast_path(self, transcript: str) -> tuple[bool, str]:
        """
        Improved FAST PATH: Only trigger on high-confidence, unambiguous inputs
        """
        text = transcript.lower().strip()
        
        # High-confidence name queries
        name_patterns = [
            "kaun bol", "kaun ho", "naam kya", "who are you",
            "tumhara naam", "aapka naam", "\u0924\u0941\u092e\u094d\u0939\u093e\u0930\u093e \u0928\u093e\u092e",
            "\u0906\u092a\u0915\u093e \u0928\u093e\u092e", "\u0928\u093e\u092e \u0915\u094d\u092f\u093e"
        ]
        
        # High-confidence company queries  
        company_patterns = [
            "kis company", "kaunsi company", "which company",
            "kahaan se", "anantasutra se ho"
        ]
        
        # High-confidence repeat requests
        repeat_patterns = [
            "phir se bolo", "fir se bolo", "dobara bolo", 
            "repeat", "repeat karo", "kya bola", "samjha nahi"
        ]
        
        # Check for high-confidence matches
        if any(pattern in text for pattern in name_patterns):
            return True, "name_query"
        elif any(pattern in text for pattern in company_patterns):
            return True, "company_query"  
        elif any(pattern in text for pattern in repeat_patterns):
            return True, "repeat_request"
            
        # Ambiguous or complex inputs should NOT use fast path
        return False, ""
    
    def is_repetition(self, response: str) -> bool:
        """
        Anti-repetition: Check if response would be repetitive
        """
        # Check against recent responses
        recent_count = sum(1 for r in self.recent_responses if r == response)
        if recent_count >= self.repetition_threshold:
            return True
            
        # Check against last agent response
        if response == self.state.last_agent_response:
            return True
            
        return False
    
    def track_response(self, response: str):
        """Track responses for anti-repetition"""
        self.recent_responses.append(response)
        self.state.last_agent_response = response
        
        # Keep only last 5 responses
        if len(self.recent_responses) > 5:
            self.recent_responses.pop(0)
    
    def get_conversation_context(self) -> Dict:
        """Get current conversation context for LLM"""
        return {
            "last_user_utterance": self.state.last_user_utterance,
            "last_agent_response": self.state.last_agent_response,
            "last_intent": self.state.last_intent,
            "turn_count": len(self.recent_responses),
            "user_speaking": self.state.user_speaking,
            "agent_speaking": self.state.agent_speaking
        }
    
    def update_user_state(self, speaking: bool):
        """Update user speaking state"""
        self.state.user_speaking = speaking
        if speaking:
            self.state.silence_start = 0.0
        else:
            self.state.silence_start = time.time()
    
    def update_agent_state(self, speaking: bool):
        """Update agent speaking state"""
        self.state.agent_speaking = speaking

# Global conversation manager instance
conversation_manager = EnhancedConversationManager()

# Enhanced STT event handler
async def handle_user_transcribed(session, ev, original_handler):
    """
    Enhanced STT handling with proper filtering and turn-taking
    """
    transcript = (getattr(ev, "transcript", "") or "").strip()
    is_final = getattr(ev, "is_final", False)
    
    # Update conversation state
    if is_final and transcript:
        conversation_manager.state.last_user_utterance = transcript
    
    # Apply enhanced filtering
    if not conversation_manager.should_process_transcript(transcript, is_final):
        return
    
    # Wait for natural pause before processing
    if not await conversation_manager.wait_for_natural_pause(session):
        return
    
    # Check for improved fast path
    should_fast, intent = conversation_manager.should_use_fast_path(transcript)
    if should_fast:
        # Add thinking delay even for fast path
        await conversation_manager.add_thinking_delay("simple")
        
        # Get fast response and check for repetition
        fast_response = _build_fast_reply(session, transcript)
        if fast_response and not conversation_manager.is_repetition(fast_response):
            conversation_manager.track_response(fast_response)
            conversation_manager.state.last_intent = intent
            
            # Deliver fast response
            await _speak_scripted_line(
                session,
                text=fast_response,
                allow_interruptions=True,
                resolves_turn=True,
            )
            return
    
    # Process with LLM with natural delay
    await conversation_manager.add_thinking_delay(transcript)
    
    # Continue with original LLM processing
    await original_handler(session, ev)

# Enhanced response delivery with anti-repetition
async def enhanced_speak_scripted_line(session, *, text: str, **kwargs):
    """
    Enhanced speaking with repetition prevention
    Falls back to original _speak_scripted_line if available
    """
    global _speak_scripted_line
    
    # Check for repetition
    if conversation_manager.is_repetition(text):
        # Generate alternative response
        alternative = await generate_alternative_response(text)
        if alternative:
            text = alternative
    
    # Track this response
    conversation_manager.track_response(text)
    conversation_manager.update_agent_state(True)
    
    try:
        if _speak_scripted_line:
            await _speak_scripted_line(session, text=text, **kwargs)
        else:
            # Fallback for testing
            logger.warning("Original _speak_scripted_line not available, using fallback")
            # This would need the actual implementation
            pass
    finally:
        conversation_manager.update_agent_state(False)

async def generate_alternative_response(original_response: str) -> Optional[str]:
    """Generate alternative response to avoid repetition"""
    alternatives = {
        "Ji, kis type ki property dekh rahe hain?": [
            "Achha, kis type ki property chahiye aapko?",
            "Kya property dekh rahe hain aap?",
            "Property type kya hai aapka?"
        ],
        "Budget kya socha hai?": [
            "Aapka budget kitna hai?",
            "Kya budget fix kiya hai aapne?",
            "Budget range kya rahega?"
        ],
        "Main Shubhi bol rahi hoon, Anantasutra se.": [
            "Main Shubhi hoon, Anantasutra ki representative.",
            "Shubhi bol rahi hoon, main Anantasutra se hoon."
        ]
    }
    
    for original, alts in alternatives.items():
        if original == original_response:
            # Choose alternative that wasn't used recently
            for alt in alts:
                if alt not in conversation_manager.recent_responses:
                    return alt
            return alts[0]  # fallback to first alternative
    
    return None

# User state change handler
def handle_user_state_change(ev):
    """Handle user speaking state changes"""
    new_state = getattr(ev, "new_state", None)
    if new_state:
        conversation_manager.update_user_state(new_state == "speaking")
