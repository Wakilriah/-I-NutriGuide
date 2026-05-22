from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver

from apps.accounts.models import DislikedFood, UserProfile
from apps.feedback.models import RecommendationFeedback
from apps.supplements.models import UserSupplement

from .services.cache import bump_user_recommendation_version


@receiver(post_save, sender=UserProfile)
def invalidate_profile_recommendations(sender, instance, **kwargs):
    bump_user_recommendation_version(instance.user_id)


@receiver(m2m_changed, sender=UserProfile.allergies.through)
@receiver(m2m_changed, sender=UserProfile.dietary_restrictions.through)
def invalidate_profile_m2m_recommendations(sender, instance, **kwargs):
    bump_user_recommendation_version(instance.user_id)


@receiver(post_save, sender=DislikedFood)
@receiver(post_delete, sender=DislikedFood)
def invalidate_disliked_food_recommendations(sender, instance, **kwargs):
    bump_user_recommendation_version(instance.user_id)


@receiver(post_save, sender=UserSupplement)
@receiver(post_delete, sender=UserSupplement)
def invalidate_user_supplement_recommendations(sender, instance, **kwargs):
    bump_user_recommendation_version(instance.user_id)


@receiver(post_save, sender=RecommendationFeedback)
@receiver(post_delete, sender=RecommendationFeedback)
def invalidate_feedback_recommendations(sender, instance, **kwargs):
    bump_user_recommendation_version(instance.user_id)
