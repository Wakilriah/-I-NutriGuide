import pickle
from pathlib import Path

from django.conf import settings

from apps.accounts.models import UserProfile
from apps.feedback.models import RecommendationFeedback
from apps.foods.models import Food
from apps.recommendations.models import RecommendationItem, RecommendationRun
from apps.rules.models import AssociationRule
from apps.supplements.models import UserSupplement

from .association import AssociationRulesEngine
from .collaborative import CollaborativeArtifacts, build_feature_order, build_user_vector
from .normalizer import clamp, normalize_token, to_float


ARTIFACT_VERSION = 1
ARTIFACT_FILENAME = "hybrid_recommender.pkl"

NUTRIENT_ALIASES = {
    "energy": "kcal_100g",
    "energie": "kcal_100g",
    "eau": "water",
    "water": "water",
    "protein": "proteines",
    "proteins": "proteines",
    "proteines": "proteines",
    "carbohydrate": "glucides_complexes",
    "carbohydrates": "glucides_complexes",
    "glucides": "glucides_complexes",
    "fat": "lipides",
    "lipides": "lipides",
    "fiber": "fibres",
    "fibres": "fibres",
    "fibre": "fibres",
    "iron": "fer",
    "fer": "fer",
    "calcium": "calcium",
    "magnesium": "magnesium",
    "phosphorus": "phosphore",
    "phosphore": "phosphore",
    "potassium": "potassium",
    "sodium": "sodium",
    "zinc": "zinc",
    "vitamin_c": "vitamine_c",
    "vitamine_c": "vitamine_c",
    "vitamin_d": "vitamine_d",
    "vitamine_d": "vitamine_d",
    "vitamin_e": "vitamine_e",
    "vitamine_e": "vitamine_e",
    "vitamin_b6": "vitamine_b6",
    "vitamine_b6": "vitamine_b6",
    "vitamin_b12": "vitamine_b12",
    "vitamine_b12": "vitamine_b12",
    "folate": "folates",
    "folates": "folates",
}

NUTRIENT_CAPS = {
    "proteines": 30,
    "fibres": 15,
    "fer": 8,
    "fer_non_heme": 8,
    "vitamine_c": 90,
    "folates": 400,
    "glucides_complexes": 60,
    "calcium": 1000,
    "magnesium": 400,
    "phosphore": 700,
    "potassium": 3500,
    "zinc": 12,
    "vitamine_d": 20,
    "vitamine_e": 15,
    "vitamine_b6": 2,
    "vitamine_b12": 3,
    "omega3": 2,
}


def artifact_path() -> Path:
    root = Path(getattr(settings, "RECOMMENDER_ARTIFACT_DIR", settings.BASE_DIR / "storage" / "recommender"))
    root.mkdir(parents=True, exist_ok=True)
    return root / ARTIFACT_FILENAME


def save_artifacts(artifacts: dict, path: Path | None = None) -> Path:
    target = path or artifact_path()
    with target.open("wb") as handle:
        pickle.dump(artifacts, handle)
    return target


def load_artifacts(path: Path | None = None) -> dict:
    target = path or artifact_path()
    if not target.exists():
        return empty_artifacts()
    with target.open("rb") as handle:
        artifacts = pickle.load(handle)
    if artifacts.get("version") != ARTIFACT_VERSION:
        return empty_artifacts()
    return artifacts


def empty_artifacts() -> dict:
    return {
        "version": ARTIFACT_VERSION,
        "rules": build_rules_from_database(),
        "cf": CollaborativeArtifacts(user_vectors={}, food_scores={}, feature_order=[]),
        "stats": {"users": 0, "foods": 0, "interactions": 0, "rules": 0},
    }


def train_from_database() -> dict:
    profiles = [build_user_profile(profile.user) for profile in UserProfile.objects.select_related("user")]
    feature_order = build_feature_order(profiles)
    user_vectors = {
        profile["user_id"]: build_user_vector(profile, feature_order)
        for profile in profiles
        if profile.get("user_id") is not None
    }
    food_scores = build_food_interaction_scores()
    transactions = build_transactions()
    rules_engine = AssociationRulesEngine(build_rules_from_database()).fit(transactions)
    rules = merge_rules(rules_engine.rules, build_rules_from_database())
    return {
        "version": ARTIFACT_VERSION,
        "rules": rules,
        "cf": CollaborativeArtifacts(user_vectors=user_vectors, food_scores=food_scores, feature_order=feature_order),
        "stats": {
            "users": len(profiles),
            "foods": Food.objects.filter(is_active=True).count(),
            "interactions": RecommendationItem.objects.count(),
            "rules": len(rules),
        },
    }


def build_user_profile(user) -> dict:
    profile, _created = UserProfile.objects.get_or_create(user=user)
    height_m = to_float(profile.height_cm) / 100 if profile.height_cm else 0
    weight_kg = to_float(profile.weight_kg)
    bmi = to_float(profile.bmi) or (round(weight_kg / (height_m * height_m), 2) if height_m and weight_kg else 0)
    activity = normalize_activity(profile.activity_level)
    dietary = list(profile.dietary_restrictions.values_list("slug", flat=True))
    diseases = profile.health_conditions or [
        value for value in dietary if value in {"anemie", "diabete", "diabetes", "cardio", "obesite"}
    ]
    runs = RecommendationRun.objects.filter(user=user).count()
    feedback = RecommendationFeedback.objects.filter(user=user).count()
    return {
        "user_id": user.id,
        "n_sessions": runs + feedback,
        "supplements": list(
            UserSupplement.objects.filter(user=user, active=True).values_list("supplement__slug", flat=True)
        ),
        "goals": profile.goals or ([profile.goal] if profile.goal else []),
        "maladies": diseases,
        "allergies": list(profile.allergies.values_list("slug", flat=True)),
        "aliments_exclus": list(user.disliked_foods.values_list("slug", flat=True)),
        "imc": bmi,
        "imc_norm": clamp(bmi / 40) if bmi else 0.5,
        "activite": activity,
    }


