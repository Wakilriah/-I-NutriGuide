import json
import re
import time
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.etree import ElementTree

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from apps.supplements.models import SupplementDataImportCheckpoint, SupplementFactSheet


ODS_API_URL = "https://ods.od.nih.gov/api/index.aspx"
ODS_SOURCE = "NIH ODS"
USER_AGENT = "I-NutriGuide ODS fact sheet import (admin@matchcesoir.pro)"

DEFAULT_RESOURCES = [
    ("Vitamin A", "VitaminA"),
    ("Vitamin B6", "VitaminB6"),
    ("Vitamin B12", "VitaminB12"),
    ("Vitamin C", "VitaminC"),
    ("Vitamin D", "VitaminD"),
    ("Vitamin E", "VitaminE"),
    ("Vitamin K", "VitaminK"),
    ("Calcium", "Calcium"),
    ("Iron", "Iron"),
    ("Magnesium", "Magnesium"),
    ("Zinc", "Zinc"),
    ("Folate", "Folate"),
    ("Iodine", "Iodine"),
    ("Selenium", "Selenium"),
    ("Omega-3 Fatty Acids", "Omega3FattyAcids"),
    ("Multivitamin/mineral Supplements", "MultivitaminMineral"),
    ("Probiotics", "Probiotics"),
    ("Biotin", "Biotin"),
    ("Choline", "Choline"),
    ("Chromium", "Chromium"),
    ("Copper", "Copper"),
    ("Niacin", "Niacin"),
    ("Riboflavin", "Riboflavin"),
    ("Thiamin", "Thiamin"),
    ("Potassium", "Potassium"),
]


AUDIENCE_TO_READING_LEVEL = {
    SupplementFactSheet.Audience.CONSUMER: "Consumer",
    SupplementFactSheet.Audience.HEALTH_PROFESSIONAL: "Health Professional",
}


@dataclass(frozen=True)
class ParsedFactSheet:
    title: str
    source_id: str
    audience: str
    url: str
    sections: dict[str, str]
    raw_data: dict


