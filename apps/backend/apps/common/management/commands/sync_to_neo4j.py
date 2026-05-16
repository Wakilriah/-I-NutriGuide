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
            self.stdout.write("Syncing FoodCategories...")
            for cat in FoodCategory.objects.all():
                session.run("MERGE (c:Category {id: $id}) SET c.name=$name, c.slug=$slug", id=cat.id, name=cat.name, slug=cat.slug)

            self.stdout.write("Syncing Foods...")
            for food in Food.objects.all():
                session.run("MERGE (f:Food {id: $id}) SET f.name=$name, f.slug=$slug", id=food.id, name=food.name, slug=food.slug)
                session.run(
                    "MATCH (f:Food {id: $f_id}), (c:Category {id: $c_id}) MERGE (f)-[:BELONGS_TO]->(c)",
                    f_id=food.id, c_id=food.category_id
                )

            self.stdout.write("Syncing Nutrients...")
            for nut in Nutrient.objects.all():
                session.run("MERGE (n:Nutrient {id: $id}) SET n.name=$name, n.slug=$slug", id=nut.id, name=nut.name, slug=nut.slug)

            self.stdout.write("Syncing FoodNutrients...")
            for fn in FoodNutrient.objects.select_related('food', 'nutrient').all():
                session.run(
                    "MATCH (f:Food {id: $f_id}), (n:Nutrient {id: $n_id}) "
                    "MERGE (f)-[r:CONTAINS_NUTRIENT]->(n) SET r.amount=$amount, r.unit=$unit",
                    f_id=fn.food.id, n_id=fn.nutrient.id, amount=float(fn.amount), unit=fn.unit
                )

            self.stdout.write("Syncing Supplements...")
            for sup in Supplement.objects.all():
                session.run("MERGE (s:Supplement {id: $id}) SET s.name=$name, s.slug=$slug", id=sup.id, name=sup.name, slug=sup.slug)

            self.stdout.write("Syncing SupplementNutrients...")
            for sn in SupplementNutrient.objects.select_related('supplement', 'nutrient').all():
                if sn.amount is not None:
                    session.run(
                        "MATCH (s:Supplement {id: $s_id}), (n:Nutrient {id: $n_id}) "
                        "MERGE (s)-[r:CONTAINS_NUTRIENT]->(n) SET r.amount=$amount, r.unit=$unit",
                        s_id=sn.supplement.id, n_id=sn.nutrient.id, amount=float(sn.amount), unit=sn.unit
                    )

            self.stdout.write("Syncing Allergies & Restrictions...")
            for alg in Allergy.objects.all():
                session.run("MERGE (a:Allergen {id: $id}) SET a.name=$name, a.slug=$slug", id=alg.id, name=alg.name, slug=alg.slug)
            for rest in DietaryRestriction.objects.all():
                session.run("MERGE (d:DietaryRestriction {id: $id}) SET d.name=$name, d.slug=$slug", id=rest.id, name=rest.name, slug=rest.slug)

            self.stdout.write("Syncing Users & Profiles...")
            for user in User.objects.select_related('profile').all():
                diet_type = user.profile.diet_type if hasattr(user, 'profile') else "none"
                session.run(
                    "MERGE (u:User {id: $id}) SET u.email=$email, u.diet_type=$diet_type",
                    id=user.id, email=user.email, diet_type=diet_type
                )
                if hasattr(user, 'profile'):
                    for alg in user.profile.allergies.all():
                        session.run(
                            "MATCH (u:User {id: $u_id}), (a:Allergen {id: $a_id}) MERGE (u)-[:ALLERGIC_TO]->(a)",
                            u_id=user.id, a_id=alg.id
                        )
                    for rest in user.profile.dietary_restrictions.all():
                        session.run(
                            "MATCH (u:User {id: $u_id}), (d:DietaryRestriction {id: $d_id}) MERGE (u)-[:RESTRICTS]->(d)",
                            u_id=user.id, d_id=rest.id
                        )
            
            self.stdout.write("Syncing User Likes/Dislikes...")
            for df in DislikedFood.objects.all():
                session.run(
                    "MATCH (u:User {id: $u_id}), (f:Food {slug: $slug}) MERGE (u)-[:DISLIKES]->(f)",
                    u_id=df.user_id, slug=df.slug
                )

            self.stdout.write("Syncing User Supplements...")
            for us in UserSupplement.objects.filter(active=True):
                session.run(
                    "MATCH (u:User {id: $u_id}), (s:Supplement {id: $s_id}) MERGE (u)-[:TAKES_SUPPLEMENT]->(s)",
                    u_id=us.user_id, s_id=us.supplement_id
                )

        self.stdout.write(self.style.SUCCESS("Successfully synced to Neo4j"))
