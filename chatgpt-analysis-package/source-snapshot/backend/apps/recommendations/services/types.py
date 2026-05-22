from dataclasses import dataclass


@dataclass
class ScoredFood:
    food: object
    supplement: object | None
    score: float
    nutrient_score: float
    rule_score: float
    preference_score: float
    matched_nutrients: list[str]
    matched_rules: list[dict]
    warnings: list[str]
    tags: list[str]
    explanation: str

