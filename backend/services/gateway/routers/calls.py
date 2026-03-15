"""Calls API endpoints — handled directly by the gateway (no separate analytics service)."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from shared.database.models import CreateCallRequest, CallStatus, CallResponse
from shared.auth.dependencies import get_current_user, get_current_user_optional
from shared.auth.models import User
from services.analytics.call_service import CallService

logger = logging.getLogger("api.calls")
router = APIRouter()


@router.post("/calls")
async def create_call(
    request: CreateCallRequest,
    user: User = Depends(get_current_user),
):
    """Create a new outbound call and dispatch the agent."""
    call = await CallService.create_call(request, user.workspace_id if user else None)
    return CallResponse.from_call_record(call)


@router.get("/calls")
async def list_calls(
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0,
    user: User = Depends(get_current_user),
):
    """List calls."""
    calls = await CallService.list_calls(
        workspace_id=user.workspace_id if user else None,
        status=CallStatus(status) if status else None,
        limit=limit,
        skip=skip,
    )
    return {"calls": [CallResponse.from_call_record(c) for c in calls], "count": len(calls)}


@router.get("/calls/{call_id}")
async def get_call(call_id: str, user: User = Depends(get_current_user)):
    """Get a specific call."""
    call = await CallService.get_call(call_id, user.workspace_id if user else None)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return CallResponse.from_call_record(call)


@router.get("/calls/{call_id}/analysis")
async def get_call_analysis(call_id: str, user: User = Depends(get_current_user)):
    """Get post-call analysis."""
    call = await CallService.get_call(call_id, user.workspace_id if user else None)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call.analysis or {}


@router.post("/calls/{call_id}/analyze")
async def trigger_analysis(call_id: str, user: User = Depends(get_current_user)):
    """Trigger post-call analysis."""
    from services.analytics.analysis_service import AnalysisService
    analysis = await AnalysisService.analyze_call(call_id)
    if not analysis:
        raise HTTPException(status_code=400, detail="Analysis failed")
    return analysis


@router.get("/analytics/calls")
async def get_call_analytics(user: User = Depends(get_current_user)):
    """Get call analytics summary."""
    from shared.database.connection import get_database
    db = get_database()
    pipeline = []
    if user and user.workspace_id:
        pipeline.append({"$match": {"workspace_id": user.workspace_id}})
    pipeline.extend([
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "avg_duration": {"$avg": "$duration_seconds"}}}
    ])
    cursor = db.calls.aggregate(pipeline)
    stats = {}
    async for doc in cursor:
        stats[doc["_id"]] = {"count": doc["count"], "avg_duration": doc.get("avg_duration", 0)}
    return stats


@router.get("/analytics/summary")
async def get_analytics_summary(user: User = Depends(get_current_user)):
    """Get analytics summary."""
    from shared.database.connection import get_database
    db = get_database()
    query = {}
    if user and user.workspace_id:
        query["workspace_id"] = user.workspace_id
    total = await db.calls.count_documents(query)
    completed = await db.calls.count_documents({**query, "status": "completed"})
    return {
        "total_calls": total,
        "completed_calls": completed,
        "success_rate": round(completed / total * 100, 1) if total > 0 else 0,
    }
