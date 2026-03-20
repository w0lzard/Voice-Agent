import argparse
import asyncio
import json
import os
import random
from pathlib import Path

from dotenv import load_dotenv
from livekit import api


def load_environment() -> None:
    """Load env files with project-local values taking precedence."""
    root_dir = Path(__file__).resolve().parent.parent
    for env_path in (root_dir / "backend" / ".env.local", root_dir / ".env.local", root_dir / ".env"):
        if env_path.exists():
            load_dotenv(env_path, override=True)


def _is_valid_phone_number(value: str) -> bool:
    if not value.startswith("+"):
        return False
    digits = value[1:]
    return digits.isdigit() and len(digits) >= 8


def _normalize_targets(args: argparse.Namespace) -> list[str]:
    cli_targets: list[str] = []

    if args.phone_number:
        cli_targets.append(args.phone_number.strip())

    for item in args.to or []:
        for target in item.split(","):
            cleaned = target.strip()
            if cleaned:
                cli_targets.append(cleaned)

    if cli_targets:
        return cli_targets

    env_default = os.getenv("DEFAULT_OUTBOUND_TARGET", "").strip()
    prompt = "Target phone number in E.164 format (for example +919876543210)"
    if env_default:
        prompt = f"{prompt} [{env_default}]"
    prompt = f"{prompt}: "

    entered = input(prompt).strip()
    if entered:
        return [entered]
    if env_default:
        return [env_default]
    return []


async def _dispatch_call(lk_api: api.LiveKitAPI, phone_number: str) -> None:
    room_name = f"call-{phone_number.replace('+', '')}-{random.randint(1000, 9999)}"
    print(f"Initiating call to {phone_number}...")
    print(f"Session Room: {room_name}")

    dispatch_request = api.CreateAgentDispatchRequest(
        agent_name="outbound-caller",
        room=room_name,
        metadata=json.dumps({"phone_number": phone_number}),
    )
    dispatch = await lk_api.agent_dispatch.create_dispatch(dispatch_request)

    print("Call dispatched successfully.")
    print(f"Dispatch ID: {dispatch.id}")
    print("-" * 40)


load_environment()


async def main() -> None:
    parser = argparse.ArgumentParser(description="Make outbound calls via the standalone LiveKit agent.")
    parser.add_argument("phone_number", nargs="?", help="Target phone number in E.164 format (e.g. +91...).")
    parser.add_argument(
        "--to",
        action="append",
        help="Target phone number in E.164 format. Repeat or pass comma-separated values to dispatch multiple calls.",
    )
    args = parser.parse_args()

    targets = _normalize_targets(args)
    if not targets:
        print("Error: No target number provided.")
        return

    invalid = [target for target in targets if not _is_valid_phone_number(target)]
    if invalid:
        print("Error: These phone numbers are invalid E.164 values:")
        for target in invalid:
            print(f"  - {target}")
        return

    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    if not (url and api_key and api_secret):
        print("Error: LiveKit credentials missing in .env/.env.local")
        return

    lk_api = api.LiveKitAPI(url=url, api_key=api_key, api_secret=api_secret)
    try:
        for index, phone_number in enumerate(targets, start=1):
            if len(targets) > 1:
                print(f"\n[{index}/{len(targets)}]")
            try:
                await _dispatch_call(lk_api, phone_number)
            except Exception as e:
                print(f"Error dispatching call to {phone_number}: {e}")
    finally:
        await lk_api.aclose()


if __name__ == "__main__":
    asyncio.run(main())
