"""
Human-like Conversation Integration
Integrates human conversation manager with existing agent system
"""

import asyncio
import logging
import time
from typing import Optional, Dict, Any

# Import human conversation components
from .human_conversation import (
    human_conversation_manager,
    process_user_transcript,
    add_natural_delay,
    update_conversation_context,
    stop_conversation_immediately,
    is_response_repetitive,
    get_conversation_context,
    IntentType
)

# Import existing agent functions
from .enhanced_conversation import (
    conversation_manager,
    enhanced_speak_scripted_line,
    handle_user_state_change
)

# Import optimized config
from .optimized_config import OPENAI_CONFIG, FAST_PATH_RESPONSES

logger = logging.getLogger("human-integration")

class HumanConversationIntegration:
    """
    Integrates human-like conversation features with existing agent
    """
    
    def __init__(self):
        self.conversation_manager = human_conversation_manager
        self.enhanced_manager = conversation_manager
        
    async def handle_transcript_with_human_flow(
        self,
        session,
        transcript: str,
        is_final: bool,
        **kwargs
    ) -> bool:
        """
        Handle transcript with human-like conversation flow
        Returns True if processed, False if should fall back to original system
        """
        try:
            # Process through human conversation manager
            should_process, immediate_response = await process_user_transcript(
                transcript, is_final, session
            )
            
            if not should_process:
                logger.debug("Transcript filtered by human conversation manager")
                return True
            
            # Handle immediate responses
            if immediate_response:
                logger.info(f"Human immediate response: {immediate_response}")
                await self._speak_with_human_delay(session, immediate_response)
                return True
            
            # Add natural thinking delay
            delay = await add_natural_delay(transcript)
            logger.info(f"Added human thinking delay: {delay:.2f}s")
            
            # Wait for natural pause
            if not await self.conversation_manager.wait_for_natural_pause(session):
                logger.debug("Conversation ended during natural pause")
                return True
            
            # Process with enhanced conversation system
            return await self._process_with_enhanced_system(
                session, transcript, **kwargs
            )
            
        except Exception as e:
            logger.error(f"Error in human conversation integration: {e}")
            return False  # Fall back to original system
    
    async def _process_with_enhanced_system(
        self,
        session,
        transcript: str,
        **kwargs
    ) -> bool:
        """
        Process transcript using enhanced conversation system
        """
        try:
            # Use existing enhanced conversation handler
            result = await handle_user_transcribed(
                session, transcript, is_final=True, **kwargs
            )
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Error in enhanced system processing: {e}")
            return False
    
    async def _speak_with_human_delay(
        self,
        session,
        text: str,
        delay: float = 0.0
    ) -> None:
        """
        Speak with human-like natural timing
        """
        try:
            # Add small delay for naturalness
            if delay > 0:
                await asyncio.sleep(delay)
            
            # Use enhanced speaking function
            await enhanced_speak_scripted_line(
                session,
                text=text,
                allow_interruptions=True
            )
            
            # Update conversation context
            intent, _ = self.conversation_manager.detect_intent(
                self.conversation_manager.state.last_user_utterance
            )
            update_conversation_context(
                self.conversation_manager.state.last_user_utterance,
                text,
                intent
            )
            
        except Exception as e:
            logger.error(f"Error speaking with human delay: {e}")
    
    def get_enhanced_context_for_llm(self) -> Dict[str, Any]:
        """
        Get enhanced context for LLM processing
        """
        # Get human conversation context
        human_context = get_conversation_context()
        
        # Get enhanced conversation context
        enhanced_context = {
            "last_user_utterance": self.enhanced_manager.state.last_user_utterance,
            "last_agent_response": self.enhanced_manager.state.last_agent_response,
            "user_speaking": self.enhanced_manager.state.user_speaking,
            "agent_speaking": self.enhanced_manager.state.agent_speaking,
        }
        
        # Combine contexts
        combined_context = {
            **human_context,
            **enhanced_context,
            "conversation_style": "human_like",
            "response_timing": "natural_delays",
            "anti_repetition": True
        }
        
        return combined_context
    
    def should_use_fast_path(self, transcript: str) -> Optional[str]:
        """
        Enhanced fast path detection with human-like filtering
        """
        text = transcript.lower().strip()
        
        # Check for short responses first
        if text in self.conversation_manager.short_responses:
            return "short_response"
        
        # Check for ambiguity
        for pattern in self.conversation_manager.ambiguity_patterns:
            import re
            if re.search(pattern, text, re.IGNORECASE):
                return "ambiguity"
        
        # Use existing fast path logic
        # (This would integrate with your existing _build_fast_reply function)
        return None
    
    async def handle_session_end(self, session) -> None:
        """
        Handle session end with immediate stop
        """
        logger.info("Handling session end with immediate stop")
        stop_conversation_immediately()
        
        # Update enhanced conversation state
        handle_user_state_change(session, "disconnected")

# Global integration instance
human_integration = HumanConversationIntegration()

# Convenience functions for easy integration
async def handle_transcript_human_style(
    session,
    transcript: str,
    is_final: bool,
    **kwargs
) -> bool:
    """
    Handle transcript with human-like conversation flow
    """
    return await human_integration.handle_transcript_with_human_flow(
        session, transcript, is_final, **kwargs
    )

async def speak_with_human_timing(
    session,
    text: str,
    delay: float = 0.0
) -> None:
    """
    Speak with human-like natural timing
    """
    await human_integration._speak_with_human_delay(session, text, delay)

def get_human_context_for_llm() -> Dict[str, Any]:
    """
    Get enhanced context for LLM processing
    """
    return human_integration.get_enhanced_context_for_llm()

def check_human_fast_path(transcript: str) -> Optional[str]:
    """
    Enhanced fast path detection
    """
    return human_integration.should_use_fast_path(transcript)

async def handle_human_session_end(session) -> None:
    """
    Handle session end
    """
    await human_integration.handle_session_end(session)
