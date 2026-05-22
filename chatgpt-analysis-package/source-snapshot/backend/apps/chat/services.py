import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from difflib import get_close_matches

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from apps.accounts.models import UserProfile
from apps.recommendations.models import DISCLAIMER, RecommendationRun
from apps.recommendations.serializers import RecommendationRunSerializer
from apps.recommendations.services.engine import generate_recommendations

from .models import ChatMessage, ChatSession


RECOMMENDATION_TERMS = {
    "recommend",
    "recommendation",
    "eat",
    "food",
    "meal",
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "pair",
    "pairing",
    "with",
    "supplement",
}
EXPLANATION_TERMS = {"why", "explain", "latest match", "latest recommendation", "reason"}
PROFILE_TERMS = {"allergy", "allergies", "disliked", "avoid", "diet type", "profile", "preference"}
MEDICAL_TERMS = {"diagnose", "cure", "treat", "disease", "dosage", "dose", "medicine", "medication"}
NUTRITION_TERMS = {
    "diet",
    "diets",
    "weight",
    "loss",
    "lose",
    "slim",
    "calorie",
    "calories",
    "protein",
    "healthy",
}
TYPO_ALIASES = {
    "deit": "diet",
    "deits": "diets",
    "dietes": "diets",
    "fo": "for",
    "los": "loss",
    "wight": "weight",
    "weigth": "weight",
    "wannq": "want",
    "wanna": "want",
    "recomend": "recommend",
    "recomnd": "recommend",
    "recomnded": "recommended",
}
INTENT_VOCABULARY = RECOMMENDATION_TERMS | EXPLANATION_TERMS | PROFILE_TERMS | MEDICAL_TERMS | NUTRITION_TERMS


@dataclass(frozen=True)
class GroqResult:
    content: str
    model: str
    token_usage: dict
    error_code: str = ""
    error_message: str = ""


class GroqClient:
    endpoint = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, api_key=None, model=None, timeout=None):
        self.api_key = api_key if api_key is not None else settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL
        self.timeout = timeout or settings.GROQ_TIMEOUT_SECONDS

    def complete(self, messages: list[dict]) -> GroqResult:
        if not self.api_key:
            return GroqResult(content="", model=self.model, token_usage={}, error_code="missing_api_key")

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.35,
            "max_tokens": 650,
        }
        request = urllib.request.Request(
            self.endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "I-NutriGuide/1.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            error_message = _extract_provider_error(exc)
            print(f"Groq API Error ({exc.code}): {error_message}")
            return GroqResult(content="", model=self.model, token_usage={}, error_code=f"http_{exc.code}", error_message=error_message)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return GroqResult(content="", model=self.model, token_usage={}, error_code="provider_unavailable")

        content = body.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        return GroqResult(
            content=content,
            model=body.get("model") or self.model,
            token_usage=body.get("usage") or {},
            error_code="" if content else "empty_response",
        )


def send_chat_message(user, message: str, session_id=None) -> dict:
    if not _allow_chat_request(user.id):
        raise ChatRateLimited("Too many chat messages. Please try again in a minute.")
    if not _allow_daily_chat_request(user.id):
        raise ChatRateLimited("You reached today's chat limit. Your daily chat allowance resets tomorrow.")

    session = _get_or_create_session(user, message, session_id)
    user_message = ChatMessage.objects.create(session=session, role=ChatMessage.Role.USER, content=message)
    intent = classify_intent(message)
    recommendation_run = _recommendation_run_for_intent(user, intent)
    cited_items = _cited_items(recommendation_run)
    profile_context = _profile_context(user)

    groq_result = GroqClient().complete(
        [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "user_message": message,
                        "intent": intent,
                        "profile": profile_context,
                        "cited_recommendations": cited_items,
                        "disclaimer": DISCLAIMER,
                    },
                    ensure_ascii=True,
                ),
            },
        ]
    )
    assistant_text = groq_result.content or _fallback_answer(intent, profile_context, cited_items, groq_result.error_code)
    assistant_message = ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.ASSISTANT,
        content=assistant_text,
        metadata={"intent": intent, "cited_items": cited_items, "provider_error": groq_result.error_message},
        recommendation_run=recommendation_run,
        groq_model=groq_result.model,
        token_usage=groq_result.token_usage,
        error_code=groq_result.error_code,
    )
    ChatSession.objects.filter(id=session.id).update(updated_at=timezone.now())
    return {
        "session": session,
        "user_message": user_message,
        "assistant_message": assistant_message,
        "recommendation_run": recommendation_run,
        "cited_items": cited_items,
    }


