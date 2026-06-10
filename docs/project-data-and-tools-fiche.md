# I-NutriGuide Nutrition Data Fiche

Generated: 2026-06-05

## Short Summary

This document explains the nutrition data used in I-NutriGuide. The main data is food nutrition data from the CIQUAL food composition table, plus project data that connects foods, nutrients, supplements, interactions, and recommendation rules.

We use this data to answer one main question:

```txt
Which foods can complement the supplements a user takes, while staying safe and explainable?
```

## 1. Main Food Nutrition Source: CIQUAL

The main external nutrition source used in the project is the French CIQUAL food composition dataset.

Project file:

```txt
apps/backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv
```

Imported source label:

```txt
CIQUAL 2020
```

Why we use CIQUAL:

- It gives real food composition values instead of invented data.
- It includes many foods with measured nutrient amounts.
- It gives nutrient values per 100 g, which makes foods comparable.
- It supports recommendation scoring, filtering, and explanations.

Example use:

- If a user takes iron, the system can search for foods with vitamin C or iron.
- If a user takes vitamin D, the system can search for foods containing fats, calcium, or vitamin D.
- If a food has too much sodium or does not match the goal, the engine can score it differently.

## 2. CIQUAL Food Identity Data

From the CIQUAL file, the project uses food identity columns.

Examples of columns:

```txt
alim_code
alim_nom_fr
alim_nom_sci
alim_grp_code
alim_ssgrp_code
alim_ssssgrp_code
alim_grp_nom_fr
alim_ssgrp_nom_fr
alim_ssssgrp_nom_fr
```

What this means:

- `alim_code`: CIQUAL food code.
- `alim_nom_fr`: food name in French.
- `alim_nom_sci`: scientific name, when available.
- group/subgroup codes: category identifiers.
- group/subgroup names: food category names.

Why we use it:

- To create food records in the database.
- To keep a link between each food and its original CIQUAL code.
- To group foods by category.
- To make food search, filtering, and admin review easier.

Stored in the project as:

- `Food`
- `FoodCategory`

## 3. Food Category Data

The project imports category information from CIQUAL group and subgroup fields.

Examples:

- fruits
- vegetables
- legumes
- meat
- fish
- dairy
- nuts and seeds
- grains

Why we use it:

- Categories help organize foods.
- Categories help the admin panel display and manage foods.
- Categories can be used by recommendation rules.
- Categories help generate alternative foods from similar groups.

Stored fields include:

```txt
name
slug
ciqual_group_code
ciqual_subgroup_code
ciqual_subsubgroup_code
source
```

## 4. Food Records

Each imported food becomes a food record.

Stored fields include:

```txt
name
slug
category
description
scientific_name
ciqual_code
source
serving_size_g
is_active
```

Why we use it:

- Food records are the items recommended to users.
- The `ciqual_code` keeps traceability to the CIQUAL source.
- The `serving_size_g` gives a base quantity, usually 100 g.
- `is_active` lets admins hide foods that should not be recommended.

Example:

```txt
Food: Orange
Source: CIQUAL 2020
Serving base: 100 g
Nutrients: Vitamin C, fiber, sugars, water, etc.
```

## 5. Food Nutrient Values

Food nutrient values are the most important nutrition data in the system.

Stored fields:

```txt
food
nutrient
amount
unit
per_quantity
per_unit
```

Example:

```txt
Orange -> Vitamin C -> 53.2 mg per 100 g
```

Why we use it:

- To compare foods by nutrient content.
- To find foods that match a supplement.
- To calculate content-based recommendation scores.
- To explain why a food was recommended.

How it supports recommendations:

- High vitamin C foods can be useful with iron.
- Calcium-rich foods can match calcium-related goals.
- Protein and fiber can support some nutrition goals.
- Fat content can matter for fat-soluble vitamins such as vitamin D.

## 6. Nutrients Imported From CIQUAL

The project does not import every possible CIQUAL column. It maps the most useful nutrients for the recommendation engine.

Imported nutrient examples:

```txt
Calories
Water
Protein
Carbohydrates
Healthy Fat
Sugars
Fiber
Calcium
Iron
Magnesium
Phosphorus
Potassium
Sodium
Zinc
Vitamin C
Vitamin D
Vitamin E
Vitamin K1
Vitamin B1
Vitamin B2
Vitamin B3
Vitamin B5
Vitamin B6
Vitamin B9
Vitamin B12
```

Why we use these nutrients:

