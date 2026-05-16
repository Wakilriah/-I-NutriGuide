from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Allergy, DietaryRestriction, DislikedFood, User, UserProfile


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("name", "first_name", "last_name")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "name", "password1", "password2")}),
    )
    list_display = ("email", "name", "is_staff", "is_active")
    search_fields = ("email", "name")
    ordering = ("email",)


admin.site.register(Allergy)
admin.site.register(DietaryRestriction)
admin.site.register(DislikedFood)
admin.site.register(UserProfile)