class Command(BaseCommand):
    help = "Import NIH ODS supplement fact sheets for explanations, safety notes, and interaction text."

    def add_arguments(self, parser):
        parser.add_argument(
            "--resource-name",
            action="append",
            dest="resource_names",
            help="ODS resourcename value, for example VitaminC. Can be repeated.",
        )
        parser.add_argument(
            "--audience",
            choices=["consumer", "health_professional", "both"],
            default="consumer",
            help="ODS reading level to import.",
        )
        parser.add_argument(
            "--input-dir",
            help="Import downloaded ODS XML/HTML/JSON files instead of calling the API.",
        )
        parser.add_argument("--limit", type=int, default=None)
        parser.add_argument(
            "--allow-stubs",
            action="store_true",
            help="Store title and official URL when the ODS site blocks runtime access.",
        )
        parser.add_argument("--sync-neo4j", action="store_true")

    def handle(self, *args, **options):
        checkpoint, _ = SupplementDataImportCheckpoint.objects.get_or_create(
            source="NIH ODS fact sheets",
            defaults={"status": "pending"},
        )
        checkpoint.status = "running"
        checkpoint.save(update_fields=["status", "updated_at"])

        imported = 0
        skipped = 0
        try:
            if options["input_dir"]:
                imported, skipped = self._import_from_dir(Path(options["input_dir"]))
            else:
                imported, skipped = self._import_from_api(
                    options["resource_names"],
                    options["audience"],
                    options["limit"],
                    options["allow_stubs"],
                )
        except Exception:
            checkpoint.status = "failed"
            checkpoint.metadata = {"imported": imported, "skipped": skipped}
            checkpoint.save(update_fields=["status", "metadata", "updated_at"])
            raise

        checkpoint.cursor = imported
        checkpoint.total_count = imported + skipped
        checkpoint.status = "completed"
        checkpoint.metadata = {"imported": imported, "skipped": skipped}
        checkpoint.save(
            update_fields=["cursor", "total_count", "status", "metadata", "updated_at"]
        )

        if options["sync_neo4j"]:
            call_command("sync_to_neo4j")

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported NIH ODS fact sheets: {imported} imported, {skipped} skipped."
            )
        )

    def _import_from_api(self, resource_names, audience, limit, allow_stubs):
        resources = self._resources(resource_names)
        if limit:
            resources = resources[:limit]

        audiences = (
            [
                SupplementFactSheet.Audience.CONSUMER,
                SupplementFactSheet.Audience.HEALTH_PROFESSIONAL,
            ]
            if audience == "both"
            else [audience]
        )

        imported = 0
        skipped = 0
        for title, source_id in resources:
            for fact_audience in audiences:
                url = self._api_url(source_id, fact_audience)
                try:
                    content = self._fetch(url)
                    parsed = self._parse_content(
                        content=content,
                        source_id=source_id,
                        audience=fact_audience,
                        url=url,
                        fallback_title=title,
                    )
                    self._upsert(parsed)
                    imported += 1
                except (HTTPError, URLError, TimeoutError, ElementTree.ParseError) as exc:
                    if allow_stubs:
                        self._upsert_stub(title, source_id, fact_audience, url, exc)
                        imported += 1
                    else:
                        skipped += 1
                        self.stderr.write(f"Skipped ODS {source_id} ({fact_audience}): {exc}")
                time.sleep(0.25)
        return imported, skipped

    def _import_from_dir(self, input_dir: Path):
        if not input_dir.exists():
            raise CommandError(f"Input directory does not exist: {input_dir}")

        imported = 0
        skipped = 0
        files = sorted(
            path
            for path in input_dir.iterdir()
            if path.suffix.lower() in {".xml", ".html", ".htm", ".json"}
        )
        for path in files:
            try:
                source_id, audience = self._source_from_filename(path)
                parsed = self._parse_content(
                    content=path.read_text(encoding="utf-8"),
                    source_id=source_id,
                    audience=audience,
                    url=self._api_url(source_id, audience),
                    fallback_title=self._pretty_resource_name(source_id),
                )
                self._upsert(parsed)
                imported += 1
            except Exception as exc:
                skipped += 1
                self.stderr.write(f"Skipped ODS file {path.name}: {exc}")
        return imported, skipped

    def _resources(self, requested):
        known = {source_id.lower(): (title, source_id) for title, source_id in DEFAULT_RESOURCES}
        if not requested:
            return DEFAULT_RESOURCES
        resources = []
        for value in requested:
            key = value.lower()
            resources.append(known.get(key, (self._pretty_resource_name(value), value)))
        return resources

    def _api_url(self, source_id, audience):
        params = urlencode(
            {
                "outputformat": "XML",
                "readinglevel": AUDIENCE_TO_READING_LEVEL[audience],
                "resourcename": source_id,
            }
        )
        return f"{ODS_API_URL}?{params}"

    def _fetch(self, url):
        request = Request(
            url,
            headers={
                "Accept": "application/xml,text/xml,text/html,application/json",
                "User-Agent": USER_AGENT,
            },
        )
        with urlopen(request, timeout=45) as response:
            return response.read().decode("utf-8", errors="replace")

    def _parse_content(self, *, content, source_id, audience, url, fallback_title):
        stripped = content.lstrip()
        if stripped.startswith("{"):
            return self._parse_json(content, source_id, audience, url, fallback_title)
        if stripped.startswith("<") and not stripped.lower().startswith("<!doctype html"):
            try:
                return self._parse_xml(content, source_id, audience, url, fallback_title)
            except ElementTree.ParseError:
                return self._parse_html(content, source_id, audience, url, fallback_title)
        return self._parse_html(content, source_id, audience, url, fallback_title)

    def _parse_json(self, content, source_id, audience, url, fallback_title):
        payload = json.loads(content)
        sections = extract_sections_from_json(payload)
        title = first_value(payload, ["title", "name", "factSheetTitle"]) or fallback_title
        return ParsedFactSheet(
            title=clean_text(title),
            source_id=source_id,
            audience=audience,
            url=url,
            sections=sections,
            raw_data=payload,
        )

    def _parse_xml(self, content, source_id, audience, url, fallback_title):
        root = ElementTree.fromstring(content)
        title = first_xml_text(root, {"title", "name", "factsheettitle"}) or fallback_title
        sections = extract_sections_from_xml(root)
        return ParsedFactSheet(
            title=clean_text(title),
            source_id=source_id,
            audience=audience,
            url=url,
            sections=sections,
            raw_data={"root": tag_name(root), "section_count": len(sections)},
        )

    def _parse_html(self, content, source_id, audience, url, fallback_title):
        parser = FactSheetHTMLParser()
        parser.feed(content)
        return ParsedFactSheet(
            title=clean_text(parser.title or fallback_title),
            source_id=source_id,
            audience=audience,
            url=url,
            sections=parser.sections(),
            raw_data={"format": "html", "section_count": len(parser.sections())},
        )

    def _upsert(self, parsed: ParsedFactSheet):
        sections = normalize_sections(parsed.sections)
        field_values = classify_sections(sections)
        slug = slugify(f"nih-ods-{parsed.title}-{parsed.audience}")[:180]
        SupplementFactSheet.objects.update_or_create(
            source=ODS_SOURCE,
            source_id=parsed.source_id,
            audience=parsed.audience,
            defaults={
                "title": parsed.title[:255],
                "slug": slug,
                "url": parsed.url,
                "description": field_values["description"],
                "benefits": field_values["benefits"],
                "safety": field_values["safety"],
                "interactions": field_values["interactions"],
                "recommended_intake": field_values["recommended_intake"],
                "deficiency": field_values["deficiency"],
                "food_sources": field_values["food_sources"],
                "raw_sections": sections,
                "raw_data": parsed.raw_data,
            },
        )

    def _upsert_stub(self, title, source_id, audience, url, exc):
        slug = slugify(f"nih-ods-{title}-{audience}")[:180]
        SupplementFactSheet.objects.update_or_create(
            source=ODS_SOURCE,
            source_id=source_id,
            audience=audience,
            defaults={
                "title": title[:255],
                "slug": slug,
                "url": url,
                "description": "",
                "benefits": "",
                "safety": "",
                "interactions": "",
                "recommended_intake": "",
                "deficiency": "",
                "food_sources": "",
                "raw_sections": {},
                "raw_data": {
                    "status": "stub",
                    "message": (
                        "The official NIH ODS endpoint could not be reached from "
                        "this runtime. Re-run without --allow-stubs where the ODS "
                        "API is accessible, or pass downloaded XML/HTML files with --input-dir."
                    ),
                    "error": str(exc),
                },
            },
        )

    def _source_from_filename(self, path):
        name = path.stem
        audience = SupplementFactSheet.Audience.CONSUMER
        if re.search(r"health[-_ ]?professional|hp", name, re.IGNORECASE):
            audience = SupplementFactSheet.Audience.HEALTH_PROFESSIONAL
        source_id = re.sub(
            r"[-_ ]?(consumer|health[-_ ]?professional|hp)$",
            "",
            name,
            flags=re.IGNORECASE,
        )
        source_id = re.sub(r"[^A-Za-z0-9]+", "", source_id)
        if not source_id:
            raise CommandError(f"Could not infer ODS resource name from {path.name}")
        return source_id, audience

    def _pretty_resource_name(self, value):
        spaced = re.sub(r"(?<!^)(?=[A-Z])", " ", str(value or ""))
        spaced = spaced.replace("Omega3", "Omega-3")
        return clean_text(spaced) or str(value)


class FactSheetHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self._capture_tag = None
        self._capture_parts = []
        self._current_heading = None
        self._current_parts = []
        self.title = ""
        self._sections = {}

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in {"h1", "h2", "h3"}:
            self._flush_section()
            self._capture_tag = tag
            self._capture_parts = []
        elif tag in {"p", "li", "td", "th"}:
            self._current_parts.append(" ")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == self._capture_tag:
            heading = clean_text(" ".join(self._capture_parts))
            if tag == "h1" and not self.title:
                self.title = heading
            if tag in {"h2", "h3"}:
                self._current_heading = heading
            self._capture_tag = None
            self._capture_parts = []

    def handle_data(self, data):
        if self._capture_tag:
            self._capture_parts.append(data)
        elif self._current_heading:
            self._current_parts.append(data)

    def close(self):
        self._flush_section()
        super().close()

    def sections(self):
        self._flush_section()
        return dict(self._sections)

    def _flush_section(self):
        if not self._current_heading:
            return
        text = clean_text(" ".join(self._current_parts))
        if text:
            self._sections[self._current_heading] = text
        self._current_parts = []


def extract_sections_from_xml(root):
    sections = {}
    for element in root.iter():
        heading = child_heading(element)
        if not heading:
            continue
        text = clean_text(" ".join(element.itertext()))
        if len(text) <= len(heading) + 25:
            continue
        text = clean_text(text.replace(heading, "", 1))
        if text:
            sections[heading] = text
    if sections:
        return sections

    for child in list(root):
        heading = tag_name(child).replace("_", " ").title()
        text = clean_text(" ".join(child.itertext()))
        if text:
            sections[heading] = text
    return sections


