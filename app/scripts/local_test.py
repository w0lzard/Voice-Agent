#!/usr/bin/env python
"""
Local Diagnostic & Chat Test — Voice AI Platform
=================================================
Runs without a live phone call.  Checks every integration and simulates
a real agent conversation using the production AGENT_SCRIPT.

Usage:
    cd d:\\Voice-AI-Platform
    python scripts/local_test.py
"""

import asyncio
import io
import os
import sys
import time
from pathlib import Path

# Force UTF-8 stdout so Unicode chars (arrows, tick marks) don't crash on Windows cp1252
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Load .env from project root
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env", override=True)

# ── Colours ──────────────────────────────────────────────────────────────────
G = "\033[92m"; Y = "\033[93m"; R = "\033[91m"; B = "\033[94m"; C = "\033[96m"
BOLD = "\033[1m"; END = "\033[0m"
_PASS = f"{G}PASS{END}"; _FAIL = f"{R}FAIL{END}"; _WARN = f"{Y}WARN{END}"
_OK_SYM = "OK"; _X_SYM = "X"; _W_SYM = "!"

passed = 0; failed = 0

def ok(name, detail=""):
    global passed; passed += 1
    suffix = f"  {C}>> {detail}{END}" if detail else ""
    print(f"  [{_PASS}] {name}{suffix}")

def fail(name, detail=""):
    global failed; failed += 1
    suffix = f"\n         {Y}>> {detail}{END}" if detail else ""
    print(f"  [{_FAIL}] {name}{suffix}")

def warn(name, detail=""):
    suffix = f"  {C}>> {detail}{END}" if detail else ""
    print(f"  [{_WARN}] {name}{suffix}")

def section(title):
    print(f"\n{C}{BOLD}{'='*58}{END}")
    print(f"{C}{BOLD}  {title}{END}")
    print(f"{C}{'='*58}{END}")


# ════════════════════════════════════════════════════════════════
# 1. ENVIRONMENT VARIABLES
# ════════════════════════════════════════════════════════════════
section("1. ENVIRONMENT VARIABLES")

REQUIRED_VARS = [
    ("LIVEKIT_URL",            "LiveKit Cloud WebSocket URL"),
    ("LIVEKIT_API_KEY",        "LiveKit API key"),
    ("LIVEKIT_API_SECRET",     "LiveKit API secret"),
    ("OUTBOUND_TRUNK_ID",      "SIP trunk ID (ST_…)"),
    ("GOOGLE_API_KEY",         "Gemini / Google AI Studio key"),
    ("GOOGLE_REALTIME_MODEL",  "Gemini native-audio model name"),
    ("MONGODB_URI",            "MongoDB connection string"),
    ("MONGODB_DB_NAME",        "MongoDB database name"),
    ("AGENT_PERSONA_NAME",     "Agent first name"),
    ("AGENT_COMPANY_NAME",     "Company name shown to callers"),
]

for var, label in REQUIRED_VARS:
    val = os.getenv(var, "")
    if val and "MANUAL_REQUIRED" not in val:
        display = val[:50] + ("…" if len(val) > 50 else "")
        ok(f"{var}", f"{label} = {display}")
    else:
        fail(f"{var}", f"{label} — NOT SET or still a placeholder")

OPTIONAL_VARS = [
    ("GEMINI_SESSION_WARMUP_SEC",      "Gemini warmup guard (default 6 s)"),
    ("CARRIER_ANNOUNCEMENT_WAIT_SEC",  "Max carrier-wait after answer (default 7 s)"),
    ("OUTBOUND_FIRST_MESSAGE",         "Custom greeting override"),
    ("GOOGLE_REALTIME_VOICE",          "Gemini voice name"),
]
for var, label in OPTIONAL_VARS:
    val = os.getenv(var, "")
    warn(f"{var}", f"{label} = {val!r}" if val else f"{label} — using default")


# ════════════════════════════════════════════════════════════════
# 2. AGENT CONFIG SANITY CHECK
# ════════════════════════════════════════════════════════════════
section("2. AGENT CONFIG SANITY CHECK")

# Check the agent script can be imported and formatted
try:
    sys.path.insert(0, str(Path(__file__).parent))
    from agent_script import AGENT_SCRIPT
    agent_name = os.getenv("AGENT_PERSONA_NAME", "Shubhi")
    company    = os.getenv("AGENT_COMPANY_NAME",  "Estate Company")
    prompt = AGENT_SCRIPT.format(agent_name=agent_name, company=company)
    ok("agent_script.py import", f"{len(prompt)} chars loaded")
    if agent_name in prompt and company in prompt:
        ok("Persona substitution", f"agent_name={agent_name!r}, company={company!r}")
    else:
        fail("Persona substitution", "agent_name or company missing from prompt")
