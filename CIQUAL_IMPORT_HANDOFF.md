# CIQUAL Import Handoff

Use this document to explain the CIQUAL database work to another ChatGPT/Codex session.

## What Was Added

The French CIQUAL food composition CSV was added as the real food nutrient database for I-NutriGuide:

```txt
apps/backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv
```

The backend now has metadata for CIQUAL imports:

- `Food.ciqual_code`
- `Food.scientific_name`
- `Food.source`
- `Food.serving_size_g`
- CIQUAL source/code fields on `FoodCategory`
- French original name, source column, and active flag on `Nutrient`

The new import command is:

```powershell
python manage.py import_ciqual_foods backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv
```

Useful test commands:

```powershell
python manage.py import_ciqual_foods backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv --limit 100
python manage.py import_ciqual_foods backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv --dry-run --limit 100
python manage.py import_ciqual_foods backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv --clear-ciqual
```

## Import Behavior

The importer:

- Reads UTF-8-SIG CIQUAL CSV files.
- Uses semicolon delimiter.
- Converts comma decimals like `4,88`.
- Treats empty values, `-`, `traces`, and invalid numeric values as null.
- Stores food nutrients per 100 g.
- Creates missing nutrients automatically.
- Updates existing CIQUAL foods by CIQUAL code.
- Updates existing food nutrient values instead of duplicating them.
- Uses bulk create/update for food nutrient values so full CIQUAL imports are faster.
- Can clear only CIQUAL-imported foods before reimport.
- Does not delete manual/admin-created foods.
- Prints a clear summary at the end.

## Recommendation Connection

The recommendation engine can now score imported foods using CIQUAL nutrient values. It still keeps:

- Allergy filtering.
- Dietary restriction filtering.
- Disliked food filtering.
- Disabled food filtering.
- Disabled association rule filtering.
- Explanations.
- Health disclaimer.

French CIQUAL category terms are handled for vegan, vegetarian, and lactose-free filtering, including common meat, fish, dairy, and egg category words.

Association rules and scoring were expanded for supplement-food/nutrient synergy:

- Iron and vitamin C.
- Vitamin D and calcium.
- Magnesium.
- Zinc.
- Vitamin B12.

## Admin Support

React admin:

- Shows CIQUAL source/code on foods.
- Can filter food list by source.
- Can search imported foods by source/code.

Django admin:

- Shows CIQUAL code/source on foods and categories.
- Allows searching by CIQUAL code, scientific name, source, and category.
- Adds source/category filters to avoid slow browsing through thousands of imported foods.

## Tests Added

New backend tests cover:

- Semicolon CSV parsing.
- UTF-8-SIG headers.
- Comma decimal conversion.
- Null handling for `-`, empty strings, and `traces`.
- Idempotent duplicate imports.
- Imported foods having nutrient values.
- Recommendations using imported foods.
- Allergy/disliked filtering with imported foods.
- French CIQUAL category filtering for diet restrictions.

## Verification Done

Verified on this machine:

```txt
Backend migrations: passed
Backend tests: 53 passed
Backend Ruff lint: passed
OpenAPI schema generation: passed
CIQUAL sample import: 100 rows, 0 bad rows
CIQUAL full import: 3,186 rows seen, 3,185 CIQUAL foods in dev database, 0 bad rows
Baseline seed_all: passed after CIQUAL import
Dev database totals after seeding: 3,207 foods, 3,185 CIQUAL foods, 28 nutrients, 11 supplements, 9 active rules
Admin lint: passed
Admin tests: 15 passed
Admin production build: passed
Mobile tests: 54 passed
Mobile typecheck: passed
Expo dependency check: passed
Production Compose config: passed
Secret scan: passed
Admin npm audit: 0 vulnerabilities
Mobile npm audit: 0 vulnerabilities
```

The dev database currently contains the imported CIQUAL food data.

Do not mark VPS/domain deployment tasks complete. They still require the real deployed server and domains.

## What Can Be Added Next

Strong next features:

- Favorite recommendations.
- Meal plan builder from recommended foods.
- Food images for imported CIQUAL foods.
- Admin import preview page for CSV imports.
- Better personalization using feedback history.
- More detailed restriction mapping for French CIQUAL categories.
- Nutrition safety warnings for supplement timing or conflicts.
- Barcode scanner for packaged food lookup.

Best practical next step:

```txt
Test the mobile and admin screens against the dev backend with the imported CIQUAL foods, then deploy when the real VPS/domain values are ready.
```
