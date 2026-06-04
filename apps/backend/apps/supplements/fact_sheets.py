import re

from apps.recommendations.services.normalizer import normalize_token

from .models import SupplementFactSheet


def matching_fact_sheets(
    supplements: list[str],
    *,
    audience: str = SupplementFactSheet.Audience.CONSUMER,
    limit: int = 3,
) -> list[SupplementFactSheet]:
    supplement_tokens = {normalize_token(value) for value in supplements if value}
    if not supplement_tokens:
        return []

    matches = []
    for fact_sheet in SupplementFactSheet.objects.filter(audience=audience).order_by(
        "title"
    ):
        if supplement_tokens & fact_sheet_tokens(fact_sheet):
            matches.append(fact_sheet)
        if len(matches) >= limit:
            break
    return matches


def fact_sheet_tokens(fact_sheet: SupplementFactSheet) -> set[str]:
    values = {
        fact_sheet.title,
        fact_sheet.slug,
        fact_sheet.source_id,
        split_camel_case(fact_sheet.source_id),
    }
    return {normalize_token(value) for value in values if normalize_token(value)}


def excerpt(value: str, max_length: int = 280) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= max_length:
        return text
    return f"{text[: max_length - 1].rstrip()}..."


def split_camel_case(value: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", " ", str(value or "")).replace("Omega3", "Omega 3")
