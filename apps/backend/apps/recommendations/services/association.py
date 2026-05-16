import math
from collections import Counter
from dataclasses import dataclass

from .normalizer import normalize_token


@dataclass(frozen=True)
class AssociationScore:
    score: float
    matched_rules: list[dict]


class AssociationRulesEngine:
    def __init__(self, rules: list[dict] | None = None):
        self.rules = rules or []

    def fit(
        self,
        transactions: list[set[str]],
        min_support: float = 0.01,
        min_confidence: float = 0.2,
        min_lift: float = 1.2,
    ) -> "AssociationRulesEngine":
        total = max(len(transactions), 1)
        item_counts = Counter(item for transaction in transactions for item in transaction)
        pair_counts = Counter()
        for transaction in transactions:
            for antecedent in transaction:
                for consequent in transaction:
                    if antecedent != consequent and consequent.startswith("food:"):
                        pair_counts[(antecedent, consequent)] += 1

        rules = []
        for (antecedent, consequent), count in pair_counts.items():
            support = count / total
            confidence = count / max(item_counts[antecedent], 1)
            consequent_support = item_counts[consequent] / total
            lift = confidence / max(consequent_support, 0.0001)
            if support >= min_support and confidence >= min_confidence and lift >= min_lift:
                rules.append(
                    {
                        "antecedent": antecedent,
                        "consequent": consequent,
                        "support": round(support, 4),
                        "confidence": round(confidence, 4),
                        "lift": round(lift, 4),
                    }
                )
        self.rules = rules
        return self

    def score(self, user_profile: dict, food: dict) -> AssociationScore:
        food_tokens = {f"food:{normalize_token(food.get('slug') or food.get('nom'))}"}
        food_tokens.add(f"category:{normalize_token(food.get('category'))}")
        food_tokens.update(f"nutrient:{normalize_token(key)}" for key, value in food.items() if isinstance(value, float) and value > 0)
        antecedents = self._profile_antecedents(user_profile)
        best = 0.0
        matched = []
        for rule in self.rules:
            if rule.get("antecedent") not in antecedents or rule.get("consequent") not in food_tokens:
                continue
            raw_score = float(rule.get("confidence", 0)) * math.log(max(float(rule.get("lift", 1)), 1.0001))
            score = min(raw_score, 1.0)
            if score > 0:
                matched.append({**rule, "score": round(score, 4)})
                best = max(best, score)
        return AssociationScore(score=round(best, 4), matched_rules=matched[:5])

    def scores(self, user_profile: dict, foods: list[dict]) -> dict[int, AssociationScore]:
        return {food["id"]: self.score(user_profile, food) for food in foods}

    def _profile_antecedents(self, user_profile: dict) -> set[str]:
        items = set()
        for supplement in user_profile.get("supplements", []):
            items.add(f"supplement:{normalize_token(supplement)}")
        for goal in user_profile.get("goals", []):
            items.add(f"goal:{normalize_token(goal)}")
        for disease in user_profile.get("maladies", []):
            items.add(f"disease:{normalize_token(disease)}")
        activity = user_profile.get("activite", 0)
        if activity:
            items.add("activity:active" if float(activity) >= 0.5 else "activity:light")
        return items
