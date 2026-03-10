# LiveKit + Vobiz Voice Agent

This repository contains a standalone phone agent built on LiveKit SIP, Vobiz telephony, and OpenAI speech models.

The root-level flow is the one described here:

- `agent.py` handles outbound calls
- `make_call.py` dispatches outbound jobs
- `agent_inbound.py` handles inbound calls
- `setup_trunk.py` syncs an existing LiveKit outbound trunk from `.env`
- `setup_inbound.py` creates the LiveKit inbound trunk and dispatch rule

The repo also includes a larger backend/frontend platform under `backend/` and `frontend/`, but you do not need those services to run the standalone agent described in this README.

## What This Agent Does

- Places outbound PSTN calls through Vobiz
- Handles inbound PSTN calls through LiveKit dispatch rules
- Uses OpenAI STT, LLM, and TTS for conversation
- Supports Hindi-first or English-first behavior
- Auto-syncs the LiveKit outbound trunk from `.env` before dialing
- Supports call transfer to a default or spoken destination number
- Lets you call any target number from the CLI

## Call Flow

Outbound flow:

1. `make_call.py` creates a LiveKit dispatch with the target phone number in metadata.
2. `agent.py` joins the room as `outbound-caller`.
3. The agent resolves or updates the outbound SIP trunk using the Vobiz values in `.env`.
4. LiveKit dials the destination over Vobiz.
5. OpenAI STT -> LLM -> TTS drives the conversation.

Inbound flow:

1. Vobiz sends the inbound call to your LiveKit SIP endpoint.
2. LiveKit matches the inbound trunk and dispatch rule.
3. `agent_inbound.py` joins the room as `voice-assistant`.
4. The agent greets the caller and starts the conversation.

## Repository Layout

```text
agent.py           Standalone outbound worker
agent_inbound.py   Standalone inbound worker
make_call.py       CLI dispatcher for outbound calls
setup_trunk.py     Sync an existing LiveKit outbound trunk from .env
setup_inbound.py   Create inbound trunk + dispatch rule in LiveKit
.env.example       Environment template
transfer_call.md   Transfer-specific notes
backend/           Larger microservices platform
frontend/          Dashboard frontend
```

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

## Configure `.env`

Copy the template:

```powershell
Copy-Item .env.example .env
```

### Required for the standalone outbound agent

| Variable | Required | Notes |
| --- | --- | --- |
| `LIVEKIT_URL` | Yes | Your LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret |
| `VOBIZ_SIP_DOMAIN` | Yes | Your live Vobiz outbound trunk domain, for example `xxxx.sip.vobiz.ai` |
| `VOBIZ_AUTH_ID` or `VOBIZ_USERNAME` | Yes | Vobiz SIP username |
| `VOBIZ_AUTH_TOKEN` or `VOBIZ_PASSWORD` | Yes | Vobiz SIP password/token |
| `VOBIZ_CALLER_ID` or `VOBIZ_OUTBOUND_NUMBER` | Yes | Caller ID used by the outbound trunk |
| `OPENAI_API_KEY` | Yes | OpenAI API key for STT/LLM/TTS |

### Important optional values

| Variable | Purpose |
| --- | --- |
| `OUTBOUND_TRUNK_ID` | Explicit LiveKit trunk ID (`ST_...`) if you want deterministic trunk selection |
| `VOBIZ_TRUNK_NAME` | Friendly trunk name used during auto-discovery/sync |
| `DEFAULT_OUTBOUND_TARGET` | Fallback number if you do not pass or type one when running `make_call.py` |
| `DEFAULT_TRANSFER_NUMBER` | Number used when the caller asks for transfer |
| `AGENT_PERSONA_NAME` | Spoken persona name |
| `AGENT_COMPANY_NAME` | Spoken company name |
| `AGENT_DEFAULT_LANGUAGE` | `hi` or `en` |
| `OUTBOUND_FIRST_MESSAGE` | First message spoken after the callee answers |
| `OPENAI_STT_LANGUAGE` | Strongly recommended to set to `hi` for Hindi-first usage or `en` for English-first usage |

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
- If your calls fail with SIP `500` or auth retry issues, the most common cause is a wrong trunk domain or stale trunk credentials.

## Outbound Quick Start

### 1. Prepare or sync the outbound trunk

You have two options:

Option A: Explicit trunk ID

1. Set `OUTBOUND_TRUNK_ID=ST_...` in `.env`
2. Run:

```powershell
python setup_trunk.py
```

Option B: Let the worker auto-resolve the trunk

