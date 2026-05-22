from dataclasses import dataclass

from .normalizer import clamp, normalize_many, normalize_token


GOAL_FOOD_MAP = {
    "energie": ["glucides_complexes", "proteines", "fer_non_heme", "vitamine_b12", "magnesium"],
    "sante_generale": ["fibres", "vitamine_c", "vitamine_d", "calcium", "potassium", "zinc"],
    "perte_poids": ["fibres", "proteines"],
    "masse_musculaire": ["proteines", "magnesium", "zinc"],
}

MEDICAL_BENEFIT_MAP = {
    "anemie": ["fer_non_heme", "fer", "vitamine_c", "folates", "vitamine_b12"],
    "diabete": ["fibres", "glucides_complexes", "magnesium"],
    "cardio": ["fibres", "potassium", "magnesium", "omega3"],
    "obesite": ["fibres", "proteines"],
}

SUPPLEMENT_SYNERGY_MAP = {
    "vitamine_c": ["fer_non_heme", "fer", "folates"],
    "fer": ["vitamine_c", "folates", "proteines"],
    "vitamine_d": ["calcium", "magnesium", "phosphore"],
    "magnesium": ["magnesium", "potassium", "vitamine_b6"],
    "zinc": ["zinc", "proteines"],
    "calcium": ["vitamine_d", "magnesium", "phosphore"],
    "vitamine_b12": ["vitamine_b12", "proteines", "folates"],
    "omega3": ["omega3", "vitamine_e"],
}


@dataclass(frozen=True)
class CBFResult:
    food: dict
    score: float
    objective_score: float
    medical_score: float
    supplement_score: float
    calorie_score: float
    matched_nutrients: list[str]
    safety_notes: list[str]


class ContentBasedFilter:
    def __init__(self, weights: dict[str, float] | None = None):
        self.weights = weights or {"objectif": 0.35, "medical": 0.40, "supplement": 0.15, "calorique": 0.10}

    def score_food(self, user_profile: dict, food: dict) -> CBFResult | None:
        if self._is_excluded(user_profile, food):
            return None

        objective_score, objective_matches = self._score_groups(user_profile.get("goals", []), food, GOAL_FOOD_MAP)
        medical_score, medical_matches = self._score_medical(user_profile, food)
        if medical_score == 0:
            return None
        supplement_score, supplement_matches = self._score_groups(
            user_profile.get("supplements", []),
            food,
            SUPPLEMENT_SYNERGY_MAP,
        )
        calorie_score = self._score_calories(user_profile, food)
        score = (
            self.weights["objectif"] * objective_score
            + self.weights["medical"] * medical_score
            + self.weights["supplement"] * supplement_score
            + self.weights["calorique"] * calorie_score
        )
        matched = sorted(set(objective_matches + medical_matches + supplement_matches))
        return CBFResult(
            food=food,
            score=round(clamp(score), 4),
            objective_score=round(objective_score, 4),
            medical_score=round(medical_score, 4),
            supplement_score=round(supplement_score, 4),
            calorie_score=round(calorie_score, 4),
            matched_nutrients=matched,
            safety_notes=[],
        )

    def get_candidates(self, user_profile: dict, foods: list[dict], threshold: float = 0.05) -> list[CBFResult]:
        candidates = []
        for food in foods:
            result = self.score_food(user_profile, food)
            if result and result.score >= threshold:
                candidates.append(result)
        return sorted(candidates, key=lambda item: item.score, reverse=True)

    def _score_groups(self, labels: list[str], food: dict, mapping: dict[str, list[str]]) -> tuple[float, list[str]]:
        labels = [normalize_token(label) for label in labels]
        nutrients = sorted({nutrient for label in labels for nutrient in mapping.get(label, [])})
        if not nutrients:
            return 0.5, []
        values = [(nutrient, float(food.get(nutrient, 0) or 0)) for nutrient in nutrients]
        matches = [nutrient for nutrient, value in values if value > 0]
        return clamp(sum(value for _nutrient, value in values) / max(len(values), 1)), matches

    def _score_medical(self, user_profile: dict, food: dict) -> tuple[float, list[str]]:
        diseases = [normalize_token(disease) for disease in user_profile.get("maladies", [])]
        if not diseases:
            return 1.0, []
        nutrients = sorted({nutrient for disease in diseases for nutrient in MEDICAL_BENEFIT_MAP.get(disease, [])})
        if not nutrients:
            return 1.0, []
        values = [(nutrient, float(food.get(nutrient, 0) or 0)) for nutrient in nutrients]
        matches = [nutrient for nutrient, value in values if value > 0]
        if not matches:
            return 0.0, []
        return clamp(sum(value for _nutrient, value in values) / max(len(values), 1)), matches

    def _score_calories(self, user_profile: dict, food: dict) -> float:
        kcal = float(food.get("kcal_100g", 0) or 0)
        bmi = float(user_profile.get("imc", 0) or 0)
        activity = float(user_profile.get("activite", 0) or 0)
        goals = set(normalize_many(user_profile.get("goals", [])))
        if "perte_poids" in goals or bmi >= 30:
            return clamp(1 - (kcal / 500))
        if "masse_musculaire" in goals or activity >= 0.7:
            return clamp(kcal / 350)
        return clamp(1 - abs(kcal - 180) / 400)

    def _is_excluded(self, user_profile: dict, food: dict) -> bool:
        food_terms = normalize_many([food.get("nom"), food.get("slug"), food.get("category")])
        food_terms.extend(normalize_many(food.get("allergenes", [])))
        exclusions = normalize_many(user_profile.get("allergies", []) + user_profile.get("aliments_exclus", []))
        return any(exclusion and any(exclusion in term or term in exclusion for term in food_terms) for exclusion in exclusions)