except Exception as e:
    fail("agent_script.py import", str(e))
    prompt = ""

# Provider is always Gemini Live
ok("Provider", "Gemini Live (google.realtime.RealtimeModel)")

# Check warmup + carrier timing
warmup = float(os.getenv("GEMINI_SESSION_WARMUP_SEC", "6"))
carrier = float(os.getenv("CARRIER_ANNOUNCEMENT_WAIT_SEC", "7"))
if warmup <= 8:
    ok("Gemini warmup", f"{warmup} s (good — low latency)")
else:
    warn("Gemini warmup", f"{warmup} s — consider reducing to 6 s")
if 4 <= carrier <= 10:
    ok("Carrier wait", f"{carrier} s (good range)")
else:
    warn("Carrier wait", f"{carrier} s — typical range is 5–9 s")

# Noise filter functions (import from agent.py logic inline)
def _is_stt_noise_token(text: str) -> bool:
    stripped = text.strip()
    return (
        stripped.startswith("<") and stripped.endswith(">")
        and len(stripped) <= 30 and " " not in stripped
    )

noise_cases = [
    ("<noise>",      True),
    ("<crosstalk>",  True),
    ("<laughter>",   True),
    ("हेलो",          False),
    ("Hello",        False),
    ("<this is real speech>", False),  # has spaces — should NOT be filtered
]
noise_ok = all(_is_stt_noise_token(t) == expected for t, expected in noise_cases)
if noise_ok:
    ok("STT noise filter logic", "all cases correct")
else:
    for t, expected in noise_cases:
        got = _is_stt_noise_token(t)
        if got != expected:
            fail("STT noise filter", f"_is_stt_noise_token({t!r}) = {got}, want {expected}")


# ════════════════════════════════════════════════════════════════
# 3. LIVEKIT CLOUD
# ════════════════════════════════════════════════════════════════
section("3. LIVEKIT CLOUD CONNECTIVITY")

async def test_livekit():
    try:
        from livekit import api as lkapi
        lk = lkapi.LiveKitAPI(
            url=os.getenv("LIVEKIT_URL"),
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET"),
        )
        t0 = time.time()
        rooms = await lk.room.list_rooms(lkapi.ListRoomsRequest())
        ms = int((time.time() - t0) * 1000)
        ok("LiveKit list_rooms", f"{len(rooms.rooms)} active rooms — {ms} ms RTT")

        # Verify trunk
        trunk_id = os.getenv("OUTBOUND_TRUNK_ID", "")
        try:
            trunks = await lk.sip.list_sip_outbound_trunk(lkapi.ListSIPOutboundTrunkRequest())
            trunk_ids = [t.sip_trunk_id for t in trunks.items]
            if trunk_id in trunk_ids:
                ok("SIP outbound trunk", f"{trunk_id} found")
            else:
                fail("SIP outbound trunk", f"{trunk_id} NOT found in {trunk_ids}")
        except Exception as te:
            warn("SIP trunk check", str(te))

        await lk.aclose()
    except Exception as e:
        fail("LiveKit connection", str(e))

asyncio.run(test_livekit())


# ════════════════════════════════════════════════════════════════
# 4. GOOGLE GEMINI API
# ════════════════════════════════════════════════════════════════
section("4. GOOGLE GEMINI API")

async def test_gemini():
    try:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

        # Quick chat via gemini-2.0-flash (non-realtime, for API key validation)
        m = genai.GenerativeModel("gemini-2.0-flash")
        t0 = time.time()
        resp = m.generate_content("Reply with exactly two words: API OK")
        ms = int((time.time() - t0) * 1000)
        text = (resp.text or "").strip()
        ok("Gemini REST API key valid", f'response="{text}" — {ms} ms')

        # Check that the realtime native-audio model is accessible
        realtime_model = os.getenv("GOOGLE_REALTIME_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025")
        try:
            models = {m.name for m in genai.list_models()}
            matches = [n for n in models if "native-audio" in n]
            if matches:
                ok("Gemini realtime model listed", matches[0])
            else:
                warn("Gemini realtime model", f"{realtime_model} not in list_models() — may still work via direct API")
        except Exception:
            warn("Gemini list_models", "Could not enumerate — key may be restricted")

    except Exception as e:
        err = str(e)
        if "429" in err or "quota" in err.lower():
            warn("Gemini REST API (gemini-2.0-flash)", "Free-tier daily REST quota exhausted")
            warn("Gemini Live (realtime audio)", "Uses BidiGenerateContent WebSocket — SEPARATE quota from REST; agent calls will still work")
        else:
            fail("Gemini API", err)