class ChatRateLimited(Exception):
    pass


def classify_intent(message: str) -> str:
    text = message.lower()
    tokens = _intent_tokens(text)
    if any(term in text for term in EXPLANATION_TERMS):
        return "explanation"
    if tokens & EXPLANATION_TERMS:
        return "explanation"
    if "avoid" in tokens or "diet type" in text or any(term in text for term in {"allergy", "allergies", "disliked", "profile", "preference"}):
        return "profile"
    if tokens & PROFILE_TERMS:
        return "profile"
    if any(term in text for term in MEDICAL_TERMS) or tokens & MEDICAL_TERMS:
        return "medical_safety"
    if any(term in text for term in RECOMMENDATION_TERMS) or tokens & RECOMMENDATION_TERMS:
        return "recommendation"
    if tokens & NUTRITION_TERMS:
        return "recommendation"
    return "general"


def _intent_tokens(text: str) -> set[str]:
    raw_tokens = ["".join(character for character in token if character.isalnum()) for token in text.split()]
    normalized = set()
    for token in raw_tokens:
        if not token:
            continue
        token = TYPO_ALIASES.get(token, token)
        normalized.add(token)
        close = get_close_matches(token, INTENT_VOCABULARY, n=1, cutoff=0.78)
        if close:
            normalized.add(close[0])
    return normalized


def _allow_chat_request(user_id: int) -> bool:
    limit = settings.CHAT_RATE_LIMIT_PER_MINUTE
    if limit <= 0:
        return True
    key = f"chat:rate:user:{user_id}"
    added = cache.add(key, 1, timeout=60)
    if added:
        return True
    try:
        return cache.incr(key) <= limit
    except ValueError:
        cache.set(key, 1, timeout=60)
        return True


def _allow_daily_chat_request(user_id: int) -> bool:
    limit = settings.CHAT_DAILY_LIMIT_PER_USER
    if limit <= 0:
        return True
    today = timezone.localdate()
    used_today = ChatMessage.objects.filter(
        session__user_id=user_id,
        role=ChatMessage.Role.USER,
        created_at__date=today,
    ).count()
    return used_today < limit


def _get_or_create_session(user, message: str, session_id=None) -> ChatSession:
    if session_id:
        return ChatSession.objects.get(id=session_id, user=user)
    title = message.strip().replace("\n", " ")[:80] or "Nutrition chat"
    return ChatSession.objects.create(user=user, title=title)


def _recommendation_run_for_intent(user, intent: str) -> RecommendationRun | None:
    if intent == "recommendation":
        return generate_recommendations(user, limit=5, source="chat")
    if intent == "explanation":
        return (
            RecommendationRun.objects.filter(user=user)
            .prefetch_related("items__food__category", "items__supplement")
            .order_by("-created_at")
            .first()
        )
    return None


def _cited_items(run: RecommendationRun | None) -> list[dict]:
    if not run:
        return []
    return [
        {
            "id": item.id,
            "rank": item.rank,
            "food": {
                "id": item.food.id,
                "name": item.food.name,
                "slug": item.food.slug,
                "category": item.food.category.name,
            },
            "score": item.score,
            "matched_nutrients": item.matched_nutrients,
            "matched_rules": item.matched_rules,
            "warnings": item.warnings,
            "explanation": item.explanation,
        }
        for item in run.items.select_related("food__category").order_by("rank")[:5]
    ]


from apps.common.neo4j_client import get_neo4j_driver

