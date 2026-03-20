"""
Human-like Voice Agent Integration
Combines LiveKit agent with human conversation management
"""

import asyncio
import logging
import time
from typing import Optional, Dict, Any
from livekit import agents
from livekit.agents import stt, tts, llm, vad

# Import human conversation manager
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

# Import services
from .services.deepgram_stt import DeepgramSTT
from .services.sarvam_tts import SarvamTTS
from .optimized_config import OPENAI_CONFIG, SESSION_CONFIG

logger = logging.getLogger("human-agent")

class HumanVoiceAgent(agents.VoiceAgent):
    """
    Human-like voice agent with natural conversation flow
    """
    
    def __init__(
        self,
        *,
        stt: stt.STT,
        tts: tts.TTS,
        llm: llm.LLM,
        vad: Optional[vad.VAD] = None,
        **kwargs
    ) -> None:
        super().__init__(stt=stt, tts=tts, llm=llm, vad=vad, **kwargs)
        
        # Track conversation state
        self._user_speaking = False
        self._agent_speaking = False
        self._current_response_task = None
        self._silence_start_time = 0.0
        
        logger.info("Human Voice Agent initialized")
    
    async def on_start(self) -> None:
        """Called when the agent session starts"""
        logger.info("Human Voice Agent session started")
        await super().on_start()
    
    async def on_end(self) -> None:
        """Called when the agent session ends"""
        logger.info("Human Voice Agent session ending")
        stop_conversation_immediately()
        
        # Cancel any ongoing response
        if self._current_response_task and not self._current_response_task.done():
            self._current_response_task.cancel()
            try:
                await self._current_response_task
            except asyncio.CancelledError:
                pass
        
        await super().on_end()
    
    async def on_user_started_speaking(self) -> None:
        """Called when user starts speaking"""
        logger.debug("User started speaking")
        self._user_speaking = True
        human_conversation_manager.state.user_speaking = True
        
        # Cancel any ongoing response when user speaks
        if self._current_response_task and not self._current_response_task.done():
            self._current_response_task.cancel()
            try:
                await self._current_response_task
            except asyncio.CancelledError:
                pass
    
    async def on_user_stopped_speaking(self) -> None:
        """Called when user stops speaking"""
        logger.debug("User stopped speaking")
        self._user_speaking = False
        human_conversation_manager.state.user_speaking = False
        self._silence_start_time = time.time()
    
    async def on_transcript(
        self,
        transcript: stt.Transcript,
        is_final: bool = True,
    ) -> None:
        """
        Handle user transcript with human-like processing
        """
        if not transcript.text:
            return
        
        logger.info(f"Transcript received: '{transcript.text}' (final: {is_final})")
        
        # Process transcript through human conversation manager
        should_process, immediate_response = await process_user_transcript(
            transcript.text, is_final, self.session
        )
        
        if not should_process:
            logger.debug("Transcript filtered out by human conversation manager")
            return
        
        # Handle immediate responses (short responses, ambiguity)
        if immediate_response:
            logger.info(f"Immediate response: {immediate_response}")
            await self._speak_with_delay(immediate_response)
            return
        
        # Process with natural delay and LLM
        self._current_response_task = asyncio.create_task(
            self._process_with_delay(transcript.text)
        )
    
    async def _process_with_delay(self, user_text: str) -> None:
        """
        Process user input with natural thinking delay
        """
        try:
            # Add human-like thinking delay
            delay = await add_natural_delay(user_text)
            logger.info(f"Added thinking delay: {delay:.2f}s")
            
            # Wait for natural pause before responding
            if not await human_conversation_manager.wait_for_natural_pause(self.session):
                logger.debug("Conversation ended during pause")
                return
            
            # Generate response with context
            response = await self._generate_contextual_response(user_text)
            
            if response and not is_response_repetitive(response):
                await self._speak_with_delay(response)
            else:
                logger.warning("Response was repetitive or empty")
        
        except asyncio.CancelledError:
            logger.debug("Response processing cancelled")
        except Exception as e:
            logger.error(f"Error processing user input: {e}")
    
    async def _generate_contextual_response(self, user_text: str) -> Optional[str]:
        """
        Generate response using LLM with conversation context
        """
        try:
            # Get conversation context
            context = get_conversation_context()
            
            # Build context-aware prompt
            context_prompt = f"""
Current Conversation Context:
- Property Type: {context.get('property_type', 'Not specified')}
- Budget: {context.get('budget', 'Not specified')}
- Location: {context.get('location', 'Not specified')}
- Conversation Turn: {context.get('turn', 0)}
- Last Question Asked: {context.get('last_question', 'None')}

User just said: "{user_text}"

Provide a natural, contextual response. If you need to ask a question, make it specific based on what we already know.
"""
            
            # Generate response using LLM
            response = await self.llm.achat(
                messages=[
                    {"role": "system", "content": OPENAI_CONFIG["system_prompt"]},
                    {"role": "system", "content": context_prompt}
                ],
                max_tokens=OPENAI_CONFIG["max_tokens"],
                temperature=OPENAI_CONFIG["temperature"]
            )
            
            return response.choices[0].message.content.strip() if response.choices else None
        
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}")
            return None
    
    async def _speak_with_delay(self, text: str) -> None:
        """
        Speak text with natural timing
        """
        try:
            self._agent_speaking = True
            human_conversation_manager.state.agent_speaking = True
            
            logger.info(f"Agent speaking: {text}")
            
            # Speak the response
            await self.say(text)
            
            # Update conversation context
            intent, _ = human_conversation_manager.detect_intent(
                human_conversation_manager.state.last_user_utterance
            )
            update_conversation_context(
                human_conversation_manager.state.last_user_utterance,
                text,
                intent
            )
            
        except Exception as e:
            logger.error(f"Error speaking: {e}")
        finally:
            self._agent_speaking = False
            human_conversation_manager.state.agent_speaking = False

def create_human_agent() -> HumanVoiceAgent:
    """
    Factory function to create a human-like voice agent
    """
    # Initialize services
    stt_service = DeepgramSTT()
    tts_service = SarvamTTS()
    
    # Initialize LLM (using OpenAI from config)
    from livekit.plugins import openai
    llm_service = openai.LLM(
        model=OPENAI_CONFIG["model"],
        temperature=OPENAI_CONFIG["temperature"],
        max_tokens=OPENAI_CONFIG["max_tokens"]
    )
    
    # Create and return the human agent
    return HumanVoiceAgent(
        stt=stt_service,
        tts=tts_service,
        llm=llm_service
    )

# Predefined agent for easy import
human_agent = create_human_agent()