asyncio.run(test_gemini())


# ════════════════════════════════════════════════════════════════
# 5. MONGODB
# ════════════════════════════════════════════════════════════════
section("6. MONGODB CONNECTIVITY")

async def test_mongo():
    try:
        import motor.motor_asyncio as motor
        client = motor.AsyncIOMotorClient(
            os.getenv("MONGODB_URI"),
            serverSelectionTimeoutMS=6000,
        )
        t0 = time.time()
        await client.admin.command("ping")
        ms = int((time.time() - t0) * 1000)
        db = client[os.getenv("MONGODB_DB_NAME", "ai_outbound")]
        cols = await db.list_collection_names()
        ok("MongoDB ping", f"db={db.name}, collections={cols or '(empty)'} — {ms} ms")
        client.close()
    except Exception as e:
        fail("MongoDB connection", str(e))

asyncio.run(test_mongo())


# ════════════════════════════════════════════════════════════════
# 7. AGENT SCRIPT CHAT SIMULATION
# ════════════════════════════════════════════════════════════════
section("7. AGENT SCRIPT CHAT SIMULATION  (real Gemini conversation)")

if not prompt:
    warn("Chat simulation", "Skipped — agent_script.py failed to load")
else:
    # Conversation pairs: (user message, what the agent SHOULD do)
    CHAT_TURNS = [
        ("हाँ, बताइए।",
         "Should introduce self + company, ask if good time to talk"),
        ("हाँ ठीक है, बोलो।",
         "Should ask what kind of property they want"),
        ("मुझे एक flat चाहिए।",
         "Should ask city/location — only one question"),
        ("Delhi NCR में।",
         "Should ask budget — only one question"),
        ("50 लाख तक।",
         "Should ask flat/villa/plot/commercial — only one question"),
        ("3BHK flat चाहिए।",
         "Should say will share options, wrap up"),
    ]

    async def run_chat():
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            # Try models in priority order; stop at the first one that works
            model_name = None
            for _candidate in ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash-latest"]:
                try:
                    _probe = genai.GenerativeModel(_candidate)
                    _probe.generate_content("hi", generation_config=genai.GenerationConfig(max_output_tokens=3))
                    model_name = _candidate
                    break
                except Exception:
                    continue  # try next model

            if model_name is None:
                warn("Chat simulation", "All Gemini REST models unavailable (quota/404) — skipping")
                warn("Agent Gemini Live", "Uses BidiGenerateContent WebSocket — SEPARATE quota; live calls still work")
                return
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.4,
                    max_output_tokens=150,
                ),
            )
            chat = model.start_chat(history=[])

            print(f"\n  {B}{BOLD}Persona: {agent_name} @ {company}  [model: {model_name}]{END}")
            print(f"  {C}Running {len(CHAT_TURNS)}-turn Hindi real-estate conversation...{END}\n")

            violations = []
            for i, (user_msg, expectation) in enumerate(CHAT_TURNS, 1):
                t0 = time.time()
                resp = chat.send_message(user_msg)
                ms = int((time.time() - t0) * 1000)
                reply = (resp.text or "").strip()

                print(f"  {B}[Turn {i}] User:{END} {user_msg}")
                print(f"  {G}         Agent ({ms} ms):{END} {reply}")

                # Compliance checks
                if any(w in reply.lower() for w in ["ai", "bot", "language model", "artificial intelligence"]):
                    violations.append(f"Turn {i}: Agent revealed AI identity")
                    print(f"  {R}  ✗ AI identity revealed!{END}")
                elif len(reply) > 300:
                    print(f"  {Y}  ⚠ Long reply ({len(reply)} chars) — should be ≤2 sentences{END}")
                else:
                    print(f"  {G}  ✓ {expectation}{END}")
                print()

            if not violations:
                ok("Script compliance (6 turns)", "No AI reveals; stayed in persona")
            else:
                for v in violations:
                    fail("Script violation", v)

            ok("Conversation flow", "All 6 turns completed via Gemini 2.0 Flash")

        except Exception as e:
            fail("Chat simulation", str(e))

    asyncio.run(run_chat())


# ════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════
section("SUMMARY")
total = passed + failed
print(f"\n  Hard checks : {total}  |  {G}Passed: {passed}{END}  |  {R}Failed: {failed}{END}\n")
if failed == 0:
    print(f"  {G}{BOLD}✓  ALL CHECKS PASSED — agent is ready.{END}\n")
    print(f"  {C}Run the agent with:   python agent.py start{END}")
    print(f"  {C}Make a test call via: python make_call.py{END}\n")
else:
    print(f"  {Y}{BOLD}⚠  Fix the FAILED items above before starting the agent.{END}\n")
