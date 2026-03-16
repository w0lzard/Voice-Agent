"""Tasks queue package."""
from .celery_app import submit_task, get_task_result

__all__ = ["submit_task", "get_task_result"]
