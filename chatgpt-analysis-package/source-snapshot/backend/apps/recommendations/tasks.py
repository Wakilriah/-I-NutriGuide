from celery import shared_task


@shared_task
def recommendation_cache_smoke_task():
    return "recommendation-cache-ok"
