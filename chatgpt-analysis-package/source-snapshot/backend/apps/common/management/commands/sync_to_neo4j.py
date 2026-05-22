from django.core.management.base import BaseCommand
from apps.accounts.models import User, Allergy, DietaryRestriction, DislikedFood, UserProfile
from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient
from apps.supplements.models import Supplement, SupplementNutrient, UserSupplement
from apps.common.neo4j_client import get_neo4j_driver

class Command(BaseCommand):
    help = "Sync data from PostgreSQL to Neo4j"

    def handle(self, *args, **options):
        driver = get_neo4j_driver()
        with driver.session() as session:
            self.stdout.write("Creating Constraints and Indexes...")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Category) REQUIRE c.id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (f:Food) REQUIRE f.id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:Nutrient) REQUIRE n.id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (s:Supplement) REQUIRE s.id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (a:Allergen) REQUIRE a.id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (d:DietaryRestriction) REQUIRE d.id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE")
            session.run("CREATE INDEX IF NOT EXISTS FOR (f:Food) ON (f.slug)")
            
            self.stdout.write("Syncing FoodCategories...")
            cat_data = [{"id": c.id, "name": c.name, "slug": c.slug} for c in FoodCategory.objects.all()]
            if cat_data:
                session.run("UNWIND $batch AS row MERGE (c:Category {id: row.id}) SET c.name=row.name, c.slug=row.slug", batch=cat_data)

            self.stdout.write("Syncing Foods...")
            food_data = [{"id": f.id, "name": f.name, "slug": f.slug, "c_id": f.category_id} for f in Food.objects.all()]
            if food_data:
                session.run(
                    "UNWIND $batch AS row MERGE (f:Food {id: row.id}) SET f.name=row.name, f.slug=row.slug "
                    "WITH f, row MATCH (c:Category {id: row.c_id}) MERGE (f)-[:BELONGS_TO]->(c)", 
                    batch=food_data
                )

            self.stdout.write("Syncing Nutrients...")
            nut_data = [{"id": n.id, "name": n.name, "slug": n.slug} for n in Nutrient.objects.all()]
            if nut_data:
                session.run("UNWIND $batch AS row MERGE (n:Nutrient {id: row.id}) SET n.name=row.name, n.slug=row.slug", batch=nut_data)

            self.stdout.write("Syncing FoodNutrients...")
            fn_data = [{"f_id": fn.food_id, "n_id": fn.nutrient_id, "amount": float(fn.amount), "unit": fn.unit} for fn in FoodNutrient.objects.all()]
            if fn_data:
                session.run(
                    "UNWIND $batch AS row MATCH (f:Food {id: row.f_id}), (n:Nutrient {id: row.n_id}) "
                    "MERGE (f)-[r:CONTAINS_NUTRIENT]->(n) SET r.amount=row.amount, r.unit=row.unit", 
                    batch=fn_data
                )

            self.stdout.write("Syncing Supplements...")
            sup_data = [{"id": s.id, "name": s.name, "slug": s.slug} for s in Supplement.objects.all()]
            if sup_data:
                session.run("UNWIND $batch AS row MERGE (s:Supplement {id: row.id}) SET s.name=row.name, s.slug=row.slug", batch=sup_data)

            self.stdout.write("Syncing SupplementNutrients...")
            sn_data = [{"s_id": sn.supplement_id, "n_id": sn.nutrient_id, "amount": float(sn.amount), "unit": sn.unit} for sn in SupplementNutrient.objects.filter(amount__isnull=False)]
            if sn_data:
                session.run(
                    "UNWIND $batch AS row MATCH (s:Supplement {id: row.s_id}), (n:Nutrient {id: row.n_id}) "
                    "MERGE (s)-[r:CONTAINS_NUTRIENT]->(n) SET r.amount=row.amount, r.unit=row.unit", 
                    batch=sn_data
                )

            self.stdout.write("Syncing Allergies & Restrictions...")
            alg_data = [{"id": a.id, "name": a.name, "slug": a.slug} for a in Allergy.objects.all()]
            if alg_data:
                session.run("UNWIND $batch AS row MERGE (a:Allergen {id: row.id}) SET a.name=row.name, a.slug=row.slug", batch=alg_data)
            
            rest_data = [{"id": d.id, "name": d.name, "slug": d.slug} for d in DietaryRestriction.objects.all()]
            if rest_data:
                session.run("UNWIND $batch AS row MERGE (d:DietaryRestriction {id: row.id}) SET d.name=row.name, d.slug=row.slug", batch=rest_data)

            self.stdout.write("Syncing Users & Profiles...")
            for user in User.objects.select_related('profile').all():
                diet_type = user.profile.diet_type if hasattr(user, 'profile') else "none"
                session.run(
                    "MERGE (u:User {id: $id}) SET u.email=$email, u.diet_type=$diet_type",
                    id=user.id, email=user.email, diet_type=diet_type
                )
                if hasattr(user, 'profile'):
                    alg_links = [{"u_id": user.id, "a_id": a.id} for a in user.profile.allergies.all()]
                    if alg_links:
                        session.run("UNWIND $batch AS row MATCH (u:User {id: row.u_id}), (a:Allergen {id: row.a_id}) MERGE (u)-[:ALLERGIC_TO]->(a)", batch=alg_links)
                    
                    rest_links = [{"u_id": user.id, "d_id": d.id} for d in user.profile.dietary_restrictions.all()]
                    if rest_links:
                        session.run("UNWIND $batch AS row MATCH (u:User {id: row.u_id}), (d:DietaryRestriction {id: row.d_id}) MERGE (u)-[:RESTRICTS]->(d)", batch=rest_links)
            
            self.stdout.write("Syncing User Likes/Dislikes...")
            dl_data = [{"u_id": df.user_id, "slug": df.slug} for df in DislikedFood.objects.all()]
            if dl_data:
                session.run("UNWIND $batch AS row MATCH (u:User {id: row.u_id}), (f:Food {slug: row.slug}) MERGE (u)-[:DISLIKES]->(f)", batch=dl_data)

            self.stdout.write("Syncing User Supplements...")
            us_data = [{"u_id": us.user_id, "s_id": us.supplement_id} for us in UserSupplement.objects.filter(active=True)]
            if us_data:
                session.run("UNWIND $batch AS row MATCH (u:User {id: row.u_id}), (s:Supplement {id: row.s_id}) MERGE (u)-[:TAKES_SUPPLEMENT]->(s)", batch=us_data)

        self.stdout.write(self.style.SUCCESS("Successfully synced to Neo4j"))
