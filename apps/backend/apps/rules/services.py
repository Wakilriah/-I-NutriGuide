import hashlib
import re
import unicodedata
from functools import lru_cache


def canonical_key(value: object) -> str:
    if value is None:
        return ""
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def split_keywords(value: object) -> list[str]:
    if value is None:
        return []
    return [part.strip() for part in str(value).replace("|", ",").split(",") if part.strip()]


def normalize_rule_item(item: object) -> str:
    if item is None:
        return ""
    raw = str(item).strip()
    if not raw:
        return ""
    if ":" not in raw:
        return canonical_key(raw)
    prefix, value = raw.split(":", 1)
    return f"{canonical_key(prefix)}:{canonical_key(value)}"


def item_variants(item: str) -> set[str]:
    normalized = normalize_rule_item(item)
    if ":" not in normalized:
        return {normalized} if normalized else set()
    prefix, value = normalized.split(":", 1)
    variants = {normalized}
    if "_" in value:
        variants.add(f"{prefix}:{value.replace('_', '-')}")
    if "-" in value:
        variants.add(f"{prefix}:{value.replace('-', '_')}")
    if value.endswith("s"):
        variants.add(f"{prefix}:{value[:-1]}")
    else:
        variants.add(f"{prefix}:{value}s")
    return {variant for variant in variants if variant and not variant.endswith(":")}


def food_item_variants(food) -> set[str]:
    items = set()
    for value in [getattr(food, "slug", ""), getattr(food, "nom", ""), getattr(food, "name", ""), food.get("slug") if isinstance(food, dict) else ""]:
        if value:
            items.update(item_variants(f"food:{value}"))
    extra_items = getattr(food, "association_rule_items", None)
    if isinstance(food, dict):
        extra_items = food.get("association_rule_items")
    for item in extra_items or []:
        normalized = normalize_rule_item(str(item).replace("FOOD_", "food:"))
        if normalized:
            items.update(item_variants(normalized))
    return items


@lru_cache(maxsize=512)
def supplement_item_variants(raw_value: str) -> tuple[str, ...]:
    from .models import SupplementCategory, SupplementNormalization

    key = canonical_key(raw_value)
    values = {key}

    mapping = (
        SupplementNormalization.objects.select_related("category")
        .filter(original_supplement_slug=key, is_active=True)
        .first()
    )
    if mapping:
        values.add(canonical_key(mapping.normalized_category))
        if mapping.category:
            values.add(mapping.category.canonical_item)

    category = (
        SupplementCategory.objects.filter(is_active=True)
        .filter(category__iexact=str(raw_value))
        .first()
        or SupplementCategory.objects.filter(is_active=True, canonical_item__in=values).first()
    )
    if category:
        values.add(category.canonical_item)
        values.add(canonical_key(category.category))

    variants = set()
    for value in values:
        for prefix in ("supp", "supplement"):
            variants.update(item_variants(f"{prefix}:{value}"))
    return tuple(sorted(variants))


def rule_key(antecedent_items: list[str], consequent_items: list[str], *, source: str, rule_type: str) -> str:
    payload = "|".join(
        [
            source,
            rule_type,
            ",".join(sorted(normalize_rule_item(item) for item in antecedent_items)),
            "=>",
            ",".join(sorted(normalize_rule_item(item) for item in consequent_items)),
        ]
    )
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def detect_rule_safety_conflicts(antecedent_items: list[str], consequent_items: list[str]) -> tuple[str, list[dict]]:
    from .models import SafetyConstraint

    antecedents = {normalize_rule_item(item) for item in antecedent_items}
    consequents = {normalize_rule_item(item) for item in consequent_items}
    all_items = antecedents | consequents
    conflicts = []
    for constraint in SafetyConstraint.objects.filter(is_active=True):
        supplement_variants = set(supplement_item_variants(constraint.supplement_category_name))
        target = canonical_key(constraint.avoid_or_review_item)
        supplement_matches = bool(antecedents & supplement_variants)
        target_matches = any(target and (target in item or item.endswith(f":{target}")) for item in all_items)
        if supplement_matches and target_matches:
            conflicts.append(
                {
                    "constraint_id": constraint.id,
                    "constraint_type": constraint.constraint_type,
                    "safety_level": constraint.safety_level,
                    "message": constraint.reason,
                    "matched": constraint.avoid_or_review_item,
                }
            )
    if any(item["safety_level"] == "HIGH" for item in conflicts):
        return "conflict_blocking", conflicts
    if conflicts:
        return "conflict_warning", conflicts
    return "clear", []
