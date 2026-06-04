import pickle
from pathlib import Path

from django.conf import settings

from apps.accounts.models import UserProfile
from apps.feedback.models import RecommendationFeedback
from apps.foods.models import Food
from apps.recommendations.models import RecommendationItem, RecommendationRun
from apps.rules.models import AssociationRule, FoodSupplementSynergyRule, MinedAssociationRule
from apps.rules.services import normalize_rule_item, supplement_item_variants
from apps.supplements.models import UserSupplement

from .association import AssociationRulesEngine
from .collaborative import CollaborativeArtifacts, build_feature_order, build_user_vector
from .normalizer import clamp, normalize_many, normalize_token, to_float


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
    liked_foods, liked_categories = user_positive_food_context(user)
    bmi_norm = normalize_bmi(bmi) if bmi else 0.5
    return {
        "user_id": user.id,
        "n_sessions": runs + feedback,
        "supplements": list(
            UserSupplement.objects.filter(user=user, active=True).values_list("supplement__slug", flat=True)
        ),
        "goals": profile.goals or ([profile.goal] if profile.goal else []),
        "diet_type": profile.diet_type,
        "dietary_restrictions": dietary,
        "maladies": diseases,
        "allergies": list(profile.allergies.values_list("slug", flat=True)),
        "aliments_exclus": list(user.disliked_foods.values_list("slug", flat=True)),
        "liked_foods": liked_foods,
        "liked_categories": liked_categories,
        "imc": bmi,
        "imc_norm": bmi_norm,
        "bmi_range": bmi_range(bmi),
        "activite": activity,
        "activity_level": profile.activity_level,
        "age": profile.age,
        "age_norm": clamp((profile.age or 0) / 100) if profile.age else 0.0,
        "gender": profile.gender,
        "user_vector": build_reusable_user_vector(
            supplements=list(UserSupplement.objects.filter(user=user, active=True).values_list("supplement__slug", flat=True)),
            goals=profile.goals or ([profile.goal] if profile.goal else []),
            diseases=diseases,
            allergies=list(profile.allergies.values_list("slug", flat=True)),
            disliked_foods=list(user.disliked_foods.values_list("slug", flat=True)),
            bmi_norm=bmi_norm,
            activity=activity,
            age=profile.age,
            gender=profile.gender,
            liked_foods=liked_foods,
        ),
    }


def build_preview_profile(payload: dict) -> dict:
    bmi = to_float(payload.get("imc") or payload.get("bmi"))
    bmi_norm = normalize_bmi(bmi) if bmi else to_float(payload.get("imc_norm"), 0.5)
    return {
        "user_id": payload.get("user_id"),
        "n_sessions": int(payload.get("n_sessions", 0) or 0),
        "supplements": payload.get("supplements", []),
        "goals": payload.get("goals", []),
        "diet_type": payload.get("diet_type") or "none",
        "dietary_restrictions": payload.get("dietary_restrictions", []),
        "maladies": payload.get("maladies") or payload.get("diseases", []),
        "allergies": payload.get("allergies", []),
        "aliments_exclus": payload.get("aliments_exclus") or payload.get("excluded_foods", []),
        "liked_foods": payload.get("liked_foods", []),
        "liked_categories": payload.get("liked_categories", []),
        "imc": bmi,
        "imc_norm": bmi_norm,
        "bmi_range": bmi_range(bmi),
        "activite": to_float(payload.get("activite") or payload.get("activity"), 0.0),
        "activity_level": payload.get("activity_level", ""),
        "age": payload.get("age"),
        "age_norm": clamp(to_float(payload.get("age")) / 100) if payload.get("age") else 0.0,
        "gender": payload.get("gender", ""),
        "user_vector": build_reusable_user_vector(
            supplements=payload.get("supplements", []),
            goals=payload.get("goals", []),
            diseases=payload.get("maladies") or payload.get("diseases", []),
            allergies=payload.get("allergies", []),
            disliked_foods=payload.get("aliments_exclus") or payload.get("excluded_foods", []),
            bmi_norm=bmi_norm,
            activity=to_float(payload.get("activite") or payload.get("activity"), 0.0),
            age=payload.get("age"),
            gender=payload.get("gender", ""),
            liked_foods=payload.get("liked_foods", []),
        ),
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
            "association_rule_items": food.association_rule_items,
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
    positive_types = {"liked", "saved", "tried", "helpful", "already_tried", "good_recommendation"}
    negative_types = {"disliked", "not_interested", "bad_taste", "not_helpful", "too_expensive", "not_available"}
    blocking_types = {"unsafe_for_me", "allergy_issue", "do_not_eat"}
    for feedback in RecommendationFeedback.objects.select_related("recommendation_item__food", "food"):
        user_scores = scores.setdefault(feedback.user_id, {})
        food = feedback.food or feedback.recommendation_item.food
        slug = normalize_token(food.slug)
        value = clamp((feedback.rating or 0) / 5)
        if feedback.feedback_type in blocking_types:
            value = -1.0
        elif feedback.feedback_type in positive_types or feedback.is_helpful:
            value = max(value, 0.7)
        elif feedback.feedback_type in negative_types or not feedback.is_helpful:
            value = -max(0.2, 1 - value)
        if feedback.feedback_type in blocking_types:
            user_scores[slug] = value
        elif value < 0:
            user_scores[slug] = min(user_scores.get(slug, 0.0), value)
        else:
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
                "score": rule.score,
                "explanation": rule.explanation,
                "source": "association_rule",
                "rule_type": "positive_synergy",
            }
        )
    for rule in FoodSupplementSynergyRule.objects.filter(is_active=True, association_type="positive"):
        rules.append(
            {
                "antecedent": normalize_rule_item(rule.supplement_item),
                "consequent": normalize_rule_item(rule.food_item),
                "support": max(min(rule.seed_weight, 1), 0),
                "confidence": max(min(rule.seed_weight, 1), 0),
                "lift": 1 + max(rule.seed_weight, 0),
                "score": max(min(rule.seed_weight, 1), 0),
                "explanation": rule.reason,
                "source": "seed_rule",
                "rule_type": "positive_synergy",
                "rule_seed_id": rule.rule_seed_id,
                "supplement_category": rule.supplement_category_name,
                "nutrient_relation": rule.nutrient_relation,
                "source_url": rule.source_url,
            }
        )
    for rule in (
        MinedAssociationRule.objects.filter(is_active=True)
        .exclude(rule_type__in=["avoid_timing", "medical_caution"])
        .exclude(review_status="rejected")
        .exclude(safety_conflict_status="conflict_blocking")
    ):
        rules.append(
            {
                "antecedent_items": [normalize_rule_item(item) for item in rule.antecedent_items],
                "consequent_items": [normalize_rule_item(item) for item in rule.consequent_items],
                "support": rule.support,
                "confidence": rule.confidence,
                "lift": rule.lift,
                "score": rule.score,
                "explanation": rule.explanation,
                "source": rule.source,
                "rule_type": rule.rule_type,
            }
        )
    return rules


