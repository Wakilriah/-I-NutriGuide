# Database Schema Guide

## Main Entities

```txt
User
UserProfile
Allergy
DietaryRestriction
DislikedFood
FoodCategory
Food
Nutrient
FoodNutrient
Supplement
SupplementNutrient
UserSupplement
AssociationRule
RecommendationRun
RecommendationItem
RecommendationFeedback
```

## Relationships

```txt
User 1 -> 1 UserProfile
User 1 -> * DislikedFood
User 1 -> * UserSupplement
User 1 -> * RecommendationRun
User 1 -> * RecommendationFeedback
UserProfile * -> * Allergy
UserProfile * -> * DietaryRestriction

FoodCategory 1 -> * Food
Food 1 -> * FoodNutrient
Nutrient 1 -> * FoodNutrient

Supplement 1 -> * SupplementNutrient
Nutrient 1 -> * SupplementNutrient

RecommendationRun 1 -> * RecommendationItem
Food 1 -> * RecommendationItem
Supplement 1 -> * RecommendationItem
RecommendationItem 1 -> * RecommendationFeedback

AssociationRule links entities by type and slug.
```

## User Fields

```txt
id
email unique
name
password
is_active
is_staff
is_superuser
last_login
date_joined
```

## UserProfile Fields

```txt
id
user_id
age
gender
height_cm
weight_kg
goal
activity_level
diet_type
allergies many-to-many
dietary_restrictions many-to-many
created_at
updated_at
```

Diet type values:

```txt
none
vegetarian
vegan
halal
pescatarian
gluten_free
lactose_free
```

## Allergy Fields

```txt
id
name unique
slug unique
```

## DietaryRestriction Fields

```txt
id
name unique
slug unique
```

## DislikedFood Fields

```txt
id
user_id
name
slug
```

Unique constraint:

```txt
user_id + slug
```

## FoodCategory Fields

```txt
id
name unique
slug unique
ciqual_group_code
ciqual_subgroup_code
ciqual_subsubgroup_code
source
created_at
updated_at
```

## Food Fields

```txt
id
name
slug unique
category_id
description
scientific_name
ciqual_code unique nullable
source
serving_size_g
image_url
is_active
created_at
updated_at
```

## Nutrient Fields

```txt
id
name unique
slug unique
unit
description
original_name_fr
source_column
is_active
created_at
updated_at
```

## FoodNutrient Fields

```txt
id
food_id
nutrient_id
amount
unit
per_quantity
per_unit
```

Example:

```txt
Orange -> Vitamin C -> 53.2 mg per 100 g
```

## Supplement Fields

```txt
id
name
slug unique
description
common_dose
is_active
created_at
updated_at
```

## SupplementNutrient Fields

```txt
id
supplement_id
nutrient_id
amount nullable
unit
```

## UserSupplement Fields

```txt
id
user_id
supplement_id
dose
frequency
time_of_day
active
created_at
updated_at
```

## AssociationRule Fields

```txt
id
antecedent_type
antecedent_slug
consequent_type
consequent_slug
support
confidence
lift
explanation
is_active
created_at
updated_at
```

Entity type values:

```txt
supplement
nutrient
food
category
```

## RecommendationRun Fields

```txt
id UUID primary key
user_id
input_snapshot JSON
profile_snapshot JSON
supplements_snapshot JSON
disclaimer
created_at
```

## RecommendationItem Fields

```txt
id
run_id
food_id
supplement_id nullable
score
nutrient_score
rule_score
preference_score
matched_nutrients JSON
matched_rules JSON
explanation
warnings JSON
tags JSON
rank
created_at
```

## RecommendationFeedback Fields

```txt
id
user_id
recommendation_item_id
rating
is_helpful
comment
created_at
```

## Key Constraints

```txt
DislikedFood: unique user_id + slug
FoodNutrient: unique food_id + nutrient_id
SupplementNutrient: unique supplement_id + nutrient_id
AssociationRule: unique antecedent_type + antecedent_slug + consequent_type + consequent_slug
RecommendationItem: unique run_id + rank
RecommendationItem: unique run_id + food_id
RecommendationFeedback: unique user_id + recommendation_item_id
```

## Implemented Indexes

The current models define indexes on:

```txt
Food.slug
Food.is_active
Food.ciqual_code
Food.source
Food.category_id + source
Supplement.slug
Supplement.is_active
Nutrient.slug
Nutrient.is_active
UserSupplement.user_id + active
AssociationRule.antecedent_slug
AssociationRule.consequent_slug
AssociationRule.is_active
RecommendationRun.user_id + created_at
```

## Seed Data Requirements

Create Django management commands:

```txt
python manage.py seed_nutrients
python manage.py seed_foods
python manage.py seed_supplements
python manage.py seed_rules
python manage.py seed_all
python manage.py import_ciqual_foods backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv
```

## Minimum Seed Data

Nutrients:

```txt
Vitamin C
Iron
Calcium
Vitamin D
Magnesium
Zinc
Protein
Fiber
Healthy Fat
Vitamin B12
```

Supplements:

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

Foods:

Include at least 50 foods across categories:

```txt
Fruits
Vegetables
Legumes
Meat
Fish
Dairy
Nuts and seeds
Grains
```
