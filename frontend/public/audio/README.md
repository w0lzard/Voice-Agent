# Voice Sample Audio Files

Place real MP3 files here to override the browser TTS fallback.

Expected files:
- sarah.mp3   → Professional — Sarah
- mark.mp3    → Friendly — Mark
- james.mp3   → Sophisticated — James
- elena.mp3   → Warm — Elena

When a file is present, the HTML5 Audio player uses it.
When a file is missing (404), playback falls back to the browser's
built-in Web Speech API (SpeechSynthesisUtterance).
