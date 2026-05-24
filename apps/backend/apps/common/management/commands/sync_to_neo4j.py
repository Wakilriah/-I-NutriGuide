from django.core.management.base import BaseCommand

from apps.accounts.models import (
    Allergy,
    DietaryRestriction,
    DislikedFood,
    User,
    UserProfile,
)
from apps.common.neo4j_client import get_neo4j_driver
from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient, NutrientInteraction
from apps.recommendations.services.normalizer import normalize_token
from apps.supplements.models import (
    Supplement,
    SupplementIngredient,
    SupplementIngredientGroup,
    SupplementNutrient,
    SupplementResearchEstimate,
    UserSupplement,
)


RICH_IN_THRESHOLDS = {
    "calcium": 100,
    "fiber": 3,
    "iron": 2,
    "magnesium": 50,
    "potassium": 300,
    "protein": 10,
    "vitamin-b12": 1,
    "vitamin-c": 30,
    "vitamin-d": 2,
    "zinc": 2,
}

RELATIONSHIP_TYPES = {
    NutrientInteraction.InteractionType.ENHANCES: "ENHANCES",
    NutrientInteraction.InteractionType.INHIBITS: "INHIBITS",
    NutrientInteraction.InteractionType.REQUIRES: "REQUIRES",
    NutrientInteraction.InteractionType.SHOULD_NOT_COMBINE: "SHOULD_NOT_COMBINE",
    NutrientInteraction.InteractionType.SUPPORTS: "SUPPORTS",
    NutrientInteraction.InteractionType.COMPETES_WITH: "COMPETES_WITH",
}

NEO4J_BATCH_SIZE = 5000


