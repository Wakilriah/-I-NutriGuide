# Recommendation Engine Guide

## Goal
Generate personalized food recommendations for a user based on:

- Active user supplements
- Food nutrient profiles
- Association rules
- User allergies
- User dietary restrictions
- User disliked foods
- User feedback history

## Recommendation Type
Use a hybrid recommendation system:

```txt
Content-Based Filtering
+
Association Rule Scoring
+
User Preference Filtering
+
Safety Filtering
```

## Version 1 Recommendation Flow

```txt
1. Load user profile
2. Load active user supplements
3. Load all active foods with nutrients
4. Remove foods blocked by allergies/restrictions/dislikes
5. Compute nutrient compatibility score
6. Compute association rule score
7. Compute preference score
8. Combine scores
9. Rank foods
10. Generate explanations
11. Save RecommendationRun and RecommendationItems
12. Cache result
13. Return response
```

## Scoring Formula

Use this simple explainable formula first:

```txt
final_score =
  0.45 * nutrient_compatibility_score +
  0.35 * association_rule_score +
  0.20 * user_preference_score
```

Scores must be normalized between 0 and 1.

## Content-Based Filtering

Each food has nutrient features:

```txt
vitamin_c
iron
calcium
vitamin_d
magnesium
zinc
protein
fiber
healthy_fat
```

Each supplement maps to useful complementary nutrients.

Examples:

```txt
Iron supplement -> Vitamin C foods
Vitamin D supplement -> Healthy fat foods, calcium foods
Calcium supplement -> Vitamin D foods, magnesium foods
Magnesium supplement -> Fiber-rich foods, leafy greens
Zinc supplement -> Protein-rich foods
```

## Rule Examples

Seed rules manually first:

```txt
Vitamin C -> Iron-rich foods
Iron supplement -> Vitamin C-rich foods
Vitamin D -> Healthy-fat foods
Calcium -> Vitamin D-rich foods
Magnesium -> Leafy greens
Iron -> Avoid tea/coffee near intake
```

## Association Rule Model

An association rule has:

```txt
antecedent_type: supplement | nutrient
antecedent_slug: e.g. iron, vitamin-c
consequent_type: food | nutrient | category
consequent_slug: e.g. orange, vitamin-c, citrus-fruits
support: float
confidence: float
lift: float
explanation: text
is_active: bool
```

## Association Rule Score

Suggested scoring:

```py
rule_score = min(1.0, (0.4 * confidence) + (0.4 * normalized_lift) + (0.2 * support))
```

If multiple rules match the same food, use max or weighted average. For version 1, use max.

## Preference Score

Start simple:

```txt
1.0 = no preference penalty
0.8 = food category is neutral
0.6 = user rarely chooses this category
0.0 = blocked by allergy/restriction/dislike
```

Blocked foods must be removed, not just scored lower.

## Safety Filter

Before returning recommendations:

- Remove allergens.
- Remove diet-incompatible foods.
- Add warning when a rule says to avoid timing conflict.
- Do not provide medical advice.
- Include disclaimer.

## Explanation Generation

Every item must include a human-readable explanation.

Example:

```txt
Orange is recommended because it is rich in vitamin C, which may help support iron absorption when using an iron supplement.
```

Avoid language like:

```txt
This cures anemia.
This guarantees absorption.
You must eat this.
```

Use safer language:

```txt
may help
can support
is commonly paired with
is nutritionally complementary to
```

## Recommendation Engine Module Structure

```txt
apps/backend/apps/recommendations/services/
|-- __init__.py
|-- cache.py
|-- engine.py
|-- explanations.py
|-- filters.py
|-- scoring.py
`-- types.py
```

## Suggested Python Interfaces

```py
def generate_recommendations(user_id: int) -> dict:
    """Main entry point used by API view."""


def get_candidate_foods(user_profile) -> list:
    """Return foods after allergy/restriction filtering."""


def calculate_nutrient_score(food, user_supplements) -> float:
    """Content-based score."""


def calculate_rule_score(food, user_supplements) -> tuple[float, list]:
    """Association rule score and matched rules."""


def calculate_preference_score(food, user_profile) -> float:
    """Preference score."""


def build_explanation(food, supplement, matched_rules, matched_nutrients) -> str:
    """Human-readable explanation."""
```

## Caching

Cache recommendation results using a stable key:

```txt
recommendations:user:{user_id}:profile:{profile_hash}:supplements:{supplement_hash}
```

Invalidate cache when:

- User profile changes
- User allergies change
- User supplements change
- Food data changes
- Association rules change

## Background Jobs

Use Celery for:

- Rebuilding association rules from imported datasets
- Recalculating cached recommendation stats
- Importing CSV food/nutrient datasets
- Cleaning expired cache

## Real Survey User Import

Preprocessed Google Form survey data can be imported as anonymized app users:

```bash
python manage.py import_google_form_users /tmp/dataset_preprocessed_google_form.csv
```

The importer creates `form-user-<user_id>@google-form.local` accounts with unusable passwords, stores survey context on `UserProfile`, links allergies/disliked foods/supplements, seeds baseline foods/supplements/rules, and retrains the hybrid recommender artifact.

Use `--dry-run` first to validate row counts without writing data. Use `--skip-seed-knowledge-base` or `--skip-train-recommender` only for tests or controlled maintenance runs.

## Minimum Seed Dataset

Version 1 should include at least:

- 10 supplements
- 30 nutrients or fewer if simplified
- 50 foods
- 20 association/manual rules

## Recommendation Tests

Create tests for:

- Food with allergy is excluded.
- Food with matching nutrient gets higher score.
- Rule confidence improves score.
- Explanation is generated.
- Disclaimer is returned.
- Empty supplement list returns helpful message.
- Disabled foods are not recommended.
- Disabled rules are ignored.
