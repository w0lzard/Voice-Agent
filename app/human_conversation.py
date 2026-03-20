"""
Human-like Conversation Manager for Voice AI Agent
Implements natural conversation flow with proper delays, context, and intelligence
"""

import asyncio
import time
import re
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum

class IntentType(Enum):
    """Types of user intents for intelligent handling"""
    AMBIGUOUS = "ambiguous"
    SHORT_RESPONSE = "short_response"
    PROPERTY_QUERY = "property_query"
    BUDGET_QUERY = "budget_query"
    LOCATION_QUERY = "location_query"
    CLARIFICATION = "clarification"
    UNKNOWN = "unknown"

@dataclass
class ConversationContext:
    """Maintains conversation memory and context"""
    property_type: Optional[str] = None
    budget: Optional[str] = None
    location: Optional[str] = None
    last_question: Optional[str] = None
    last_response: Optional[str] = None
    conversation_turn: int = 0
    user_preferences: Dict[str, str] = None
    
    def __post_init__(self):
        if self.user_preferences is None:
            self.user_preferences = {}

@dataclass
class ConversationState:
    """Real-time conversation state tracking"""
    last_user_utterance: str = ""
    last_agent_response: str = ""
    user_speaking: bool = False
    agent_speaking: bool = False
    silence_start: float = 0.0
    last_final_transcript: str = ""
    partial_transcripts: List[str] = None
    response_pending: bool = False
    call_active: bool = True
    
    def __post_init__(self):
        if self.partial_transcripts is None:
            self.partial_transcripts = []

