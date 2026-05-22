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

## Food Recommendations

```http
GET /api/v1/recommendations/foods/?n=10
```

Response:

```json
{
  "user_id": 1,
  "strategy": "MEDICAL_PROFILE",
  "weights": {
    "alpha": 0.5,
    "beta": 0.35,
    "gamma": 0.15
  },
  "disclaimer": "Recommendations are nutritional suggestions and do not replace medical advice.",
  "recommendations": [
    {
      "food_id": 10,
      "food_name": "Lentils",
      "food_slug": "lentils",
      "category": "Legumes",
      "final_score": 0.84,
      "cbf_score": 0.82,
      "rules_score": 0.76,
      "cf_score": 0.55,
      "confidence_score": 0.87,
      "confidence_label": "High",
      "score_breakdown": {
        "content_based_score": 0.82,
        "association_rule_score": 0.76,
        "collaborative_score": 0.55,
        "nutrient_synergy_score": 0.9,
        "safety_score": 1.0,
        "profile_match_score": 0.78,
        "feedback_score": 0.7
      },
      "reason": "Lentils match your nutrition profile. Supports your goal: energy. Complements your supplements: iron.",
      "safety_notes": [],
      "explanation": {
        "summary": "Lentils are recommended because they may support your energy goal as part of a balanced routine.",
        "reasons": [
          {
            "type": "profile_match",
            "title": "Matches your goal",
            "message": "Lentils may support your energy goal as part of a balanced routine.",
            "confidence": 0.78
          }
        ]
      },
      "warnings": [],
      "matched_nutrients": ["fer", "folates"],
      "matched_rules": [],
      "related_supplement": "iron",
      "feedback": {
        "user_feedback": null,
        "available_actions": ["liked", "disliked", "saved", "tried", "not_interested"]
      }
    }
  ]
}
```

`recommendations` and `results` contain the same explainable item shape for compatibility. Scores are normalized from `0` to `1`; allergy conflicts remove foods before the response is returned.

## Preview Recommendations

```http
POST /api/v1/recommendations/preview/
```

Request:

```json
{
  "supplements": ["vitamin_c", "iron"],
  "goals": ["energy"],
  "maladies": ["anemia"],
  "allergies": ["peanut"],
  "aliments_exclus": ["white bread"],
  "imc": 23.1,
  "activite": 0.6,
  "n": 10
}
```

This returns the same shape as `GET /api/v1/recommendations/foods/` without saving a user profile or recommendation run.

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
  "disclaimer": "Recommendations are nutritional suggestions and do not replace medical advice.",
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
      "confidence_score": 0.91,
      "confidence_label": "High",
      "score_breakdown": {
        "content_based_score": 0.95,
        "association_rule_score": 0.88,
        "collaborative_score": 0.55,
        "nutrient_synergy_score": 0.9,
        "safety_score": 1.0,
        "profile_match_score": 0.8,
        "feedback_score": 0.75
      },
      "nutrient_score": 0.95,
      "rule_score": 0.88,
      "preference_score": 0.55,
      "matched_nutrients": ["vitamine_c"],
      "tags": ["vitamine_c"],
      "warnings": [],
      "explanation": {
        "summary": "Orange is recommended because vitamin C may improve non-heme iron absorption.",
        "reasons": [
          {
            "type": "nutrient_synergy",
            "title": "Vitamin C + Iron",
            "message": "Vitamin C may improve non-heme iron absorption.",
            "confidence": 0.91
          }
        ]
      },
      "feedback": {
        "user_feedback": null,
        "available_actions": ["liked", "disliked", "saved", "tried", "not_interested"]
      }
    }
  ]
}
```

## Nutrient Interactions

```http
GET /api/v1/nutrition/interactions/
GET /api/v1/nutrition/interactions/?interaction_type=inhibits&severity=caution
GET /api/v1/nutrition/interactions/graph/
```

Interaction item:

```json
{
  "id": 1,
  "source_type": "nutrient",
  "source_key": "vitamin_c",
  "target_type": "nutrient",
  "target_key": "iron",
  "interaction_type": "enhances",
  "mechanism": "Vitamin C may improve non-heme iron absorption.",
  "evidence_level": "high",
  "severity": "info",
  "active": true,
  "created_at": "2026-05-17T12:00:00Z",
  "updated_at": "2026-05-17T12:00:00Z"
}
```

Graph response:

```json
{
  "nodes": [{ "id": "vitamin_c", "label": "Vitamin C", "type": "nutrient" }],
  "edges": [{ "source": "vitamin_c", "target": "iron", "interaction_type": "enhances", "severity": "info", "label": "enhances absorption" }]
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
POST /api/v1/recommendations/feedback/
```

Request:

```json
{
  "recommendation_item_id": 101,
  "food_id": 1,
  "feedback_type": "liked",
  "rating": 5,
  "comment": "Useful recommendation"
}
```

Supported `feedback_type` values: `liked`, `disliked`, `saved`, `tried`, `not_interested`, `unsafe_for_me`, `too_expensive`, `bad_taste`, `allergy_issue`, `helpful`, `not_helpful`.

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
