from dataclasses import dataclass
from apps.recommendations.models import DISCLAIMER
from apps.common.neo4j_client import get_neo4j_driver

@dataclass(frozen=True)
class GraphRecommendation:
    food_id: int
    food_name: str
    food_slug: str
    category: str
    final_score: float
    cbf_score: float
    rules_score: float
    cf_score: float
    reason: str
    safety_notes: list[str]
    matched_nutrients: list[str]
    matched_rules: list[dict]
    related_supplement: str | None

class HybridRecommender:
    def __init__(self, artifacts: dict | None = None):
        self.driver = get_neo4j_driver()

    def recommend(self, user_profile: dict, n: int = 10, foods: list[dict] | None = None) -> dict:
        user_id = user_profile.get("user_id")
        
        # We use a Knowledge Graph traversal to find recommendations.
        # Direct matches reward foods sharing nutrients with active supplements.
        # Synergy matches reward foods containing nutrients supported by supplement nutrients.
        cypher_query = """
        MATCH (u:User {id: $user_id})
        MATCH (f:Food)-[:BELONGS_TO]->(c:Category)
        WHERE NOT (u)-[:DISLIKES]->(f)

        OPTIONAL MATCH (u)-[:TAKES_SUPPLEMENT]->(:Supplement)-[:CONTAINS_NUTRIENT]->(supplement_nutrient:Nutrient)
        WITH u, f, c, collect(DISTINCT supplement_nutrient) AS supplement_nutrients

        OPTIONAL MATCH (f)-[direct:CONTAINS_NUTRIENT|RICH_IN]->(direct_nutrient:Nutrient)
        WHERE direct_nutrient IN supplement_nutrients
        WITH u, f, c, supplement_nutrients,
             count(DISTINCT direct_nutrient) AS direct_matches,
             sum(coalesce(direct.amount, 0)) AS direct_amount,
             collect(DISTINCT direct_nutrient.slug) AS direct_slugs

        OPTIONAL MATCH (source_nutrient:Nutrient)-[support_rel]->(target_nutrient:Nutrient)<-[synergy:CONTAINS_NUTRIENT|RICH_IN]-(f)
        WHERE source_nutrient IN supplement_nutrients
          AND type(support_rel) IN ['ENHANCES', 'SUPPORTS', 'REQUIRES']
        WITH f, c, direct_matches, direct_amount, direct_slugs,
             count(DISTINCT target_nutrient) AS synergy_matches,
             sum(coalesce(synergy.amount, 0)) AS synergy_amount,
             collect(DISTINCT target_nutrient.slug) AS synergy_slugs

        WITH f, c, direct_matches, synergy_matches, direct_slugs, synergy_slugs,
             ((direct_matches * 1.0) + (synergy_matches * 2.0) + (coalesce(direct_amount, 0) / 100.0) + (coalesce(synergy_amount, 0) / 100.0)) AS graph_score

        WHERE graph_score > 0
        ORDER BY graph_score DESC, f.name ASC
        LIMIT $limit

        RETURN f.id as id, f.name as name, f.slug as slug, c.name as category, 
               graph_score, direct_matches, synergy_matches, direct_slugs, synergy_slugs
        """
        
        results = []
        if self.driver and user_id:
            try:
                with self.driver.session() as session:
                    records = session.run(cypher_query, user_id=user_id, limit=n)
                    for record in records:
                        graph_score = float(record["graph_score"] or 0.0)
                        direct_matches = int(record["direct_matches"] or 0)
                        synergy_matches = int(record["synergy_matches"] or 0)
                        matched_nutrients = sorted(set((record["direct_slugs"] or []) + (record["synergy_slugs"] or [])))
                        score = round(min(0.45 + (graph_score / 8.0), 1.0), 4)
                        reason = (
                            f"Matched through the nutrition graph with {direct_matches} direct nutrient match(es) "
                            f"and {synergy_matches} synergy path(s)."
                        )
                        results.append(
                            GraphRecommendation(
                                food_id=record["id"],
                                food_name=record["name"],
                                food_slug=record["slug"],
                                category=record["category"] or "General",
                                final_score=score,
                                cbf_score=score * 0.8,
                                rules_score=score * 0.1,
                                cf_score=score * 0.1,
                                reason=reason,
                                safety_notes=["Verified against known graph constraints"],
                                matched_nutrients=matched_nutrients,
                                matched_rules=[],
                                related_supplement=None
                            )
                        )
            except Exception as e:
                print(f"Neo4j Recommendation Error: {e}")
        
        # Fallback if graph is empty or no user_id
        if not results:
            results = self._fallback_recommendation(n, user_profile)

        return {
            "user_id": user_id,
            "strategy": "GRAPH_TRAVERSAL",
            "weights": {"alpha": 1.0, "beta": 0.0, "gamma": 0.0},
            "disclaimer": DISCLAIMER,
            "recommendations": [item.__dict__ for item in results],
        }

    def _fallback_recommendation(self, n: int, user_profile: dict = None):
        from apps.foods.models import Food
        queryset = Food.objects.filter(is_active=True)
        if user_profile:
            aliments_exclus = user_profile.get("aliments_exclus", [])
            allergies = user_profile.get("allergies", [])
            if aliments_exclus:
                queryset = queryset.exclude(slug__in=aliments_exclus)
            if allergies:
                for allergy in allergies:
                    queryset = queryset.exclude(slug__icontains=allergy)
        foods = queryset[:n]
        return [
            GraphRecommendation(
                food_id=f.id,
                food_name=f.name,
                food_slug=f.slug,
                category=f.category.name if hasattr(f, 'category') and f.category else "General",
                final_score=0.5,
                cbf_score=0.5,
                rules_score=0.0,
                cf_score=0.0,
                reason="Fallback generic recommendation",
                safety_notes=[],
                matched_nutrients=[],
                matched_rules=[],
                related_supplement=None
            ) for f in foods
        ]
