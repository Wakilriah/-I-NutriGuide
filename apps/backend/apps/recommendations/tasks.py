from celery import shared_task

from apps.accounts.models import NotificationLog
from apps.accounts.tasks import send_user_push
from django.contrib.auth import get_user_model

from .serializers import RecommendationRunSerializer
from .services.cache import set_cached_recommendations
from .services.engine import generate_recommendations, get_recommendation_cache_key
from .services.training import save_artifacts, train_from_database


@shared_task
def recommendation_cache_smoke_task():
    return "recommendation-cache-ok"


@shared_task
def generate_recommendations_for_user(user_id, limit=10):
    user = get_user_model().objects.get(pk=user_id)
    run = generate_recommendations(user, limit=limit)
    payload = RecommendationRunSerializer(run).data
    set_cached_recommendations(get_recommendation_cache_key(user, limit), payload)
    send_user_push(
        user,
        title="Recommendations ready",
        body=f"Your new nutrition plan has {len(run.items.all())} food suggestions.",
        data={"url": f"inutriguide://tabs/recommendation-detail/{run.id}", "run_id": str(run.id)},
        notification_type=NotificationLog.NotificationType.RECOMMENDATION_READY,
    )
    return str(run.id)


@shared_task
def refresh_recommendation_artifacts():
    artifacts = train_from_database()
    path = save_artifacts(artifacts)
    return {"path": str(path), "stats": artifacts.get("stats", {})}


@shared_task
def recalculate_user_vectors():
    artifacts = train_from_database()
    path = save_artifacts(artifacts)
    return {"path": str(path), "users": artifacts.get("stats", {}).get("users", 0)}
