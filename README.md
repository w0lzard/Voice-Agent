# Voice Agent

Standalone phone agent built on LiveKit SIP, Vobiz telephony, and OpenAI speech models.

This root-level setup is the fastest way to run the agent in this repository. It supports:

- outbound PSTN calls through Vobiz
- inbound PSTN calls through LiveKit dispatch rules
- OpenAI STT, LLM, and TTS conversation flow
- Hindi-first or English-first behavior
- transfer to a default or spoken destination number
- calling any valid target number from the CLI

> This repository also contains a larger backend/frontend platform under `backend/` and `frontend/`. You do not need that stack to use the standalone flow documented here.

## At A Glance

| File | Purpose |
| --- | --- |
| `agent.py` | Standalone outbound worker |
| `make_call.py` | Dispatch outbound calls from the CLI |
| `agent_inbound.py` | Standalone inbound worker |
| `setup_trunk.py` | Sync an existing LiveKit outbound trunk from `.env` |
| `setup_inbound.py` | Create the LiveKit inbound trunk and dispatch rule |
| `.env.example` | Environment template |
| `transfer_call.md` | Transfer-specific notes |

## Flow

```mermaid
flowchart LR
    CLI[make_call.py] --> LK[LiveKit Dispatch]
    LK --> AGENT[agent.py]
    AGENT --> SIP[LiveKit SIP]
    SIP --> VOBIZ[Vobiz]
    VOBIZ --> PSTN[Phone Network]
    PSTN --> USER[Caller]
```

Outbound flow:

1. `make_call.py` dispatches a LiveKit job with the target phone number.
2. `agent.py` joins the room as `outbound-caller`.
3. The worker resolves or updates the outbound SIP trunk using `.env`.
4. LiveKit dials the destination over Vobiz.
5. OpenAI STT -> LLM -> TTS drives the conversation.

Inbound flow:

1. Vobiz sends the inbound call to your LiveKit SIP endpoint.
2. LiveKit matches the inbound trunk and dispatch rule.
3. `agent_inbound.py` joins the room as `voice-assistant`.
4. The agent greets the caller and starts the conversation.

## Requirements

- Python 3.11 or newer
- A LiveKit project
- A Vobiz account with SIP access
- An OpenAI API key
- Optional: Deepgram if you want to use the current inbound worker as-is

## Install

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Quick Start

### 1. Create `.env`

```powershell
Copy-Item .env.example .env
```

Minimum outbound values:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

VOBIZ_SIP_DOMAIN=your-live-outbound-trunk.sip.vobiz.ai
VOBIZ_AUTH_ID=your_vobiz_auth_id
VOBIZ_AUTH_TOKEN=your_vobiz_auth_token
VOBIZ_CALLER_ID=+91XXXXXXXXXX

