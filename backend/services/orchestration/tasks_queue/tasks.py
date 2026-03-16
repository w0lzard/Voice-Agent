"""
Campaign execution tasks — plain async functions (Celery removed).
Called via submit_task() from celery_app module.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any

logger = logging.getLogger("queue.tasks")


async def make_single_call(call_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a single outbound call.

    Args:
        call_data: {phone_number, assistant_id, campaign_id, contact_index}
    Returns:
        {success, call_id, phone_number, status}  or  {success: False, error}
    """
    from services.analytics.call_service import CallService
    from shared.database.models import CreateCallRequest

    phone_number = call_data.get("phone_number")
    assistant_id = call_data.get("assistant_id")
    campaign_id = call_data.get("campaign_id")
    contact_index = call_data.get("contact_index", 0)

    logger.info("Making call to %s (campaign: %s)", phone_number, campaign_id)

    try:
        request = CreateCallRequest(
            phone_number=phone_number,
            assistant_id=assistant_id,
            metadata={"campaign_id": campaign_id, "contact_index": contact_index},
        )
        call = await CallService.create_call(request)
        logger.info("Call created: %s", call.call_id)
        return {
            "success": True,
            "call_id": call.call_id,
            "phone_number": phone_number,
            "status": call.status.value,
        }
    except Exception as exc:
        logger.error("Call to %s failed: %s", phone_number, exc)
        return {"success": False, "phone_number": phone_number, "error": str(exc)}


async def execute_campaign(campaign_id: str) -> Dict[str, Any]:
    """
    Execute a campaign by processing all pending contacts in concurrent batches.

    Args:
        campaign_id: Campaign to execute
    Returns:
        {success, campaign_id, total_calls, successful, failed}
    """
    from services.orchestration.campaign_service import CampaignService
    from shared.database.connection import get_database

    logger.info("[Campaign %s] Starting execution", campaign_id)

    campaign = await CampaignService.get_campaign(campaign_id)
    if not campaign:
        logger.error("Campaign %s not found", campaign_id)
        return {"success": False, "error": "Campaign not found"}

    pending_contacts = [
        (i, c) for i, c in enumerate(campaign.contacts) if c.status == "pending"
    ]

    if not pending_contacts:
        logger.info("[Campaign %s] No pending contacts", campaign_id)
        return {"success": True, "message": "No pending contacts"}

    max_concurrent = campaign.max_concurrent_calls or 2
    logger.info(
        "[Campaign %s] Processing %d contacts, max concurrent: %d",
        campaign_id, len(pending_contacts), max_concurrent,
    )

    import asyncio

    batch_results = []
    for batch_start in range(0, len(pending_contacts), max_concurrent):
        batch = pending_contacts[batch_start : batch_start + max_concurrent]
        coros = [
            make_single_call(
                {
                    "phone_number": contact.phone_number,
                    "assistant_id": campaign.assistant_id,
                    "campaign_id": campaign_id,
                    "contact_index": contact_index,
                }
            )
            for contact_index, contact in batch
        ]
        results = await asyncio.gather(*coros, return_exceptions=False)
        batch_results.extend(results)
        logger.info("[Campaign %s] Batch done: %d calls", campaign_id, len(results))

    # Mark campaign completed
    db = get_database()
    await db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {
            "$set": {
                "status": "completed",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    total = len(batch_results)
    successful = sum(1 for r in batch_results if r.get("success"))
    logger.info(
        "[Campaign %s] Execution complete: %d/%d successful",
        campaign_id, successful, total,
    )
    return {
        "success": True,
        "campaign_id": campaign_id,
        "total_calls": total,
        "successful": successful,
        "failed": total - successful,
    }


async def health_check() -> Dict[str, Any]:
    """Simple health check."""
    from datetime import datetime, timezone
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}