def extract_sections_from_json(payload):
    sections = {}

    def visit(value, heading=None):
        if isinstance(value, dict):
            next_heading = (
                first_value(value, ["heading", "header", "title", "name"]) or heading
            )
            text = first_value(value, ["text", "content", "body", "html"])
            if next_heading and text:
                sections[clean_text(next_heading)] = clean_text(text)
            for child in value.values():
                visit(child, next_heading)
        elif isinstance(value, list):
            for child in value:
                visit(child, heading)

    visit(payload)
    return sections


def child_heading(element):
    for child in list(element):
        if tag_name(child) in {"title", "heading", "header", "name", "sectiontitle"}:
            text = clean_text(" ".join(child.itertext()))
            if text:
                return text
    return ""


def first_xml_text(root, candidates):
    for element in root.iter():
        if tag_name(element) in candidates:
            text = clean_text(" ".join(element.itertext()))
            if text:
                return text
    return ""


def first_value(payload, keys):
    if not isinstance(payload, dict):
        return ""
    lower_map = {str(key).lower(): value for key, value in payload.items()}
    for key in keys:
        value = lower_map.get(key.lower())
        if value:
            return value
    return ""


def normalize_sections(sections):
    normalized = {}
    for heading, text in sections.items():
        clean_heading = clean_text(heading)
        clean_body = clean_text(text)
        if clean_heading and clean_body:
            normalized[clean_heading] = clean_body
    return normalized


def classify_sections(sections):
    values = {
        "description": "",
        "benefits": "",
        "safety": "",
        "interactions": "",
        "recommended_intake": "",
        "deficiency": "",
        "food_sources": "",
    }
    for heading, text in sections.items():
        key = normalize_heading(heading)
        if not values["description"] and (
            "what_is" in key or key == "introduction" or "what_does" in key
        ):
            values["description"] = text
        if not values["recommended_intake"] and (
            "how_much" in key or "recommended_intake" in key or "recommended_intakes" in key
        ):
            values["recommended_intake"] = text
        if not values["food_sources"] and (
            "what_foods" in key or "sources" in key or "food" in key
        ):
            values["food_sources"] = text
        if not values["deficiency"] and (
            "deficiency" in key or "inadequacy" in key or "dont_get_enough" in key
        ):
            values["deficiency"] = text
        if not values["benefits"] and (
            "effects" in key or ("health" in key and "risks" not in key and "harmful" not in key)
        ):
            values["benefits"] = text
        if not values["safety"] and (
            "harmful" in key or "health_risks" in key or "excessive" in key
        ):
            values["safety"] = text
        if not values["interactions"] and (
            "interact" in key or "medications" in key or "dietary_supplements" in key
        ):
            values["interactions"] = text

    if not values["description"] and sections:
        values["description"] = next(iter(sections.values()))
    return values


def normalize_heading(value):
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").lower()).strip("_")


def tag_name(element):
    return str(element.tag).split("}", 1)[-1].lower()


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()