class HumanConversationManager:
    """
    Manages human-like conversation with:
    - Natural delays (1-2 seconds thinking pause)
    - STT filtering (final transcripts only)
    - Ambiguity detection and clarification
    - Conversation memory and context
    - Short response handling
    - Stop on disconnect
    """
    
    def __init__(self):
        self.state = ConversationState()
        self.context = ConversationContext()
        
        # Timing settings for human-like behavior
        self.silence_threshold = 1.5  # seconds of silence before responding
        self.min_thinking_delay = 1.2  # minimum thinking time
        self.max_thinking_delay = 3.0  # maximum thinking time
        self.debounce_buffer = 0.8  # buffer for final transcript confirmation
        
        # Response tracking for anti-repetition
        self.recent_responses = []
        self.repetition_threshold = 2  # same response max 2 times
        
        # Short response patterns
        self.short_responses = {
            "haan": "continue",
            "han": "continue", 
            "hmm": "continue",
            "ji": "continue",
            "bolo": "continue",
            "ok": "continue",
            "okay": "continue",
            "theek hai": "continue",
            "accha": "continue",
            "sahi": "continue"
        }
        
        # Ambiguity patterns
        self.ambiguity_patterns = [
            r"ya\s+or",  # "flat ya bungalow"
            r"\s+or\s+",  # "this or that"
            r"either\s+.*\s+or",  # "either this or that"
            r"what\s+about\s+.*\s+or",  # "what about this or that"
        ]
        
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
        if not self.state.call_active:
            return False
            
        # Wait for natural pause
        await asyncio.sleep(self.debounce_buffer)
        
        # Additional silence detection if needed
        silence_start = time.time()
        while time.time() - silence_start < self.silence_threshold:
            if not self.state.call_active:
                return False
            await asyncio.sleep(0.1)
            
        return True
    
    async def add_thinking_delay(self, transcript_complexity: str = "medium") -> float:
        """
        Human-like delay: Add 1-2 seconds thinking pause
        """
        if not self.state.call_active:
            return 0.0
            
        # Determine delay based on complexity
        if transcript_complexity == "simple":
            delay = self.min_thinking_delay
        elif transcript_complexity == "complex":
            delay = self.max_thinking_delay
        else:
            delay = (self.min_thinking_delay + self.max_thinking_delay) / 2
            
        # Add small random variation for naturalness
        import random
        delay += random.uniform(-0.2, 0.2)
        delay = max(0.8, min(delay, 3.5))  # Clamp between 0.8 and 3.5 seconds
        
        await asyncio.sleep(delay)
        return delay
    
    def detect_intent(self, transcript: str) -> Tuple[IntentType, Dict]:
        """
        Intelligent intent detection for proper response handling
        """
        text = transcript.lower().strip()
        
        # Check for short responses
        if text in self.short_responses:
            return IntentType.SHORT_RESPONSE, {"action": "continue"}
        
        # Check for ambiguity
        for pattern in self.ambiguity_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return IntentType.AMBIGUOUS, {"text": transcript}
        
        # Check for property type queries
        property_keywords = ["flat", "bungalow", "house", "apartment", "villa", "plot"]
        if any(keyword in text for keyword in property_keywords):
            return IntentType.PROPERTY_QUERY, {"text": transcript}
        
        # Check for budget queries
        budget_keywords = ["budget", "price", "cost", "rate", "kitna", "lakh", "crore"]
        if any(keyword in text for keyword in budget_keywords):
            return IntentType.BUDGET_QUERY, {"text": transcript}
        
        # Check for location queries
        location_keywords = ["location", "area", "where", "kahan", "kis area", "location"]
        if any(keyword in text for keyword in location_keywords):
            return IntentType.LOCATION_QUERY, {"text": transcript}
        
        return IntentType.UNKNOWN, {"text": transcript}
    
    def handle_ambiguity(self, transcript: str) -> str:
        """
        Handle ambiguous inputs with clarification questions
        """
        text = transcript.lower().strip()
        
        # Specific patterns for common ambiguities
        if "flat ya bungalow" in text:
            return "Aap flat lena chahte hain ya bungalow? Thoda clear kar dijiye."
        
        if re.search(r"(\w+)\s+ya\s+or\s+(\w+)", text):
            return "Aap ek cheez hi bataiye, main confuse ho gayi. Kya aap clearly keh sakte hain?"
        
        return "Aapki baat thodi unclear lagi. Kya aap dobara explain kar sakte hain?"
    
    def handle_short_response(self, transcript: str) -> str:
        """
        Handle short responses like "haan", "bolo", "ok" contextually
        """
        if not self.context.last_question:
            return "Ji, main aapki kya help kar sakti hoon?"
        
        # Continue the previous conversation flow
        last_q = self.context.last_question.lower()
        
        if "budget" in last_q or "kitna" in last_q:
            return "Aapka budget bataye, main aapko best options dikhaoongi."
        
        if "location" in last_q or "kahan" in last_q or "area" in last_q:
            return "Location bataiye, main wahan ki properties check karti hoon."
        
        if "property" in last_q or "type" in last_q:
            return "Kis type ki property chahiye - flat, bungalow, ya villa?"
        
        # Default continuation
        return "Theek hai, aap baad mein bata dijiye. Main wait kar rahi hoon."
    
    def is_repetition(self, response: str) -> bool:
        """
        Check if response is repetitive and suggest alternative
        """
        # Count recent occurrences
        recent_count = sum(1 for r in self.recent_responses if r == response)
        if recent_count >= self.repetition_threshold:
            return True
        
        # Check if same as last response
        if response == self.state.last_agent_response:
            return True
        
        return False
    
    def get_contextual_response(self, intent: IntentType, data: Dict) -> str:
        """
        Generate contextual responses based on conversation history
        """
        if intent == IntentType.AMBIGUOUS:
            return self.handle_ambiguity(data.get("text", ""))
        
        if intent == IntentType.SHORT_RESPONSE:
            return self.handle_short_response(data.get("text", ""))
        
        # For other intents, let the LLM handle but with context
        return None  # Let LLM generate response with full context
    
    def update_context(self, user_utterance: str, agent_response: str, intent: IntentType):
        """
        Update conversation context and memory
        """
        self.context.conversation_turn += 1
        self.context.last_response = agent_response
        
        # Extract and store relevant information
        if intent == IntentType.PROPERTY_QUERY:
            # Extract property type
            if "flat" in user_utterance.lower():
                self.context.property_type = "flat"
            elif "bungalow" in user_utterance.lower():
                self.context.property_type = "bungalow"
            elif "villa" in user_utterance.lower():
                self.context.property_type = "villa"
        
        elif intent == IntentType.BUDGET_QUERY:
            # Extract budget information
            budget_match = re.search(r"(\d+)\s*(lakh|crore)", user_utterance.lower())
            if budget_match:
                self.context.budget = budget_match.group(0)
        
        elif intent == IntentType.LOCATION_QUERY:
            # Extract location (simplified)
            words = user_utterance.lower().split()
            for word in words:
                if len(word) > 3 and word not in ["location", "area", "kahan", "kis"]:
                    self.context.location = word
                    break
        
        # Update response history
        self.recent_responses.append(agent_response)
        if len(self.recent_responses) > 5:
            self.recent_responses.pop(0)
    
    def stop_conversation(self):
        """
        Immediate stop when call ends
        """
        self.state.call_active = False
        self.state.agent_speaking = False
        self.state.user_speaking = False
    
    def get_conversation_summary(self) -> Dict:
        """
        Get summary of conversation for logging or analytics
        """
        return {
            "turns": self.context.conversation_turn,
            "property_type": self.context.property_type,
            "budget": self.context.budget,
            "location": self.context.location,
            "last_question": self.context.last_question,
            "preferences": self.context.user_preferences
        }

