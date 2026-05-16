from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from apps.accounts.models import User, UserProfile, Allergy, DietaryRestriction, DislikedFood
from apps.foods.models import Food, FoodCategory
from apps.nutrients.models import Nutrient
from apps.supplements.models import Supplement, UserSupplement
from apps.common.neo4j_client import get_neo4j_driver

def run_cypher(query, **kwargs):
    driver = get_neo4j_driver()
    if not driver:
        return
    try:
        with driver.session() as session:
            session.run(query, **kwargs)
    except Exception as e:
        print(f"Neo4j sync error: {e}")

@receiver(post_save, sender=User)
def sync_user(sender, instance, created, **kwargs):
    run_cypher("MERGE (u:User {id: $id}) SET u.email=$email", id=instance.id, email=instance.email)

@receiver(post_save, sender=UserProfile)
def sync_user_profile(sender, instance, created, **kwargs):
    run_cypher("MATCH (u:User {id: $id}) SET u.diet_type=$diet_type", id=instance.user.id, diet_type=instance.diet_type)

@receiver(m2m_changed, sender=UserProfile.allergies.through)
def sync_user_allergies(sender, instance, action, pk_set, **kwargs):
    if action == "post_add":
        for pk in pk_set:
            run_cypher("MATCH (u:User {id: $u_id}), (a:Allergen {id: $a_id}) MERGE (u)-[:ALLERGIC_TO]->(a)", u_id=instance.user.id, a_id=pk)
    elif action == "post_remove":
        for pk in pk_set:
            run_cypher("MATCH (u:User {id: $u_id})-[r:ALLERGIC_TO]->(a:Allergen {id: $a_id}) DELETE r", u_id=instance.user.id, a_id=pk)
    elif action == "post_clear":
        run_cypher("MATCH (u:User {id: $u_id})-[r:ALLERGIC_TO]->(:Allergen) DELETE r", u_id=instance.user.id)

@receiver(post_save, sender=Food)
def sync_food(sender, instance, created, **kwargs):
    run_cypher("MERGE (f:Food {id: $id}) SET f.name=$name, f.slug=$slug", id=instance.id, name=instance.name, slug=instance.slug)
    if instance.category_id:
        run_cypher(
            "MATCH (f:Food {id: $f_id}), (c:Category {id: $c_id}) MERGE (f)-[:BELONGS_TO]->(c)",
            f_id=instance.id, c_id=instance.category_id
        )

@receiver(post_save, sender=DislikedFood)
def sync_disliked_food(sender, instance, created, **kwargs):
    if created:
        run_cypher("MATCH (u:User {id: $u_id}), (f:Food {slug: $slug}) MERGE (u)-[:DISLIKES]->(f)", u_id=instance.user_id, slug=instance.slug)

@receiver(post_save, sender=UserSupplement)
def sync_user_supplement(sender, instance, created, **kwargs):
    if instance.active:
        run_cypher("MATCH (u:User {id: $u_id}), (s:Supplement {id: $s_id}) MERGE (u)-[:TAKES_SUPPLEMENT]->(s)", u_id=instance.user.id, s_id=instance.supplement_id)
    else:
        run_cypher("MATCH (u:User {id: $u_id})-[r:TAKES_SUPPLEMENT]->(s:Supplement {id: $s_id}) DELETE r", u_id=instance.user.id, s_id=instance.supplement_id)
