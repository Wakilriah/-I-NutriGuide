import math
from collections import Counter
from dataclasses import dataclass

from apps.rules.services import food_item_variants, normalize_rule_item, supplement_item_variants

from .normalizer import normalize_token


@dataclass(frozen=True)
class AssociationScore:
    score: float
    matched_rules: list[dict]


class AssociationRulesEngine:
    def __init__(self, rules: list[dict] | None = None):
        self.rules = rules or []
        self._prepared_rules = [self._prepare_rule(rule) for rule in self.rules]
        self._last_profile_key = None
        self._last_profile_antecedents = None
        self.max_lift = max([float(rule.get("lift", 1) or 1) for rule in self.rules] + [1.0001])

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
                        "score": round(confidence * math.log(max(lift, 1.0001)), 4),
                    }
                )
        self.rules = rules
        self._prepared_rules = [self._prepare_rule(rule) for rule in self.rules]
        self._last_profile_key = None
        self._last_profile_antecedents = None
        self.max_lift = max([float(rule.get("lift", 1) or 1) for rule in self.rules] + [1.0001])
        return self

    def score(self, user_profile: dict, food: dict) -> AssociationScore:
        food_tokens = food_item_variants(food)
        food_tokens.add(f"food:{normalize_token(food.get('slug') or food.get('nom'))}")
        food_tokens.add(f"category:{normalize_token(food.get('category'))}")
        food_tokens.update(f"nutrient:{normalize_token(key)}" for key, value in food.items() if isinstance(value, float) and value > 0)
        antecedents = self._profile_antecedents(user_profile)
        best = 0.0
        matched = []
        for rule, rule_antecedents, rule_consequents in self._prepared_rules:
            if not rule_antecedents or not rule_consequents:
                continue
            if not rule_antecedents.issubset(antecedents) or not rule_consequents.intersection(food_tokens):
                continue
            lift = float(rule.get("lift", 1) or 1)
            if lift <= 1:
                continue
            if self.max_lift <= 1:
                score = 0.0
            else:
                score = float(rule.get("confidence", 0) or 0) * (
                    math.log(max(lift, 1.0001)) / math.log(max(self.max_lift, 1.0001))
                )
            score = min(max(score, 0.0), 1.0)
            if score > 0:
                matched.append({**rule, "score": round(score, 4)})
                best = max(best, score)
        return AssociationScore(score=round(best, 4), matched_rules=matched[:5])

    def scores(self, user_profile: dict, foods: list[dict]) -> dict[int, AssociationScore]:
        return {food["id"]: self.score(user_profile, food) for food in foods}

    def _profile_antecedents(self, user_profile: dict) -> set[str]:
        profile_key = (
            tuple(user_profile.get("supplements", [])),
            tuple(user_profile.get("goals", [])),
            tuple(user_profile.get("maladies", [])),
            tuple(user_profile.get("liked_foods", [])),
            tuple(user_profile.get("liked_categories", [])),
            user_profile.get("activite", 0),
        )
        if profile_key == self._last_profile_key and self._last_profile_antecedents is not None:
            return self._last_profile_antecedents
        items = set()
        for supplement in user_profile.get("supplements", []):
            items.update(supplement_item_variants(str(supplement)))
            items.add(f"supplement:{normalize_token(supplement)}")
        for goal in user_profile.get("goals", []):
            items.add(f"goal:{normalize_token(goal)}")
            items.add(normalize_rule_item(f"goal:{goal}"))
        for disease in user_profile.get("maladies", []):
            items.add(f"disease:{normalize_token(disease)}")
            items.add(normalize_rule_item(f"condition:{disease}"))
        for liked_food in user_profile.get("liked_foods", []):
            items.add(f"food:{normalize_token(liked_food)}")
        for category in user_profile.get("liked_categories", []):
            items.add(f"category:{normalize_token(category)}")
        activity = user_profile.get("activite", 0)
        if activity:
            items.add("activity:active" if float(activity) >= 0.5 else "activity:light")
        self._last_profile_key = profile_key
        self._last_profile_antecedents = items
        return items

    def _prepare_rule(self, rule: dict):
        return (
            rule,
            self._items(rule, "antecedent", "antecedents", "antecedent_items"),
            self._items(rule, "consequent", "consequents", "consequent_items"),
        )

    def _items(self, rule: dict, *keys: str) -> set[str]:
        values = []
        for key in keys:
            value = rule.get(key)
            if isinstance(value, list):
                values.extend(value)
            elif value:
                values.append(value)
        normalized = set()
        for value in values:
            normalized_item = normalize_rule_item(value)
            if normalized_item:
                normalized.add(normalized_item)
        return normalized