- Leave `OUTBOUND_TRUNK_ID` blank
- Make sure `VOBIZ_SIP_DOMAIN`, SIP auth, and caller ID are correct
- `agent.py` will try to:
  1. use the explicit trunk ID if present
  2. match by trunk name
  3. match by caller number
  4. create/sync a trunk from `.env` if needed

### 2. Start the outbound worker

```powershell
python agent.py start
```

For local debugging you can also use:

```powershell
python agent.py dev
```

### 3. Dispatch a call

Call a single number:

```powershell
python make_call.py +919876543210
```

Or:

```powershell
python make_call.py --to +14155550123
```

Call multiple numbers:

```powershell
python make_call.py --to +919876543210,+14155550123
```

Or repeat the flag:

```powershell
python make_call.py --to +919876543210 --to +14155550123
```

Prompt for a number interactively:

```powershell
python make_call.py
```

`DEFAULT_OUTBOUND_TARGET` is only a fallback. The CLI can now call any valid E.164 number you pass in.

## Inbound Quick Start

The inbound worker is separate from the outbound worker.

### 1. Set the inbound number

In `.env`:

```env
VOBIZ_INBOUND_NUMBER=+91XXXXXXXXXX
```

### 2. Create the LiveKit inbound trunk and dispatch rule

```powershell
python setup_inbound.py
```

The script prints the LiveKit SIP endpoint you must configure in Vobiz as the Primary URI.

### 3. Start the inbound worker

```powershell
python agent_inbound.py start
```

### 4. Vobiz-side inbound checklist

- Inbound trunk exists and is active
- Primary URI points to `<your-livekit-project>.sip.livekit.cloud`
- The inbound number is linked to the app/trunk
- `agent_inbound.py` is running

## Transfer Behavior

The outbound agent supports transfer through SIP REFER.

Default transfer phrases:

- `transfer me`
- `transfer me to a live agent`

The agent requires confirmation by default. Important settings:

- `TRANSFER_REQUIRE_CONFIRMATION=true`
- `DEFAULT_TRANSFER_NUMBER=+91...`

You can also ask for a custom number in the conversation. See `transfer_call.md` for more detail.

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| SIP `500` or auth retry error | Wrong trunk domain or stale Vobiz credentials on the LiveKit trunk | Verify `VOBIZ_SIP_DOMAIN`, `VOBIZ_AUTH_ID`, `VOBIZ_AUTH_TOKEN`, caller ID, then run `python setup_trunk.py` |
| Call rings but never connects | Provider-side routing issue | Check Vobiz routing, number status, and whether your account can call that destination |
| Call connects but the agent says nothing | OpenAI key missing or worker not running correctly | Verify `OPENAI_API_KEY`, run `python agent.py start`, inspect terminal logs |
| Call connects but the agent does not respond after you speak | STT language mismatch or the old worker is still running | Set `OPENAI_STT_LANGUAGE=hi` or `en`, restart the worker, look for `user_input_transcribed` in logs |
| Wrong number is being called | Fallback env target is being used | Pass a number on the CLI or clear `DEFAULT_OUTBOUND_TARGET` |
| Inbound call does not reach the agent | Inbound trunk or Primary URI is incomplete | Run `python setup_inbound.py`, set the printed SIP endpoint in Vobiz, start `agent_inbound.py` |
| Transfer fails | Missing transfer number or provider restrictions | Verify `DEFAULT_TRANSFER_NUMBER`, `VOBIZ_SIP_DOMAIN`, and provider SIP REFER support |
| Some destinations fail on a trial account | Vobiz trial/shared-number restrictions | Test with allowed numbers or upgrade to a dedicated number |

## Useful Log Lines

When things are working, you should see logs like:

- `Synced existing outbound trunk from env: ST_...`
- `Call answered! Agent is now listening.`
- `user_input_transcribed final=True language=...`
- `conversation_item_added role=assistant ...`

Those lines mean:

- the worker connected to LiveKit
- the SIP leg was established
- STT heard the caller
- the assistant produced a reply

## Commands Reference

```powershell
python setup_trunk.py
python agent.py start
python make_call.py +919876543210
python make_call.py --to +919876543210 --to +14155550123
python setup_inbound.py
python agent_inbound.py start
```

## Related Documents

- `transfer_call.md` - transfer-specific setup and behavior
- `backend/README.md` - larger microservices platform

## Current Behavior Summary

The standalone outbound flow in this repo currently:

- resolves and syncs the Vobiz outbound trunk from `.env`
- supports calling arbitrary numbers from the CLI
- speaks first after answer
- captures caller speech through `AgentSession` speech events
- handles Hindi-first and English-switch conversations

If you want this README extended with deployment steps, Docker usage, or a dedicated inbound-only section, that can be added next.
