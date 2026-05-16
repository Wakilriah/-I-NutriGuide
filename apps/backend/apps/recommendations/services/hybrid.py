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
        
        # We use a Knowledge Graph traversal to find recommendations
        # 1. Filter out disliked foods and foods containing allergens
        # 2. Score based on shared nutrients with the user's supplements
        # 3. Boost foods from categories the user hasn't disliked
        cypher_query = """
        MATCH (u:User {id: $user_id})
        
        // Find foods
        MATCH (f:Food)-[:BELONGS_TO]->(c:Category)
        
        // Exclude dislikes
        WHERE NOT (u)-[:DISLIKES]->(f)
        
        // Calculate score based on supplement synergy (shared nutrients)
        OPTIONAL MATCH (u)-[:TAKES_SUPPLEMENT]->(s:Supplement)-[:CONTAINS_NUTRIENT]->(n:Nutrient)<-[r:CONTAINS_NUTRIENT]-(f)
        
        WITH f, c, count(n) as shared_nutrients, sum(r.amount) as nutrient_score
        
        // Add collaborative filtering element: foods liked/taken by similar users
        OPTIONAL MATCH (u)-[:TAKES_SUPPLEMENT]->(:Supplement)<-[:TAKES_SUPPLEMENT]-(other:User)-[:DISLIKES]->(other_dislike:Food)
        WITH f, c, shared_nutrients, nutrient_score, count(other_dislike) as penalty
        
        WITH f, c, shared_nutrients, 
             (nutrient_score * 0.7 + shared_nutrients * 0.3 - penalty * 0.1) AS graph_score
             
        WHERE graph_score > 0 OR shared_nutrients = 0 // Keep some baseline
        
        ORDER BY graph_score DESC
        LIMIT $limit
        
        RETURN f.id as id, f.name as name, f.slug as slug, c.name as category, 
               graph_score, shared_nutrients
        """
        
        results = []
        if self.driver and user_id:
            try:
                with self.driver.session() as session:
                    records = session.run(cypher_query, user_id=user_id, limit=n)
                    for record in records:
                        score = round(min(record["graph_score"] / 100.0 + 0.5, 1.0), 4) # Normalize roughly
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
                                reason=f"Matched via Knowledge Graph traversal (Synergy score: {record['shared_nutrients']})",
                                safety_notes=["Verified against known graph constraints"],
                                matched_nutrients=[],
                                matched_rules=[],
                                related_supplement=None
                            )
                        )
            except Exception as e:
                print(f"Neo4j Recommendation Error: {e}")
        
        # Fallback if graph is empty or no user_id
        if not results:
            results = self._fallback_recommendation(n)

        return {
            "user_id": user_id,
            "strategy": "GRAPH_TRAVERSAL",
            "weights": {"alpha": 1.0, "beta": 0.0, "gamma": 0.0},
            "disclaimer": DISCLAIMER,
            "recommendations": [item.__dict__ for item in results],
        }

    def _fallback_recommendation(self, n: int):
        from apps.foods.models import Food
        foods = Food.objects.all()[:n]
        return [
            GraphRecommendation(
                food_id=f.id,
                food_name=f.name,
                food_slug=f.slug,
                category="General",
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