def build_preview_profile(payload: dict) -> dict:
    bmi = to_float(payload.get("imc") or payload.get("bmi"))
    return {
        "user_id": payload.get("user_id"),
        "n_sessions": int(payload.get("n_sessions", 0) or 0),
        "supplements": payload.get("supplements", []),
        "goals": payload.get("goals", []),
        "maladies": payload.get("maladies") or payload.get("diseases", []),
        "allergies": payload.get("allergies", []),
        "aliments_exclus": payload.get("aliments_exclus") or payload.get("excluded_foods", []),
        "imc": bmi,
        "imc_norm": clamp(bmi / 40) if bmi else to_float(payload.get("imc_norm"), 0.5),
        "activite": to_float(payload.get("activite") or payload.get("activity"), 0.0),
    }


def build_food_database(limit: int | None = None) -> list[dict]:
    queryset = (
        Food.objects.filter(is_active=True)
        .select_related("category")
        .prefetch_related("nutrients__nutrient")
        .order_by("id")
    )
    if limit:
        queryset = queryset[:limit]
    foods = []
    for food in queryset:
        item = {
            "id": food.id,
            "nom": food.name,
            "slug": food.slug,
            "category": food.category.name,
            "source": food.source,
            "allergenes": [],
            "kcal_100g": 0.0,
        }
        for nutrient_link in food.nutrients.all():
            key = normalize_nutrient_key(nutrient_link.nutrient.slug or nutrient_link.nutrient.name)
            raw_value = to_float(nutrient_link.amount)
            if key == "kcal_100g":
                item[key] = raw_value
            elif key:
                item[key] = max(item.get(key, 0.0), normalize_nutrient_amount(key, raw_value))
                if key == "fer":
                    item["fer_non_heme"] = item[key]
        foods.append(item)
    return foods


def build_food_interaction_scores() -> dict[int, dict[str, float]]:
    scores: dict[int, dict[str, float]] = {}
    for item in RecommendationItem.objects.select_related("run__user", "food"):
        user_scores = scores.setdefault(item.run.user_id, {})
        slug = normalize_token(item.food.slug)
        user_scores[slug] = max(user_scores.get(slug, 0.0), clamp(item.score))
    for feedback in RecommendationFeedback.objects.select_related("recommendation_item__food"):
        user_scores = scores.setdefault(feedback.user_id, {})
        slug = normalize_token(feedback.recommendation_item.food.slug)
        value = clamp((feedback.rating or 0) / 5)
        if feedback.is_helpful:
            value = max(value, 0.7)
        else:
            value = min(value, 0.2)
        user_scores[slug] = max(user_scores.get(slug, 0.0), value)
    return scores


def build_transactions() -> list[set[str]]:
    transactions = []
    for run in RecommendationRun.objects.prefetch_related("items__food", "user__supplements__supplement"):
        profile = build_user_profile(run.user)
        items = profile_items(profile)
        for item in run.items.all():
            transaction = set(items)
            transaction.add(f"food:{normalize_token(item.food.slug)}")
            transaction.add(f"category:{normalize_token(item.food.category.slug)}")
            transactions.append(transaction)
    return transactions


def build_rules_from_database() -> list[dict]:
    rules = []
    for rule in AssociationRule.objects.filter(is_active=True):
        rules.append(
            {
                "antecedent": f"{rule.antecedent_type}:{normalize_token(rule.antecedent_slug)}",
                "consequent": f"{rule.consequent_type}:{normalize_token(rule.consequent_slug)}",
                "support": rule.support,
                "confidence": rule.confidence,
                "lift": rule.lift,
                "explanation": rule.explanation,
            }
        )
    return rules


def profile_items(profile: dict) -> set[str]:
    items = set()
    for supplement in profile.get("supplements", []):
        items.add(f"supplement:{normalize_token(supplement)}")
    for goal in profile.get("goals", []):
        items.add(f"goal:{normalize_token(goal)}")
    for disease in profile.get("maladies", []):
        items.add(f"disease:{normalize_token(disease)}")
    return items


def merge_rules(primary: list[dict], fallback: list[dict]) -> list[dict]:
    merged = {}
    for rule in fallback + primary:
        merged[(rule["antecedent"], rule["consequent"])] = rule
    return list(merged.values())


def normalize_activity(value: str) -> float:
    key = normalize_token(value)
    if key in {"high", "active", "very_active", "athlete"}:
        return 1.0
    if key in {"moderate", "medium"}:
        return 0.6
    if key in {"light", "low"}:
        return 0.3
    return 0.0


def normalize_nutrient_key(value: str) -> str:
    key = normalize_token(value)
    return NUTRIENT_ALIASES.get(key, key)


def normalize_nutrient_amount(key: str, value: float) -> float:
    cap = NUTRIENT_CAPS.get(key)
    return clamp(value / cap) if cap else clamp(value)