- They are useful for matching foods with common supplements.
- They support common nutrition goals.
- They include macronutrients, minerals, and vitamins.
- They allow the system to generate understandable explanations.

## 7. Macronutrient Data

Macronutrients used:

```txt
Calories
Water
Protein
Carbohydrates
Healthy Fat
Sugars
Fiber
```

Why we use it:

- Calories help with energy and weight-related goals.
- Protein helps evaluate foods for muscle, satiety, and general nutrition.
- Carbohydrates and sugars help understand energy contribution.
- Fat is useful for fat-soluble vitamins such as vitamin D.
- Fiber helps identify foods useful for digestive and metabolic goals.
- Water helps represent food composition more completely.

How it is used:

- In content-based scoring.
- In food explanations.
- In future meal-plan balancing.

## 8. Mineral Data

Minerals used:

```txt
Calcium
Iron
Magnesium
Phosphorus
Potassium
Sodium
Zinc
```

Why we use it:

- Many common supplements are minerals.
- Mineral levels help match foods with supplements.
- Some minerals interact with each other.
- Sodium can be useful for caution or scoring depending on user goals.

Examples:

- Iron is important for users taking iron supplements or with anemia-related goals.
- Calcium is connected with vitamin D and bone-health nutrition.
- Magnesium is connected with vitamin D metabolism and muscle-function explanations.
- Zinc can compete with copper or interact with iron in supplement timing guidance.

## 9. Vitamin Data

Vitamins used:

```txt
Vitamin C
Vitamin D
Vitamin E
Vitamin K1
Vitamin B1
Vitamin B2
Vitamin B3
Vitamin B5
Vitamin B6
Vitamin B9
Vitamin B12
```

Why we use it:

- Vitamins are common supplement categories.
- Food vitamin values help identify complementary food sources.
- Vitamins support explanations and educational guidance.

Examples:

- Vitamin C can support non-heme iron absorption.
- Vitamin D is connected with calcium absorption.
- B vitamins help explain some energy-support recommendations.
- Vitamin B12 is important for users with specific diet patterns such as vegan or vegetarian diets.

## 10. Supplement Data

The project stores supplement records.

Examples:

```txt
Iron
Vitamin C
Vitamin D
Calcium
Magnesium
Zinc
Omega 3
Vitamin B12
Multivitamin
Folate
```

Stored fields include:

```txt
name
slug
description
common_dose
source
source_id
is_active
```

Why we use it:

- The system starts recommendations from the supplements a user takes.
- Supplements need a clean canonical name.
- Admins need to manage which supplements are active.

Example:

```txt
User takes: Iron
The system searches for foods and nutrients that complement iron.
```

## 11. Supplement-Nutrient Data

Supplements are linked to nutrients.

Stored fields:

```txt
supplement
nutrient
amount
unit
```

Examples:

```txt
Iron supplement -> Iron
Vitamin C supplement -> Vitamin C
Vitamin D supplement -> Vitamin D
Calcium supplement -> Calcium
Magnesium supplement -> Magnesium
Zinc supplement -> Zinc
Folate supplement -> Vitamin B9
Vitamin B12 supplement -> Vitamin B12
```

Why we use it:

- This connects supplement data to food nutrition data.
- It lets the recommender compare a user's supplement with foods containing related nutrients.
- It supports explanations like "this food matches your vitamin C supplement because it contains vitamin C."

## 12. Food-Supplement Synergy Data

The project can store food-supplement synergy rules.

Stored fields include:

```txt
supplement_category_name
supplement_item
food
food_item
nutrient_relation
association_type
reason
seed_weight
source_url
```

Why we use it:

- Some useful relationships are not only direct nutrient matches.
- A food can support a supplement through absorption or nutrient synergy.
- Admin-seeded rules help the system make better recommendations before enough user feedback exists.

Examples:

```txt
Vitamin C foods -> support iron absorption
Healthy-fat foods -> support vitamin D absorption
Calcium foods -> relevant with vitamin D
```

## 13. Nutrient Interaction Data

The project stores nutrient interaction knowledge.

Examples from the seed data:

```txt
Vitamin C enhances iron
Calcium inhibits iron when taken at the same time
Caffeine may reduce iron absorption around meals
Vitamin D supports calcium absorption
Dietary fat supports vitamin D absorption
Zinc can compete with copper
Iron and zinc may compete when high-dose supplements are taken together
Magnesium supports vitamin D metabolism
Vitamin K may require caution with anticoagulants
```

Stored fields include:

```txt
source_type
source_key
target_type
target_key
interaction_type
mechanism
evidence_level
severity
active
```

