# API Contract

Base URL:

```txt
/api/v1
```

OpenAPI schema and Swagger UI:

```http
GET /api/schema/
GET /api/docs/
```

Health check:

```http
GET /api/v1/health/
```

Response:

```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok"
}
```

## Authentication

### Register

```http
POST /api/v1/auth/register/
```

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123",
  "name": "User Name"
}
```

Response:

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name"
  },
  "access": "jwt-access-token",
  "refresh": "jwt-refresh-token"
}
```

### Login

```http
POST /api/v1/auth/login/
```

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

Response:

```json
{
  "access": "jwt-access-token",
  "refresh": "jwt-refresh-token"
}
```

### Current User

```http
GET /api/v1/auth/me/
```

Response:

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "is_staff": false
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh/
```

Request:

```json
{
  "refresh": "jwt-refresh-token"
}
```

Response:

```json
{
  "access": "new-jwt-access-token"
}
```

## Profile

```http
GET /api/v1/profile/
PUT /api/v1/profile/
PATCH /api/v1/profile/
```

Request:

```json
{
  "age": 24,
  "gender": "male",
  "height_cm": 176,
  "weight_kg": 75,
  "goal": "general_health",
  "activity_level": "moderate",
  "diet_type": "none",
  "allergies": ["peanuts"],
  "dietary_restrictions": ["halal"],
  "disliked_foods": ["broccoli"]
}
```

## Foods

```http
GET /api/v1/food-categories/
GET /api/v1/foods/?search=orange&category=fruits
GET /api/v1/foods/?source=CIQUAL%202020
GET /api/v1/foods/?page=1&page_size=25&is_active=true
```

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Orange",
      "slug": "orange",
      "category": "Fruits",
      "scientific_name": "",
      "ciqual_code": "10001",
      "source": "CIQUAL 2020",
      "serving_size_g": "100.000",
      "nutrients": [
        {
          "name": "Vitamin C",
          "slug": "vitamin-c",
          "amount": 53.2,
          "unit": "mg"
        }
      ],
      "image_url": "",
      "is_active": true
    }
  ]
}
```

## Supplements

```http
GET /api/v1/supplements/
```

Response:

```json
{
  "count": 1,
  "results": [
    {
      "id": 1,
      "name": "Iron",
      "slug": "iron",
      "description": "Iron supplement",
      "nutrients": [
        {
          "name": "Iron",
          "slug": "iron",
          "amount": 18,
          "unit": "mg"
        }
      ]
    }
  ]
}
```

## User Supplements

```http
GET /api/v1/user-supplements/
POST /api/v1/user-supplements/
PATCH /api/v1/user-supplements/{id}/
DELETE /api/v1/user-supplements/{id}/
```

Create request:

```json
{
  "supplement_id": 1,
  "dose": "18 mg",
  "frequency": "daily",
  "time_of_day": "morning"
}
```

## Generate Recommendations

```http
POST /api/v1/recommendations/generate/
```

Optional request:

```json
{
  "limit": 10
}
```

Response:

```json
{
  "run_id": "9a5e750e-bb6c-4387-9d40-e7d441a00001",
  "created_at": "2026-05-08T12:00:00Z",
  "disclaimer": "This recommendation is for educational nutrition guidance only and does not replace advice from a doctor, pharmacist, or registered dietitian.",
  "items": [
    {
      "id": 101,
      "rank": 1,
      "food": {
        "id": 1,
        "name": "Orange",
        "slug": "orange",
        "category": "Fruits"
      },
      "matched_supplement": {
        "id": 1,
        "name": "Iron",
        "slug": "iron"
      },
      "score": 0.91,
      "nutrient_score": 0.95,
      "rule_score": 0.88,
      "preference_score": 1.0,
      "matched_nutrients": ["Vitamin C"],
      "tags": ["vitamin-c", "iron-support"],
      "warnings": [],
      "explanation": "Orange is recommended because it is rich in vitamin C, which may help support iron absorption."
    }
  ]
}
```

## Recommendation History

```http
GET /api/v1/recommendations/history/
GET /api/v1/recommendations/history/{run_id}/
```

## Feedback

```http
POST /api/v1/feedback/
```

Request:

```json
{
  "recommendation_item_id": 101,
  "rating": 5,
  "is_helpful": true,
  "comment": "Useful recommendation"
}
```

## Admin Dashboard

```http
GET /api/v1/admin/dashboard/
```

Response:

```json
{
  "total_users": 100,
  "total_foods": 50,
  "total_supplements": 10,
  "total_recommendations": 230,
  "average_feedback_rating": 4.4,
  "total_association_rules": 20,
  "active_association_rules": 18,
  "recommendation_items_with_rules": 140,
  "average_rule_score": 0.52,
  "most_used_supplements": [],
  "most_recommended_foods": [],
  "most_saved_foods": [],
  "food_category_counts": [],
  "food_source_counts": [],
  "rule_usage": []
}
```

## Admin Users

```http
GET /api/v1/admin/users/
GET /api/v1/admin/users/{id}/
```

## Admin Knowledge Base

```http
GET /api/v1/admin/nutrients/
POST /api/v1/admin/nutrients/
GET /api/v1/admin/nutrients/{id}/
PATCH /api/v1/admin/nutrients/{id}/
DELETE /api/v1/admin/nutrients/{id}/

GET /api/v1/foods/
POST /api/v1/foods/
GET /api/v1/foods/{id}/
PATCH /api/v1/foods/{id}/
DELETE /api/v1/foods/{id}/

GET /api/v1/supplements/
POST /api/v1/supplements/
GET /api/v1/supplements/{id}/
PATCH /api/v1/supplements/{id}/
DELETE /api/v1/supplements/{id}/

GET /api/v1/admin/association-rules/
POST /api/v1/admin/association-rules/
GET /api/v1/admin/association-rules/{id}/
PATCH /api/v1/admin/association-rules/{id}/
DELETE /api/v1/admin/association-rules/{id}/
```

Admin-only create/update/delete actions require a staff JWT. Public read access is available for foods, food categories, and active supplements.

## Admin Recommendations and Analytics

```http
GET /api/v1/admin/recommendations/
GET /api/v1/admin/analytics/recommendations/
GET /api/v1/admin/analytics/feedback/
GET /api/v1/feedback/
```

Admin feedback list uses the same `/api/v1/feedback/` route with a staff JWT.

## Error Format

Use consistent error responses:

```json
{
  "detail": "Authentication credentials were not provided."
}
```

For validation:

```json
{
  "field_name": ["This field is required."]
}
```