# Global instance
human_conversation_manager = HumanConversationManager()

# Convenience functions for integration
async def process_user_transcript(transcript: str, is_final: bool, session=None) -> Tuple[bool, Optional[str]]:
    """
    Process user transcript with human-like filtering and delays
    Returns (should_process, immediate_response)
    """
    if not human_conversation_manager.should_process_transcript(transcript, is_final):
        return False, None
    
    # Detect intent
    intent, data = human_conversation_manager.detect_intent(transcript)
    
    # Handle immediate responses for short inputs
    if intent == IntentType.SHORT_RESPONSE:
        response = human_conversation_manager.handle_short_response(transcript)
        return True, response
    
    # Handle ambiguity with clarification
    if intent == IntentType.AMBIGUOUS:
        response = human_conversation_manager.handle_ambiguity(transcript)
        return True, response
    
    return True, None

async def add_natural_delay(transcript: str) -> float:
    """
    Add human-like thinking delay based on transcript complexity
    """
    # Determine complexity
    text = transcript.lower().strip()
    if len(text.split()) <= 3:
        complexity = "simple"
    elif len(text.split()) >= 8 or any(word in text for word in ["because", "since", "although", "however"]):
        complexity = "complex"
    else:
        complexity = "medium"
    
    return await human_conversation_manager.add_thinking_delay(complexity)

def update_conversation_context(user_utterance: str, agent_response: str, intent: IntentType):
    """
    Update conversation memory and context
    """
    human_conversation_manager.update_context(user_utterance, agent_response, intent)

def stop_conversation_immediately():
    """
    Stop conversation immediately when call ends
    """
    human_conversation_manager.stop_conversation()

def is_response_repetitive(response: str) -> bool:
    """
    Check if response is repetitive
    """
    return human_conversation_manager.is_repetition(response)

def get_conversation_context() -> Dict:
    """
    Get current conversation context for LLM
    """
    return {
        "property_type": human_conversation_manager.context.property_type,
        "budget": human_conversation_manager.context.budget,
        "location": human_conversation_manager.context.location,
        "last_question": human_conversation_manager.context.last_question,
        "turn": human_conversation_manager.context.conversation_turn,
        "preferences": human_conversation_manager.context.user_preferences
    }
