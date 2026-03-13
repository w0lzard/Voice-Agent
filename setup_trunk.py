import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from livekit import api


def load_environment() -> None:
    root_dir = Path(__file__).resolve().parent
    for env_path in (root_dir / "backend" / ".env.local", root_dir / ".env.local", root_dir / ".env"):
        if env_path.exists():
            load_dotenv(env_path, override=True)


load_environment()


def _normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    phone = value.strip().replace(" ", "").replace("-", "")
    if not phone:
        return None
    return phone if phone.startswith("+") else f"+{phone}"


def _is_trunk_id(value: str | None) -> bool:
    return bool(value and value.startswith("ST_"))


async def _resolve_outbound_trunk_id(sip) -> str | None:
    configured = (os.getenv("OUTBOUND_TRUNK_ID") or "").strip() or None
    if _is_trunk_id(configured):
        return configured

    address = os.getenv("VOBIZ_SIP_DOMAIN", "").replace("sip:", "").strip()
    number = _normalize_phone(os.getenv("VOBIZ_CALLER_ID") or os.getenv("VOBIZ_OUTBOUND_NUMBER"))
    trunk_name = (os.getenv("VOBIZ_TRUNK_NAME") or "").strip()

    trunks = await sip.list_outbound_trunk(api.ListSIPOutboundTrunkRequest())
    if configured:
        for trunk in trunks.items:
            if trunk.sip_trunk_id == configured or trunk.name == configured:
                return trunk.sip_trunk_id

    if trunk_name:
        for trunk in trunks.items:
            if trunk.name == trunk_name:
                return trunk.sip_trunk_id

    for trunk in trunks.items:
        matches_address = bool(address and getattr(trunk, "address", "") == address)
        matches_number = bool(number and number in getattr(trunk, "numbers", []))
        if matches_address or matches_number:
            return trunk.sip_trunk_id

    return None


async def main() -> None:
    lkapi = api.LiveKitAPI()
    sip = lkapi.sip

    trunk_id = await _resolve_outbound_trunk_id(sip)
    address = os.getenv("VOBIZ_SIP_DOMAIN", "").replace("sip:", "").strip()
    username = os.getenv("VOBIZ_AUTH_ID") or os.getenv("VOBIZ_USERNAME")
    password = os.getenv("VOBIZ_AUTH_TOKEN") or os.getenv("VOBIZ_PASSWORD")
    number = _normalize_phone(os.getenv("VOBIZ_CALLER_ID") or os.getenv("VOBIZ_OUTBOUND_NUMBER"))

    if not trunk_id:
        print("Error: No outbound trunk could be resolved from OUTBOUND_TRUNK_ID, VOBIZ_TRUNK_NAME, address, or caller number.")
        return

    required = {
        "VOBIZ_SIP_DOMAIN": address,
        "VOBIZ_AUTH_ID/VOBIZ_USERNAME": username,
        "VOBIZ_AUTH_TOKEN/VOBIZ_PASSWORD": password,
        "VOBIZ_CALLER_ID/VOBIZ_OUTBOUND_NUMBER": number,
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        print(f"Error: Missing required values: {', '.join(missing)}")
        print("Please update your env file and run setup_trunk.py again.")
        return

    print(f"Updating SIP Trunk: {trunk_id}")
    print(f"  Address: {address}")
    print(f"  Username: {username}")
    print(f"  Numbers: [{number}]")

    try:
        await sip.update_outbound_trunk_fields(
            trunk_id,
            address=address,
            auth_username=username,
            auth_password=password,
            numbers=[number] if number else [],
        )
        print("\nOK: SIP trunk updated successfully.")
        print("Retry the call next. If it still returns SIP 500, the issue is on the provider/routing side.")
    except Exception as exc:
        print(f"\nError: Failed to update trunk: {exc}")
    finally:
        await lkapi.aclose()


if __name__ == "__main__":
    asyncio.run(main())
