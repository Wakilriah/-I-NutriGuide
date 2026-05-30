# I-NutriGuide Hybrid Recommendation Engine

The recommendation engine ranks foods with a data-driven hybrid pipeline. Neo4j and knowledge-graph data may enrich explanations, but ranking is generated from PostgreSQL-backed food, profile, supplement, interaction, feedback, and association-rule data.

## Pipeline

1. Build a reusable user vector from supplements, goals, diseases, allergies, disliked foods, BMI, activity, age, gender, and prior positive food feedback.
2. Apply hard medical safety filtering before scoring. Unsafe foods are removed and receive no final score.
3. Score safe foods with content-based filtering.
4. Score safe foods with stored or mined association rules.
5. Score safe foods with user-based collaborative filtering.
6. Combine component scores with dynamic hybrid weights.
7. Return score details and explanation data with every recommendation.

## User Vector

BMI is normalized with the thesis formula:

```text
BMI_norm = (BMI - 15) / (40 - 15)
```

The result is clamped between `0` and `1`. The reusable vector is stored in the profile snapshot under `user_vector` and is also used to build collaborative-filtering feature vectors.

## Hard Safety Filter

The safety filter lives in `apps/backend/apps/recommendations/services/safety_filter.py`.

A food is removed before scoring when it matches an allergy, disliked/forbidden food, diet restriction, disease exclusion, strong caution text, or active medical safety constraint. Association rules and collaborative filtering cannot override this filter.

## Content-Based Filtering

CBF is implemented in `apps/backend/apps/recommendations/services/cbf.py`.

```text
CBF_score(food) =
0.30 * objective_score
+ 0.35 * medical_score
+ 0.25 * supplement_score
+ 0.10 * caloric_score
```

Supplement synergy includes pairings such as vitamin C with iron-rich foods, vitamin D with healthy fats and mineral support, omega 3 with healthy-fat contexts, and magnesium/zinc with complementary foods.

## Association Rules

Association scoring is implemented in `apps/backend/apps/recommendations/services/association.py`.

```text
rules_score(food) = confidence(A -> B) * log(lift(A -> B)) / log(max_lift)
```

Rules with lift below `1` are ignored. Rules are generated with:

```bash
py manage.py generate_association_rules
```

The command mines transactions, stores mined rules in PostgreSQL, and refreshes the recommender artifact unless `--skip-artifacts` is used.

## Collaborative Filtering

Collaborative filtering is implemented in `apps/backend/apps/recommendations/services/collaborative.py`.

It uses cosine similarity between user vectors and weighted votes from liked, saved, tried, helpful, disliked, unsafe, allergy, and not-relevant feedback. If interaction data is insufficient, CF returns `0` rather than random recommendations.

## Hybrid Score

The final score is computed in `apps/backend/apps/recommendations/services/hybrid.py`.

```text
final_score = alpha * CBF_score + beta * rules_score + gamma * CF_score
```

Dynamic weights:

| User type | alpha | beta | gamma |
| --- | ---: | ---: | ---: |
| New user | 0.60 | 0.30 | 0.10 |
| Active user | 0.40 | 0.30 | 0.30 |
| Complex medical case | 0.50 | 0.35 | 0.15 |

Complex medical cases take priority when allergies, diseases, or dietary restrictions exist.

## APIs

Primary endpoints under `/api/v1/`:

- `GET /recommendations/`
- `POST /recommendations/refresh/`
- `POST /recommendations/feedback/`
- `GET /recommendations/explain/{id}/`
- `GET /recommendations/timing-plan/`
- `GET /recommendations/meal-plan/`
- `GET /admin/evaluation/`
- `GET /admin/knowledge-graph/`

Existing compatibility endpoints remain available, including `/recommendations/foods/`, `/recommendations/generate/`, history, preview, and saved-food routes.

## Timing, Meal Plans, Alternatives

`apps/backend/apps/recommendations/services/plans.py` creates supplement timing plans and daily meal plans from the same safety-filtered recommendation payload used by the main recommender. Timing guidance includes best time, recommended foods, avoid-near-intake notes, explanations, and warnings.

`apps/backend/apps/recommendations/services/alternatives.py` attaches safe alternative foods to explanations using nutrient tags, diet tags, category similarity, optional filters, and the hard safety filter.

## Rule Review And Evaluation

Mined association rules include review status, admin notes, and safety conflict metadata. Positive rules that conflict with safety constraints are marked for review or excluded from recommender artifacts when blocking.

`apps/backend/apps/recommendations/services/evaluation.py` reports Precision@K, Recall@K, NDCG, coverage, diversity, confidence, rule hit rate, safety violation rate, save rate, dislike rate, and acceptance rate for the admin evaluation dashboard.

`apps/backend/apps/recommendations/services/knowledge_graph.py` returns supplement-food-nutrient nodes and edges for the admin knowledge graph preview.

## Caching And Background Work

Redis cache keys include the user id, profile snapshot, supplement snapshot, profile update timestamp, feedback timestamp, food dataset version, association-rule version, and per-user recommendation version.

Celery tasks support recommendation generation and recommender artifact refresh:

- `generate_recommendations_for_user`
- `refresh_recommendation_artifacts`
- `recalculate_user_vectors`

## Explainability

Every recommendation carries:

- final score
- CBF, association-rule, and CF scores
- safety status
- objective, medical, supplement, and calorie sub-scores
- matched nutrients and rules
- goal, supplement, calorie, similar-user, and association-rule reasons

The LLM/chat layer must not decide ranking. It may only explain or rephrase recommendations that were already generated by this pipeline.