def _profile_context(user) -> dict:
    profile, _created = UserProfile.objects.get_or_create(user=user)
    context = {
        "goal": profile.goal,
        "activity_level": profile.activity_level,
        "diet_type": profile.diet_type,
        "allergies": list(profile.allergies.values_list("slug", flat=True)),
        "dietary_restrictions": list(profile.dietary_restrictions.values_list("slug", flat=True)),
        "disliked_foods": list(user.disliked_foods.values_list("slug", flat=True)),
        "graph_context": None
    }
    
    driver = get_neo4j_driver()
    if driver:
        try:
            with driver.session() as session:
                query = """
                MATCH (u:User {id: $user_id})
                OPTIONAL MATCH (u)-[:TAKES_SUPPLEMENT]->(s:Supplement)-[:CONTAINS_NUTRIENT]->(n:Nutrient)
                OPTIONAL MATCH (u)-[:ALLERGIC_TO]->(a:Allergen)
                OPTIONAL MATCH (u)-[:DISLIKES]->(f:Food)
                RETURN 
                    collect(DISTINCT s.name + " (provides " + n.name + ")") as supplement_paths,
                    collect(DISTINCT a.name) as allergy_paths,
                    collect(DISTINCT f.name) as dislike_paths
                """
                record = session.run(query, user_id=user.id).single()
                if record:
                    context["graph_context"] = {
                        "supplements_and_nutrients": record["supplement_paths"],
                        "allergies": record["allergy_paths"],
                        "disliked_foods": record["dislike_paths"]
                    }
        except Exception as e:
            print(f"Neo4j RAG error: {e}")
            
    return context


def _system_prompt() -> str:
    return (
        "You are I-NutriGuide's nutrition chat assistant. Use only the provided cited_recommendations for "
        "personalized food recommendations. You may explain general nutrition ideas, but clearly separate them "
        "from personalized recommendations. Respect allergies, diet type, dietary restrictions, disliked foods, "
        "and warnings. If graph_context is provided, use those exact nutrient paths to explain why a supplement "
        "or food is beneficial or dangerous. Do not diagnose, cure, or replace advice from a doctor, pharmacist, "
        "or registered dietitian. Keep answers concise, practical, and friendly."
    )


def _fallback_answer(intent: str, profile: dict, cited_items: list[dict], error_code: str) -> str:
    if cited_items:
        lines = ["Here are the safest matches I can suggest from your recommendation engine right now:"]
        for item in cited_items[:3]:
            nutrients = ", ".join(item["matched_nutrients"][:3]) if item["matched_nutrients"] else "your current profile"
            lines.append(f"- {item['food']['name']}: {item['explanation']} Key match: {nutrients}.")
        lines.append(DISCLAIMER)
        return "\n".join(lines)

    if intent == "profile":
        allergies = ", ".join(profile["allergies"]) or "none saved"
        dislikes = ", ".join(profile["disliked_foods"]) or "none saved"
        return (
            f"Your current profile uses diet type '{profile['diet_type']}', allergies: {allergies}, "
            f"and disliked foods: {dislikes}. You can change those from the Profile screen."
        )

    if intent == "medical_safety":
        return f"I can share general nutrition guidance, but I cannot diagnose or treat conditions. {DISCLAIMER}"

    if error_code == "http_403":
        return (
            "Groq refused this request with HTTP 403, usually because the API key or selected model is not allowed "
            "for the current Groq organization. I can still answer from the app recommendation engine when your "
            "message asks for food, diet, supplement, or weight guidance."
        )

    suffix = f" Provider status: {error_code}." if error_code else ""
    return f"I can help with supplement-aware food ideas once I have recommendation context.{suffix}"


def serialize_recommendation_run(run: RecommendationRun | None):
    if not run:
        return None
    return RecommendationRunSerializer(run).data


def _extract_provider_error(exc: urllib.error.HTTPError) -> str:
    try:
        payload = json.loads(exc.read().decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return ""
    error = payload.get("error")
    if isinstance(error, dict):
        return str(error.get("message") or error.get("code") or "")[:500]
    return str(error or "")[:500]