Why we use it:

- To explain why a food is useful with a supplement.
- To generate caution or warning messages.
- To avoid giving recommendations that ignore known nutrition interactions.
- To keep advice educational and safety-aware.

## 14. Supplement Safety Data

The project stores safety rules for supplements.

Stored fields include:

```txt
supplement
rule_type
interacting_entity
severity
title
description
recommendation
source
source_url
active
```

Why we use it:

- Supplements can have timing, absorption, condition, upper-limit, or interaction concerns.
- The app needs to warn users without making unsafe medical claims.
- Safety rules help generate educational cautions.

Examples:

- Avoid taking some supplements close to certain foods or drinks.
- Ask a clinician for personal advice in medical-risk cases.
- Show caution when a nutrient may compete with another nutrient.

## 15. Association Rule Data

The project uses association rules to represent relationships between supplements, nutrients, foods, and categories.

Stored fields:

```txt
antecedent_type
antecedent_slug
consequent_type
consequent_slug
support
confidence
lift
score
explanation
is_active
```

Why we use it:

- Association rules add a knowledge-based and data-mined layer to recommendations.
- Support, confidence, and lift help measure how strong a relationship is.
- They help rank foods when direct nutrient scoring is not enough.

Example:

```txt
supplement:iron -> food:orange
Reason: vitamin C foods may support iron absorption.
```

## 16. Mined Transaction Data

The project can store transaction-style data for association rule mining.

Stored transaction fields:

```txt
transaction_id
source
raw_payload
one_hot_items
```

Stored transaction item fields:

```txt
transaction
item_type
item_value
item
```

Why we use it:

- To generate association rules from grouped supplement-food-nutrient patterns.
- To improve rules over time instead of relying only on manual seed rules.
- To support the hybrid recommender with mined evidence.

## 17. Nutrition Data Used In Scoring

The recommendation engine mainly uses:

```txt
Food nutrient values
Supplement nutrient links
Food-supplement synergy rules
Nutrient interactions
Association rules
Safety constraints
User allergies and restrictions
```

The core content-based score considers:

```txt
objective_score
medical_score
supplement_score
caloric_score
```

Why this matters:

- Nutrient data tells the system what a food contains.
- Supplement data tells the system what the user needs to match.
- Interaction data tells the system if the combination is useful or needs caution.
- Rules add supplement-food knowledge.
- Safety filters remove foods that should not be recommended.

## 18. Example Recommendation Logic

Example 1: Iron supplement

Data used:

```txt
User supplement: Iron
Supplement nutrient: Iron
Food nutrients: Vitamin C, Iron
Interaction: Vitamin C enhances iron
Rules: iron -> vitamin C rich foods
```

Result:

```txt
Recommend foods that contain vitamin C or iron, while avoiding allergy and restriction conflicts.
```

Example 2: Vitamin D supplement

Data used:

```txt
User supplement: Vitamin D
Supplement nutrient: Vitamin D
Food nutrients: Vitamin D, Healthy Fat, Calcium
Interaction: fat supports vitamin D absorption
Interaction: vitamin D supports calcium
```

Result:

```txt
Recommend foods that fit vitamin D, calcium, or healthy-fat support patterns.
```

Example 3: Calcium and iron timing caution

Data used:

```txt
Interaction: calcium inhibits iron when taken at the same time
Severity: caution
```

Result:

```txt
Show an educational caution instead of blindly recommending the combination.
```

## 19. Why We Use These Nutrition Data Sources

We use these data sources because each one has a specific role:

- CIQUAL gives real measured food nutrition values.
- Food records define what can be recommended.
- Nutrient records define the nutrition vocabulary.
- Food-nutrient values make foods comparable.
- Supplement records define what the user takes.
- Supplement-nutrient links connect supplements to food nutrients.
- Nutrient interactions explain helpful or caution relationships.
- Safety rules prevent unsafe or misleading recommendations.
- Association rules add known and mined food-supplement relationships.

Together, this data lets I-NutriGuide generate food recommendations that are based on nutrition values, connected to supplements, explainable, and safer for users.

## 20. Final Conclusion

The most important data used in I-NutriGuide is food nutrition data. The project imports CIQUAL food composition data, stores foods and nutrient amounts per 100 g, links supplements to nutrients, and adds interaction and rule data to explain useful or risky combinations.

This is why the system can recommend foods such as vitamin C-rich foods with iron, healthy-fat foods with vitamin D, or calcium-related foods with vitamin D, while still showing warnings when nutrient timing or safety issues exist.