OPENAI_API_KEY=sk-...
AGENT_DEFAULT_LANGUAGE=hi
OPENAI_STT_LANGUAGE=hi
```

### 2. Prepare the outbound trunk

If you already know your LiveKit trunk ID:

```env
OUTBOUND_TRUNK_ID=ST_xxxxxxxxxxxxx
```

Then run:

```powershell
python setup_trunk.py
```

If you leave `OUTBOUND_TRUNK_ID` blank, `agent.py` will try to:

1. use the explicit trunk ID if present
2. match by trunk name
3. match by caller number
4. create or sync a trunk from `.env` if needed

### 3. Start the outbound worker

```powershell
python agent.py start
```

For local debugging:

```powershell
python agent.py dev
```

### 4. Place a call

Single number:

```powershell
python make_call.py +919876543210
```

Alternative form:

```powershell
python make_call.py --to +14155550123
```

Multiple numbers:

```powershell
python make_call.py --to +919876543210,+14155550123
```

Or:

```powershell
python make_call.py --to +919876543210 --to +14155550123
```

Interactive prompt:

```powershell
python make_call.py
```

`DEFAULT_OUTBOUND_TARGET` is only a fallback. The CLI can call any valid E.164 number you pass in.

## Inbound Setup

### 1. Set the inbound number

```env
VOBIZ_INBOUND_NUMBER=+91XXXXXXXXXX
```

### 2. Create the LiveKit inbound trunk and dispatch rule

```powershell
python setup_inbound.py
```

The script prints the LiveKit SIP endpoint that must be configured in Vobiz as the Primary URI.

### 3. Start the inbound worker

```powershell
python agent_inbound.py start
```

### 4. Vobiz-side inbound checklist

- inbound trunk exists and is active
- Primary URI points to `<your-livekit-project>.sip.livekit.cloud`
- inbound number is linked to the app or trunk
- `agent_inbound.py` is running

## Environment Guide

### Required for the standalone outbound agent

| Variable | Required | Notes |
| --- | --- | --- |
| `LIVEKIT_URL` | Yes | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret |
| `VOBIZ_SIP_DOMAIN` | Yes | Actual live Vobiz outbound trunk domain |
| `VOBIZ_AUTH_ID` or `VOBIZ_USERNAME` | Yes | Vobiz SIP username |
| `VOBIZ_AUTH_TOKEN` or `VOBIZ_PASSWORD` | Yes | Vobiz SIP password/token |
| `VOBIZ_CALLER_ID` or `VOBIZ_OUTBOUND_NUMBER` | Yes | Caller ID for the outbound trunk |
| `OPENAI_API_KEY` | Yes | OpenAI key for STT, LLM, and TTS |

### Important optional values

| Variable | Purpose |
| --- | --- |
| `OUTBOUND_TRUNK_ID` | Explicit LiveKit trunk ID (`ST_...`) |
| `VOBIZ_TRUNK_NAME` | Friendly trunk name used for lookup and sync |
| `DEFAULT_OUTBOUND_TARGET` | Fallback target used only if you do not pass a number |
| `DEFAULT_TRANSFER_NUMBER` | Transfer destination used when the caller asks for transfer |
| `AGENT_PERSONA_NAME` | Spoken persona name |
| `AGENT_COMPANY_NAME` | Spoken company name |
| `AGENT_DEFAULT_LANGUAGE` | `hi` or `en` |
| `OUTBOUND_FIRST_MESSAGE` | First message spoken after answer |
| `OPENAI_STT_LANGUAGE` | Recommended: `hi` for Hindi-first, `en` for English-first |

### Backend-only values

If you are only using the standalone root scripts, these can stay unset or placeholder values:

- `MONGODB_*`
- `REDIS_*`
- `AUTH_*`
- `JWT_*`
- `INTERNAL_API_KEY`
- `AWS_*`
- `VITE_API_URL`

## Important Vobiz Notes

- `VOBIZ_SIP_DOMAIN` must be your actual outbound trunk domain from Vobiz.
- Do not put the Vobiz application SIP URI there.
- Do not put the LiveKit SIP URI there.
- If calls fail with SIP `500` or auth retry issues, the most common cause is a wrong trunk domain or stale credentials on the LiveKit side.

## Transfer Behavior

The outbound agent supports SIP REFER transfer.

Default phrases:

- `transfer me`
- `transfer me to a live agent`

Important settings:

```env
TRANSFER_REQUIRE_CONFIRMATION=true
DEFAULT_TRANSFER_NUMBER=+91XXXXXXXXXX
```

The caller can also request a custom destination number during the call.

See `transfer_call.md` for transfer-specific notes.

## Useful Commands

```powershell
python setup_trunk.py
python agent.py start
python make_call.py +919876543210
python make_call.py --to +919876543210 --to +14155550123
python setup_inbound.py
python agent_inbound.py start
```

## Useful Logs

When the system is healthy, you should see logs like:

- `Synced existing outbound trunk from env: ST_...`
- `Call answered! Agent is now listening.`
- `user_input_transcribed final=True language=...`
- `conversation_item_added role=assistant ...`

Those mean:

- the worker connected to LiveKit
- the SIP leg connected
- STT heard the caller
- the assistant generated a reply

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| SIP `500` or auth retry error | Wrong trunk domain or stale Vobiz credentials on the LiveKit trunk | Verify `VOBIZ_SIP_DOMAIN`, `VOBIZ_AUTH_ID`, `VOBIZ_AUTH_TOKEN`, caller ID, then run `python setup_trunk.py` |
| Call rings but never connects | Provider-side routing issue | Check Vobiz routing, number status, and whether your account can call that destination |
| Call connects but the agent says nothing | OpenAI key missing or worker not running correctly | Verify `OPENAI_API_KEY`, run `python agent.py start`, inspect logs |
| Call connects but the agent does not respond after you speak | STT language mismatch or stale worker process | Set `OPENAI_STT_LANGUAGE=hi` or `en`, restart the worker, confirm `user_input_transcribed` appears in logs |
| Wrong number is being called | Fallback env target is being used | Pass a target on the CLI or clear `DEFAULT_OUTBOUND_TARGET` |
| Inbound call does not reach the agent | Inbound trunk or Primary URI is incomplete | Run `python setup_inbound.py`, set the printed SIP endpoint in Vobiz, start `agent_inbound.py` |
| Transfer fails | Missing transfer number or provider restriction | Verify `DEFAULT_TRANSFER_NUMBER`, `VOBIZ_SIP_DOMAIN`, and provider SIP REFER support |
| Some destinations fail on a trial account | Vobiz trial or shared-number restrictions | Test with allowed numbers or upgrade to a dedicated number |

## Project Structure

```text
.
|-- agent.py
|-- agent_inbound.py
|-- make_call.py
|-- setup_trunk.py
|-- setup_inbound.py
|-- transfer_call.md
|-- backend/
|-- frontend/
|-- docs/
`-- scripts/
```

## Related Documentation

- `transfer_call.md` for transfer-specific behavior
- `backend/README.md` for the larger microservices platform

## Current Root-Level Behavior

The standalone root flow in this repository currently:

- resolves and syncs the Vobiz outbound trunk from `.env`
- supports calling arbitrary numbers from the CLI
- speaks first after answer
- captures caller speech through `AgentSession` speech events
- handles Hindi-first conversations and English switching

If you want, this README can also be split into:

- a short landing README
- a dedicated outbound-only guide
- a separate inbound deployment guide