class Command(BaseCommand):
    help = "Sync data from PostgreSQL to Neo4j"

    def handle(self, *args, **options):
        driver = get_neo4j_driver()
        with driver.session() as session:
            self.stdout.write("Creating constraints and indexes...")
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Category) REQUIRE c.id IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (f:Food) REQUIRE f.id IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Nutrient) REQUIRE n.id IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Supplement) REQUIRE s.id IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (i:SupplementIngredient) REQUIRE i.key IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (g:IngredientGroup) REQUIRE g.key IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (e:ResearchEstimate) REQUIRE e.id IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (a:Allergen) REQUIRE a.id IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (d:DietaryRestriction) REQUIRE d.id IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (k:KnowledgeEntity) REQUIRE (k.type, k.key) IS UNIQUE"
            )
            session.run("CREATE INDEX IF NOT EXISTS FOR (f:Food) ON (f.slug)")
            session.run("CREATE INDEX IF NOT EXISTS FOR (f:Food) ON (f.normalized_key)")
            session.run("CREATE INDEX IF NOT EXISTS FOR (n:Nutrient) ON (n.slug)")
            session.run(
                "CREATE INDEX IF NOT EXISTS FOR (n:Nutrient) ON (n.normalized_key)"
            )
            session.run("CREATE INDEX IF NOT EXISTS FOR (s:Supplement) ON (s.slug)")
            session.run(
                "CREATE INDEX IF NOT EXISTS FOR (s:Supplement) ON (s.normalized_key)"
            )
            session.run(
                "CREATE INDEX IF NOT EXISTS FOR (i:SupplementIngredient) ON (i.normalized_key)"
            )
            session.run(
                "CREATE INDEX IF NOT EXISTS FOR (g:IngredientGroup) ON (g.normalized_key)"
            )

            self._sync_categories(session)
            self._sync_foods(session)
            self._sync_nutrients(session)
            self._sync_food_nutrients(session)
            self._sync_supplements(session)
            self._sync_supplement_nutrients(session)
            self._sync_supplement_ingredient_groups(session)
            self._sync_supplement_ingredients(session)
            self._sync_research_estimates(session)
            self._sync_interactions(session)
            self._sync_allergies_and_restrictions(session)
            self._sync_users(session)
            self._sync_user_preferences(session)
            self._sync_user_supplements(session)

        self.stdout.write(self.style.SUCCESS("Successfully synced to Neo4j"))

    def _sync_categories(self, session):
        self.stdout.write("Syncing FoodCategories...")
        cat_data = [
            {"id": c.id, "name": c.name, "slug": c.slug}
            for c in FoodCategory.objects.all()
        ]
        if cat_data:
            session.run(
                "UNWIND $batch AS row MERGE (c:Category {id: row.id}) SET c.name=row.name, c.slug=row.slug",
                batch=cat_data,
            )

    def _sync_foods(self, session):
        self.stdout.write("Syncing Foods...")
        food_data = [
            {
                "id": f.id,
                "name": f.name,
                "slug": f.slug,
                "source": f.source,
                "normalized_key": normalize_token(f.slug),
                "c_id": f.category_id,
            }
            for f in Food.objects.filter(is_active=True)
        ]
        if food_data:
            session.run(
                "UNWIND $batch AS row "
                "MERGE (f:Food {id: row.id}) "
                "SET f.name=row.name, f.slug=row.slug, f.source=row.source, f.normalized_key=row.normalized_key "
                "WITH f, row MATCH (c:Category {id: row.c_id}) MERGE (f)-[:BELONGS_TO]->(c)",
                batch=food_data,
            )

    def _sync_nutrients(self, session):
        self.stdout.write("Syncing Nutrients...")
        nut_data = [
            {
                "id": n.id,
                "name": n.name,
                "slug": n.slug,
                "unit": n.unit,
                "normalized_key": normalize_token(n.slug),
            }
            for n in Nutrient.objects.filter(is_active=True)
        ]
        if nut_data:
            session.run(
                "UNWIND $batch AS row "
                "MERGE (n:Nutrient {id: row.id}) "
                "SET n.name=row.name, n.slug=row.slug, n.unit=row.unit, n.normalized_key=row.normalized_key",
                batch=nut_data,
            )

    def _sync_food_nutrients(self, session):
        self.stdout.write("Syncing FoodNutrients...")
        fn_data = []
        rich_data = []
        for fn in FoodNutrient.objects.select_related("nutrient", "food").filter(
            food__is_active=True
        ):
            amount = float(fn.amount)
            row = {
                "f_id": fn.food_id,
                "n_id": fn.nutrient_id,
                "amount": amount,
                "unit": fn.unit,
            }
            fn_data.append(row)
            if self._is_rich_in(fn.nutrient.slug, amount):
                rich_data.append(row)
        if fn_data:
            session.run(
                "UNWIND $batch AS row MATCH (f:Food {id: row.f_id}), (n:Nutrient {id: row.n_id}) "
                "MERGE (f)-[r:CONTAINS_NUTRIENT]->(n) SET r.amount=row.amount, r.unit=row.unit",
                batch=fn_data,
            )
        if rich_data:
            session.run(
                "UNWIND $batch AS row MATCH (f:Food {id: row.f_id}), (n:Nutrient {id: row.n_id}) "
                "MERGE (f)-[r:RICH_IN]->(n) SET r.amount=row.amount, r.unit=row.unit",
                batch=rich_data,
            )

    def _sync_supplements(self, session):
        self.stdout.write("Syncing Supplements...")
        query = (
            "UNWIND $batch AS row "
            "MERGE (s:Supplement {id: row.id}) "
            "SET s.name=row.name, s.slug=row.slug, s.normalized_key=row.normalized_key"
        )
        self._run_in_batches(
            session,
            query,
            (
                {
                    "id": s.id,
                    "name": s.name,
                    "slug": s.slug,
                    "normalized_key": normalize_token(s.slug),
                }
                for s in Supplement.objects.filter(is_active=True).iterator(
                    chunk_size=NEO4J_BATCH_SIZE
                )
            ),
        )

    def _sync_supplement_nutrients(self, session):
        self.stdout.write("Syncing SupplementNutrients...")
        sn_data = [
            {
                "s_id": sn.supplement_id,
                "n_id": sn.nutrient_id,
                "amount": float(sn.amount),
                "unit": sn.unit,
            }
            for sn in SupplementNutrient.objects.filter(
                amount__isnull=False,
                supplement__is_active=True,
                nutrient__is_active=True,
            )
        ]
        if sn_data:
            session.run(
                "UNWIND $batch AS row MATCH (s:Supplement {id: row.s_id}), (n:Nutrient {id: row.n_id}) "
                "MERGE (s)-[r:CONTAINS_NUTRIENT]->(n) SET r.amount=row.amount, r.unit=row.unit",
                batch=sn_data,
            )

    def _sync_supplement_ingredient_groups(self, session):
        self.stdout.write("Syncing SupplementIngredientGroups...")
        group_data = [
            {
                "key": normalize_token(group.name),
                "normalized_key": normalize_token(group.name),
                "name": group.name,
                "source": group.source,
                "source_id": group.source_id,
                "categories": group.categories,
                "fact_sheet_count": len(group.fact_sheets or []),
            }
            for group in SupplementIngredientGroup.objects.all()
        ]
        if group_data:
            session.run(
                "UNWIND $batch AS row "
                "MERGE (g:IngredientGroup {key: row.key}) "
                "SET g.normalized_key=row.normalized_key, g.name=row.name, g.source=row.source, "
                "g.source_id=row.source_id, g.categories=row.categories, g.fact_sheet_count=row.fact_sheet_count",
                batch=group_data,
            )

    def _sync_supplement_ingredients(self, session):
        self.stdout.write("Syncing SupplementIngredients...")
        ingredient_query = (
            "UNWIND $batch AS row "
            "MERGE (i:SupplementIngredient {key: row.key}) "
            "SET i.normalized_key=row.normalized_key, i.name=row.name, i.ingredient_group=row.ingredient_group, "
            "i.category=row.category, i.source=row.source "
            "WITH i, row MATCH (s:Supplement {id: row.s_id}) "
            "MERGE (s)-[r:CONTAINS_INGREDIENT]->(i) "
            "SET r.source_id=row.source_id, r.amount=row.amount, r.unit=row.unit, r.is_other_ingredient=row.is_other_ingredient"
        )
        group_query = (
            "UNWIND $batch AS row "
            "MATCH (i:SupplementIngredient {key: row.key}) "
            "MATCH (g:IngredientGroup {key: row.key}) "
            "MERGE (i)-[:IN_GROUP]->(g)"
        )
        nutrient_query = (
            "UNWIND $batch AS row "
            "MATCH (i:SupplementIngredient {key: row.key}) "
            "MATCH (n:Nutrient {normalized_key: row.normalized_key}) "
            "MERGE (i)-[:MAPS_TO_NUTRIENT]->(n)"
        )
        batch = []
        synced = 0
        queryset = SupplementIngredient.objects.select_related("supplement").filter(
            supplement__is_active=True
        )
        for ingredient in queryset.iterator(chunk_size=NEO4J_BATCH_SIZE):
            key = normalize_token(ingredient.ingredient_group or ingredient.name)
            if not key:
                continue
            batch.append(
                {
                    "s_id": ingredient.supplement_id,
                    "key": key,
                    "normalized_key": key,
                    "name": ingredient.name,
                    "ingredient_group": ingredient.ingredient_group,
                    "category": ingredient.category,
                    "source": ingredient.source,
                    "source_id": ingredient.source_id,
                    "amount": (
                        float(ingredient.amount)
                        if ingredient.amount is not None
                        else None
                    ),
                    "unit": ingredient.unit,
                    "is_other_ingredient": ingredient.is_other_ingredient,
                }
            )
            if len(batch) >= NEO4J_BATCH_SIZE:
                self._sync_ingredient_batch(
                    session, ingredient_query, group_query, nutrient_query, batch
                )
                synced += len(batch)
                self.stdout.write(f"Synced {synced} SupplementIngredient rows...")
                batch = []
        if batch:
            self._sync_ingredient_batch(
                session, ingredient_query, group_query, nutrient_query, batch
            )
            synced += len(batch)
            self.stdout.write(f"Synced {synced} SupplementIngredient rows...")

    def _sync_ingredient_batch(
        self, session, ingredient_query, group_query, nutrient_query, batch
    ):
        session.run(ingredient_query, batch=batch)
        session.run(group_query, batch=batch)
        session.run(nutrient_query, batch=batch)

    def _run_in_batches(self, session, query, rows):
        batch = []
        for row in rows:
            batch.append(row)
            if len(batch) >= NEO4J_BATCH_SIZE:
                session.run(query, batch=batch)
                batch = []
        if batch:
            session.run(
                query,
                batch=batch,
            )

    def _sync_research_estimates(self, session):
        self.stdout.write("Syncing SupplementResearchEstimates...")
        estimate_data = [
            {
                "id": estimate.id,
                "source": estimate.source,
                "release": estimate.release,
                "study_code": estimate.study_code,
                "ingredient_name": estimate.ingredient_name,
                "ingredient_key": estimate.ingredient_key,
                "labeled_amount": (
                    float(estimate.labeled_amount)
                    if estimate.labeled_amount is not None
                    else None
                ),
                "labeled_unit": estimate.labeled_unit,
                "predicted_amount": (
                    float(estimate.predicted_amount)
                    if estimate.predicted_amount is not None
                    else None
                ),
                "predicted_unit": estimate.predicted_unit,
                "predicted_percent_difference": (
                    float(estimate.predicted_percent_difference)
                    if estimate.predicted_percent_difference is not None
                    else None
                ),
            }
            for estimate in SupplementResearchEstimate.objects.all()
        ]
        if estimate_data:
            session.run(
                "UNWIND $batch AS row "
                "MERGE (e:ResearchEstimate {id: row.id}) "
                "SET e.source=row.source, e.release=row.release, e.study_code=row.study_code, "
                "e.ingredient_name=row.ingredient_name, e.ingredient_key=row.ingredient_key, "
                "e.labeled_amount=row.labeled_amount, e.labeled_unit=row.labeled_unit, "
                "e.predicted_amount=row.predicted_amount, e.predicted_unit=row.predicted_unit, "
                "e.predicted_percent_difference=row.predicted_percent_difference",
                batch=estimate_data,
            )
            session.run(
                "UNWIND $batch AS row "
                "MATCH (e:ResearchEstimate {id: row.id}) "
                "MATCH (n:Nutrient {normalized_key: row.ingredient_key}) "
                "MERGE (e)-[:ESTIMATES]->(n)",
                batch=estimate_data,
            )

    def _sync_interactions(self, session):
        self.stdout.write("Syncing nutrient interactions...")
        interactions_by_type = {}
        for item in NutrientInteraction.objects.filter(active=True):
            rel_type = RELATIONSHIP_TYPES.get(item.interaction_type)
            if not rel_type:
                continue
            interactions_by_type.setdefault(rel_type, []).append(
                {
                    "source_type": item.source_type,
                    "source_key": item.source_key,
                    "source_normalized_key": normalize_token(item.source_key),
                    "target_type": item.target_type,
                    "target_key": item.target_key,
                    "target_normalized_key": normalize_token(item.target_key),
                    "mechanism": item.mechanism,
                    "evidence_level": item.evidence_level,
                    "severity": item.severity,
                }
            )
        for rel_type, rows in interactions_by_type.items():
            session.run(
                f"UNWIND $batch AS row "
                "MERGE (source:KnowledgeEntity {type: row.source_type, key: row.source_normalized_key}) "
                "SET source.raw_key=row.source_key "
                "MERGE (target:KnowledgeEntity {type: row.target_type, key: row.target_normalized_key}) "
                "SET target.raw_key=row.target_key "
                f"MERGE (source)-[r:{rel_type}]->(target) "
                "SET r.mechanism=row.mechanism, r.evidence_level=row.evidence_level, r.severity=row.severity",
                batch=rows,
            )
            session.run(
                f"UNWIND $batch AS row "
                "MATCH (source:Nutrient {normalized_key: row.source_normalized_key}) "
                "MATCH (target:Nutrient {normalized_key: row.target_normalized_key}) "
                f"MERGE (source)-[r:{rel_type}]->(target) "
                "SET r.mechanism=row.mechanism, r.evidence_level=row.evidence_level, r.severity=row.severity",
                batch=rows,
            )

    def _sync_allergies_and_restrictions(self, session):
        self.stdout.write("Syncing Allergies & Restrictions...")
        alg_data = [
            {"id": a.id, "name": a.name, "slug": a.slug} for a in Allergy.objects.all()
        ]
        if alg_data:
            session.run(
                "UNWIND $batch AS row MERGE (a:Allergen {id: row.id}) SET a.name=row.name, a.slug=row.slug",
                batch=alg_data,
            )

        rest_data = [
            {"id": d.id, "name": d.name, "slug": d.slug}
            for d in DietaryRestriction.objects.all()
        ]
        if rest_data:
            session.run(
                "UNWIND $batch AS row MERGE (d:DietaryRestriction {id: row.id}) SET d.name=row.name, d.slug=row.slug",
                batch=rest_data,
            )

    def _sync_users(self, session):
        self.stdout.write("Syncing Users & Profiles...")
        for user in User.objects.select_related("profile").all():
            diet_type = user.profile.diet_type if hasattr(user, "profile") else "none"
            session.run(
                "MERGE (u:User {id: $id}) SET u.email=$email, u.diet_type=$diet_type",
                id=user.id,
                email=user.email,
                diet_type=diet_type,
            )
            if hasattr(user, "profile"):
                self._sync_profile_links(session, user, user.profile)

    def _sync_profile_links(self, session, user: User, profile: UserProfile):
        alg_links = [{"u_id": user.id, "a_id": a.id} for a in profile.allergies.all()]
        if alg_links:
            session.run(
                "UNWIND $batch AS row MATCH (u:User {id: row.u_id}), (a:Allergen {id: row.a_id}) MERGE (u)-[:ALLERGIC_TO]->(a)",
                batch=alg_links,
            )

        rest_links = [
            {"u_id": user.id, "d_id": d.id} for d in profile.dietary_restrictions.all()
        ]
        if rest_links:
            session.run(
                "UNWIND $batch AS row MATCH (u:User {id: row.u_id}), (d:DietaryRestriction {id: row.d_id}) MERGE (u)-[:RESTRICTS]->(d)",
                batch=rest_links,
            )

    def _sync_user_preferences(self, session):
        self.stdout.write("Syncing User Likes/Dislikes...")
        dl_data = [
            {"u_id": df.user_id, "slug": df.slug} for df in DislikedFood.objects.all()
        ]
        if dl_data:
            session.run(
                "UNWIND $batch AS row MATCH (u:User {id: row.u_id}), (f:Food {slug: row.slug}) MERGE (u)-[:DISLIKES]->(f)",
                batch=dl_data,
            )

    def _sync_user_supplements(self, session):
        self.stdout.write("Syncing User Supplements...")
        us_data = [
            {"u_id": us.user_id, "s_id": us.supplement_id}
            for us in UserSupplement.objects.filter(active=True)
        ]
        if us_data:
            session.run(
                "UNWIND $batch AS row MATCH (u:User {id: row.u_id}), (s:Supplement {id: row.s_id}) MERGE (u)-[:TAKES_SUPPLEMENT]->(s)",
                batch=us_data,
            )

    def _is_rich_in(self, nutrient_slug, amount):
        threshold = RICH_IN_THRESHOLDS.get(nutrient_slug)
        return threshold is not None and amount >= threshold
