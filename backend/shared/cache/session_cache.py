"""
Session cache stub — Redis removed.
All methods are no-ops that return None so callers work unchanged.
"""
from typing import Optional, Any, List, Dict


class SessionCache:
    """No-op session cache (Redis removed)."""

    @classmethod
    async def connect(cls) -> None:
        pass

    @classmethod
    async def disconnect(cls) -> None:
        pass

    @classmethod
    async def get(cls, key: str) -> Optional[Dict]:
        return None

    @classmethod
    async def set(cls, key: str, value: Any, ttl: int = 300) -> None:
        pass

    @classmethod
    async def delete(cls, key: str) -> None:
        pass

    @classmethod
    async def delete_pattern(cls, pattern: str) -> None:
        pass

    @classmethod
    async def preload_session(cls, user_id: str, workspace_id: str, user_data: dict, workspace_data: dict = None) -> None:
        pass

    @classmethod
    async def invalidate_session(cls, user_id: str) -> None:
        pass

    @classmethod
    async def get_user_profile(cls, user_id: str) -> Optional[Dict]:
        return None

    @classmethod
    async def cache_user_profile(cls, user_id: str, data: dict) -> None:
        pass

    @classmethod
    async def get_workspace(cls, user_id: str) -> Optional[Dict]:
        return None

    @classmethod
    async def get_assistants(cls, workspace_id: str) -> Optional[List[Dict]]:
        return None

    @classmethod
    async def cache_assistants(cls, workspace_id: str, assistants: List[Dict]) -> None:
        pass

    @classmethod
    async def invalidate_assistants(cls, workspace_id: str) -> None:
        pass

    @classmethod
    async def get_assistant(cls, assistant_id: str) -> Optional[Dict]:
        return None

    @classmethod
    async def cache_assistant(cls, assistant_id: str, data: dict) -> None:
        pass

    @classmethod
    async def invalidate_assistant(cls, assistant_id: str, workspace_id: str = None) -> None:
        pass

    @classmethod
    async def get_phones(cls, workspace_id: str) -> Optional[List[Dict]]:
        return None

    @classmethod
    async def cache_phones(cls, workspace_id: str, phones: List[Dict]) -> None:
        pass

    @classmethod
    async def invalidate_phones(cls, workspace_id: str) -> None:
        pass

    @classmethod
    async def get_sip_configs(cls, workspace_id: str) -> Optional[List[Dict]]:
        return None

    @classmethod
    async def cache_sip_configs(cls, workspace_id: str, sip_configs: List[Dict]) -> None:
        pass

    @classmethod
    async def invalidate_sip(cls, workspace_id: str) -> None:
        pass

    @classmethod
    async def get_tools(cls, workspace_id: str) -> Optional[List[Dict]]:
        return None

    @classmethod
    async def cache_tools(cls, workspace_id: str, tools: List[Dict]) -> None:
        pass

    @classmethod
    async def invalidate_tools(cls, workspace_id: str) -> None:
        pass

    @classmethod
    async def get_recent_calls(cls, workspace_id: str) -> Optional[List[Dict]]:
        return None

    @classmethod
    async def cache_recent_calls(cls, workspace_id: str, calls: List[Dict]) -> None:
        pass

    @classmethod
    async def invalidate_calls(cls, workspace_id: str) -> None:
        pass

    @classmethod
    async def get_call(cls, call_id: str) -> Optional[Dict]:
        return None

    @classmethod
    async def cache_call(cls, call_id: str, data: dict) -> None:
        pass

    @classmethod
    async def invalidate_call(cls, call_id: str, workspace_id: str = None) -> None:
        pass

    @classmethod
    async def get_campaigns(cls, workspace_id: str) -> Optional[List[Dict]]:
        return None

    @classmethod
    async def cache_campaigns(cls, workspace_id: str, campaigns: List[Dict]) -> None:
        pass

    @classmethod
    async def invalidate_campaigns(cls, workspace_id: str) -> None:
        pass
