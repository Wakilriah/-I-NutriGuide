# Backend Guide - Django + DRF

## Stack

- Django
- Django REST Framework
- PostgreSQL
- Redis
- Celery
- Simple JWT
- django-cors-headers
- drf-spectacular
- pytest-django
- factory_boy
- ruff
- black

## Backend App Structure

```txt
apps/backend/
config/
  settings/
    base.py
    dev.py
    test.py
    prod.py
  urls.py
  celery.py
  wsgi.py
apps/
  accounts/
  foods/
  nutrients/
  supplements/
  rules/
  recommendations/
  feedback/
  analytics/
requirements/
  base.txt
  dev.txt
  prod.txt
tests/
manage.py
Dockerfile
```

## Django Apps

### accounts

Models:

- `User` or default Django user
- `UserProfile`
- `Allergy`
- `DietaryRestriction`
- `DislikedFood`

Responsibilities:

- Register
- Login
- Refresh token
- Logout/token blacklist if configured
- Current user endpoint
- Profile CRUD
- User preferences

### foods

Models:

- `Food`
- `FoodCategory`
- `FoodNutrient`

Responsibilities:

- Admin CRUD for foods
- Public read list for mobile recommendation display
- Food filtering by nutrient/category
- CIQUAL CSV import for real food composition data

CIQUAL import:

```sh
python manage.py import_ciqual_foods backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv --limit 100
python manage.py import_ciqual_foods backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv
```

The raw CSV lives in:

```txt
apps/backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv
```

The importer reads UTF-8-SIG semicolon-separated French CIQUAL data, converts comma decimals, stores values per 100 g, and keeps association rules as the supplement-food synergy layer.

### nutrients

Models:

- `Nutrient`

Responsibilities:

- Define nutrients such as iron, calcium, vitamin C, vitamin D, magnesium

### supplements

Models:

- `Supplement`
- `SupplementNutrient`
- `UserSupplement`

Responsibilities:

- Admin CRUD for supplements
- User supplement intake
- Dose/frequency

### rules

Models:

- `AssociationRule`

Responsibilities:

- Store association rules such as `Vitamin C -> iron-rich foods`
- Store support, confidence, lift
- Store explanation text
- Enable/disable rules

### recommendations

Models:

- `RecommendationRun`
- `RecommendationItem`

Responsibilities:

- Generate recommendation run
- Store ranked items
- Return explanations
- Cache repeated requests

### feedback

Models:

- `RecommendationFeedback`

Responsibilities:

- User rating
- User comments
- Helpful/not helpful
- Future personalization signal

### analytics

Responsibilities:

- Admin metrics
- Counts of users, foods, supplements, recommendations
- Most recommended foods
- Most used supplements
- Average feedback rating

## Core Models Draft

```py
class Nutrient(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    unit = models.CharField(max_length=20, default="mg")
    description = models.TextField(blank=True)

class Food(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey("foods.FoodCategory", on_delete=models.PROTECT)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

class FoodNutrient(models.Model):
    food = models.ForeignKey("foods.Food", related_name="nutrients", on_delete=models.CASCADE)
    nutrient = models.ForeignKey("nutrients.Nutrient", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=20)

class Supplement(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

class SupplementNutrient(models.Model):
    supplement = models.ForeignKey("supplements.Supplement", related_name="nutrients", on_delete=models.CASCADE)
    nutrient = models.ForeignKey("nutrients.Nutrient", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True)

class UserSupplement(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    supplement = models.ForeignKey("supplements.Supplement", on_delete=models.PROTECT)
    dose = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True)
    active = models.BooleanField(default=True)

class AssociationRule(models.Model):
    antecedent_type = models.CharField(max_length=50)  # supplement, nutrient, food, or category
    antecedent_slug = models.CharField(max_length=150)
    consequent_type = models.CharField(max_length=50)  # food, nutrient, category
    consequent_slug = models.CharField(max_length=150)
    support = models.FloatField(default=0)
    confidence = models.FloatField(default=0)
    lift = models.FloatField(default=0)
    explanation = models.TextField()
    is_active = models.BooleanField(default=True)
```

## API Endpoints

### Auth

```txt
POST   /api/v1/auth/register/
POST   /api/v1/auth/login/
POST   /api/v1/auth/refresh/
GET    /api/v1/auth/me/
```

### User Profile

```txt
GET    /api/v1/profile/
PUT    /api/v1/profile/
PATCH  /api/v1/profile/
```

### Foods

```txt
GET    /api/v1/foods/
POST   /api/v1/foods/                 Admin only
GET    /api/v1/foods/{id}/
PUT    /api/v1/foods/{id}/            Admin only
DELETE /api/v1/foods/{id}/            Admin only or soft delete
```

### Supplements

```txt
GET    /api/v1/supplements/
POST   /api/v1/supplements/           Admin only
GET    /api/v1/supplements/{id}/
PUT    /api/v1/supplements/{id}/      Admin only
DELETE /api/v1/supplements/{id}/      Admin only or soft delete
```

### User Supplements

```txt
GET    /api/v1/user-supplements/
POST   /api/v1/user-supplements/
PATCH  /api/v1/user-supplements/{id}/
DELETE /api/v1/user-supplements/{id}/
```

### Recommendations

```txt
POST   /api/v1/recommendations/generate/
GET    /api/v1/recommendations/history/
GET    /api/v1/recommendations/history/{id}/
```

### Feedback

```txt
POST   /api/v1/feedback/
GET    /api/v1/feedback/              Admin only
```

### Admin Analytics

```txt
GET    /api/v1/admin/dashboard/
GET    /api/v1/admin/analytics/recommendations/
GET    /api/v1/admin/analytics/feedback/
```

## Recommendation Response Shape

```json
{
  "run_id": "uuid",
  "disclaimer": "This recommendation is for educational nutrition guidance only and does not replace advice from a doctor, pharmacist, or registered dietitian.",
  "items": [
    {
      "food_id": 1,
      "food_name": "Orange",
      "score": 0.91,
      "matched_supplement": "Iron",
      "matched_nutrients": ["Vitamin C"],
      "explanation": "Orange is rich in vitamin C, which may help improve iron absorption.",
      "tags": ["vitamin-c", "iron-support"],
      "warnings": []
    }
  ]
}
```

## Permissions

- Normal users can read active foods/supplements and manage their own profile/supplements/recommendations.
- Admin users can CRUD foods, supplements, nutrients, and rules.
- Analytics endpoints are admin-only.

## Testing Requirements

Use pytest.

Required backend tests:

- Auth registration works.
- Login returns access and refresh tokens.
- User cannot access another user's profile.
- Admin can create food.
- Normal user cannot create food.
- User can add supplement.
- Recommendation endpoint filters allergies.
- Recommendation endpoint returns explanations.
- Recommendation endpoint includes disclaimer.
- Association rule score affects ranking.
- Cache returns consistent response for same profile/supplement set.

## Backend Completion Rule

A backend feature is complete only when:

1. Model/migration exists if needed.
2. Serializer exists.
3. Viewset/API exists.
4. Permissions are correct.
5. Tests pass.
6. API schema updates correctly.
7. Admin panel or mobile can consume the endpoint.
