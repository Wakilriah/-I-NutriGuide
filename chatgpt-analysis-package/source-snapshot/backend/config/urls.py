from django.contrib import admin
from django.core.cache import cache
from django.db import connections
from django.db.utils import OperationalError
from django.urls import include, path
from drf_spectacular.utils import extend_schema, inline_serializer
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import serializers, status


health_response = inline_serializer(
    name="HealthCheck",
    fields={
        "status": serializers.CharField(),
        "database": serializers.CharField(),
        "redis": serializers.CharField(),
    },
)


@extend_schema(responses=health_response)
@api_view(["GET"])
def health_check(_request):
    database_status = "ok"
    redis_status = "ok"

    try:
        connections["default"].cursor()
    except OperationalError:
        database_status = "error"

    try:
        cache.set("health-check", "ok", timeout=5)
        if cache.get("health-check") != "ok":
            redis_status = "error"
    except Exception:
        redis_status = "error"

    http_status = status.HTTP_200_OK if database_status == redis_status == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response({"status": "ok" if http_status == status.HTTP_200_OK else "error", "database": database_status, "redis": redis_status}, status=http_status)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health_check, name="health-check"),
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.nutrients.urls")),
    path("api/v1/", include("apps.foods.urls")),
    path("api/v1/", include("apps.supplements.urls")),
    path("api/v1/", include("apps.rules.urls")),
    path("api/v1/", include("apps.recommendations.urls")),
    path("api/v1/", include("apps.feedback.urls")),
    path("api/v1/", include("apps.analytics.urls")),
    path("api/v1/", include("apps.chat.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