def profile_items(profile: dict) -> set[str]:
    items = set()
    for supplement in profile.get("supplements", []):
        items.update(supplement_item_variants(str(supplement)))
        items.add(f"supplement:{normalize_token(supplement)}")
    for goal in profile.get("goals", []):
        items.add(f"goal:{normalize_token(goal)}")
        items.add(normalize_rule_item(f"goal:{goal}"))
    for disease in profile.get("maladies", []):
        items.add(f"disease:{normalize_token(disease)}")
        items.add(normalize_rule_item(f"condition:{disease}"))
    return items


def merge_rules(primary: list[dict], fallback: list[dict]) -> list[dict]:
    merged = {}
    for rule in fallback + primary:
        key = (
            tuple(rule.get("antecedent_items") or [rule.get("antecedent")]),
            tuple(rule.get("consequent_items") or [rule.get("consequent")]),
        )
        merged[key] = rule
    return list(merged.values())


def normalize_bmi(bmi: float) -> float:
    return clamp((to_float(bmi) - 15) / (40 - 15))


def bmi_range(bmi: float) -> str:
    value = to_float(bmi)
    if not value:
        return "unknown"
    if value < 18.5:
        return "underweight"
    if value < 25:
        return "normal"
    if value < 30:
        return "overweight"
    return "obesity"


def user_positive_food_context(user) -> tuple[list[str], list[str]]:
    positive_types = {"liked", "saved", "tried", "helpful", "already_tried", "good_recommendation"}
    foods = []
    categories = []
    queryset = RecommendationFeedback.objects.filter(user=user, feedback_type__in=positive_types).select_related(
        "food__category",
        "recommendation_item__food__category",
    )
    for feedback in queryset:
        food = feedback.food or feedback.recommendation_item.food
        if food:
            foods.append(food.slug)
            if food.category_id:
                categories.append(food.category.slug)
    return sorted(set(foods)), sorted(set(categories))


def build_reusable_user_vector(
    *,
    supplements,
    goals,
    diseases,
    allergies,
    disliked_foods,
    bmi_norm,
    activity,
    age,
    gender,
    liked_foods,
) -> dict:
    return {
        "supplements": normalize_many(supplements),
        "goals": normalize_many(goals),
        "diseases": normalize_many(diseases),
        "allergies": normalize_many(allergies),
        "disliked_foods": normalize_many(disliked_foods),
        "liked_foods": normalize_many(liked_foods),
        "bmi_norm": round(to_float(bmi_norm, 0.5), 4),
        "activity": round(to_float(activity), 4),
        "age_norm": round(clamp(to_float(age) / 100), 4) if age else 0.0,
        "gender": normalize_token(gender),
    }


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
