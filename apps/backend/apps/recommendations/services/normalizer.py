import re
import unicodedata
from decimal import Decimal


ALIASES = {
    "vitamin_c": "vitamine_c",
    "vitamine_c": "vitamine_c",
    "vitc": "vitamine_c",
    "vitamin-c": "vitamine_c",
    "vitamine-c": "vitamine_c",
    "vitamin_d": "vitamine_d",
    "vitamine_d": "vitamine_d",
    "vitamin-d": "vitamine_d",
    "iron": "fer",
    "fer": "fer",
    "omega_3": "omega3",
    "omega3": "omega3",
    "omega-3": "omega3",
    "healthy-fat": "fat",
    "healthy_fat": "fat",
    "total_lipid_fat": "fat",
    "lipid": "fat",
    "lipids": "fat",
    "fat": "fat",
    "fiber": "fiber",
    "fibers": "fiber",
    "fibre": "fiber",
    "folate": "folate",
    "folates": "folate",
    "folic_acid": "folate",
    "anemia": "anemie",
    "anaemia": "anemie",
    "anemie": "anemie",
    "diabetes": "diabete",
    "diabete": "diabete",
    "diabete_type_2": "diabete",
    "cholesterol": "cardio",
    "hypertension": "cardio",
    "high_blood_pressure": "cardio",
    "obesity": "obesite",
    "obesite": "obesite",
    "weight_loss": "perte_poids",
    "perte_poids": "perte_poids",
    "lose_weight": "perte_poids",
    "weight_gain": "masse_musculaire",
    "improve_energy": "energie",
    "energy": "energie",
    "energie": "energie",
    "general_health": "sante_generale",
    "healthy_lifestyle": "sante_generale",
    "improve_overall_health": "sante_generale",
    "sante_generale": "sante_generale",
    "health": "sante_generale",
    "muscle_gain": "masse_musculaire",
    "mass_gain": "masse_musculaire",
    "masse": "masse_musculaire",
    "magnesium": "magnesium",
    "zinc": "zinc",
    "calcium": "calcium",
    "b12": "vitamine_b12",
    "vitamin_b12": "vitamine_b12",
    "vitamine_b12": "vitamine_b12",
}


def slugify_key(value: object) -> str:
    if value is None:
        return ""
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def normalize_token(value: object) -> str:
    key = slugify_key(value)
    return ALIASES.get(key, key)


def normalize_many(values) -> list[str]:
    return sorted({normalize_token(value) for value in values if normalize_token(value)})


def to_float(value: object, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))
