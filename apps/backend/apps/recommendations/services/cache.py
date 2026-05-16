import hashlib
import json

from django.core.cache import cache


USER_VERSION_KEY = "recommendations:user:{user_id}:version"


def get_user_recommendation_version(user_id):
    version_key = USER_VERSION_KEY.format(user_id=user_id)
    version = cache.get(version_key)
    if version is None:
        version = 1
        cache.set(version_key, version, timeout=None)
    return version


def bump_user_recommendation_version(user_id):
    version_key = USER_VERSION_KEY.format(user_id=user_id)
    version = get_user_recommendation_version(user_id) + 1
    cache.set(version_key, version, timeout=None)
    return version


def make_recommendation_cache_key(user_id, profile_snapshot, supplements_snapshot, limit):
    payload = {
        "profile": profile_snapshot,
        "supplements": supplements_snapshot,
        "limit": limit,
        "version": get_user_recommendation_version(user_id),
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    return f"recommendations:user:{user_id}:{digest}"


def get_cached_recommendations(cache_key):
    return cache.get(cache_key)


def set_cached_recommendations(cache_key, payload, timeout=300):
    cache.set(cache_key, payload, timeout=timeout)

