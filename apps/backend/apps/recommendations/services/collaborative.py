import math
from dataclasses import dataclass

from .normalizer import normalize_token


@dataclass(frozen=True)
class CollaborativeArtifacts:
    user_vectors: dict[int, list[float]]
    food_scores: dict[int, dict[str, float]]
    feature_order: list[str]


class CollaborativeFilter:
    def __init__(self, artifacts: CollaborativeArtifacts | None = None):
        self.artifacts = artifacts or CollaborativeArtifacts(user_vectors={}, food_scores={}, feature_order=[])

    def score(self, user_profile: dict, food: dict) -> float:
        if not self.artifacts.user_vectors:
            return 0.0
        query = build_user_vector(user_profile, self.artifacts.feature_order)
        similarities = []
        for user_id, vector in self.artifacts.user_vectors.items():
            similarity = cosine_similarity(query, vector)
            if similarity > 0:
                similarities.append((user_id, similarity))
        if not similarities:
            return 0.0
        food_slug = normalize_token(food.get("slug") or food.get("nom"))
        weighted_total = 0.0
        weight_sum = 0.0
        for user_id, similarity in sorted(similarities, key=lambda item: item[1], reverse=True)[:10]:
            value = self.artifacts.food_scores.get(user_id, {}).get(food_slug, 0.0)
            if value <= 0:
                continue
            weighted_total += similarity * value
            weight_sum += similarity
        return round(min(weighted_total / weight_sum, 1.0), 4) if weight_sum else 0.0


def build_feature_order(profiles: list[dict]) -> list[str]:
    features = set()
    for profile in profiles:
        for key in ("supplements", "goals", "maladies"):
            for value in profile.get(key, []):
                features.add(f"{key}:{normalize_token(value)}")
    features.update({"numeric:activite", "numeric:imc_norm"})
    return sorted(features)


def build_user_vector(profile: dict, feature_order: list[str]) -> list[float]:
    values = []
    profile_sets = {
        "supplements": {normalize_token(item) for item in profile.get("supplements", [])},
        "goals": {normalize_token(item) for item in profile.get("goals", [])},
        "maladies": {normalize_token(item) for item in profile.get("maladies", [])},
    }
    for feature in feature_order:
        group, value = feature.split(":", 1)
        if group == "numeric" and value == "activite":
            values.append(float(profile.get("activite", 0) or 0))
        elif group == "numeric" and value == "imc_norm":
            values.append(float(profile.get("imc_norm", 0.5) or 0.5))
        else:
            values.append(1.0 if value in profile_sets.get(group, set()) else 0.0)
    return values


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    dot = sum(a * b for a, b in zip(left, right, strict=True))
    norm_left = math.sqrt(sum(a * a for a in left))
    norm_right = math.sqrt(sum(b * b for b in right))
    if norm_left == 0 or norm_right == 0:
        return 0.0
    return dot / (norm_left * norm_right)
