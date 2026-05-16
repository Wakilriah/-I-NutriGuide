# Project Overview - I-NutriGuide

## Project Title
**I-NutriGuide: AI-Powered Recommendations of Foods Complementary to Supplements**

## Objective
Create an AI-driven system that recommends foods that complement dietary supplements. The system analyzes:

- User supplement intake
- Dietary habits
- Allergies
- Food restrictions
- Preferences
- Nutrition goals

Then it generates personalized recommendations that may improve nutrient synergy and absorption.

## Core Example

A user consuming **Vitamin C** can be advised to include iron-rich foods such as:

- Spinach
- Lentils
- Red meat

Reason: Vitamin C can improve iron absorption.

## Academic Direction

The project should use a **hybrid recommendation approach**:

1. **Content-Based Filtering**
   - Compare supplement nutrient needs with food nutrient profiles.
   - Example: iron supplement benefits from foods rich in vitamin C.

2. **Association Rule Mining**
   - Use support, confidence, and lift to represent food-supplement/nutrient relationships.
   - Rules can be manually seeded first, then later generated from datasets.

3. **User Preference Filtering**
   - Remove foods the user is allergic to.
   - Respect diet type, disliked foods, and restrictions.

4. **Safety Layer**
   - Avoid medical claims.
   - Add disclaimer.
   - Avoid unsafe combinations where known.

## User Types

### Mobile User
The normal user who uses the mobile application.

Capabilities:

- Register and login
- Complete nutrition profile
- Add supplements
- Add allergies and restrictions
- Generate recommendations
- Read explanations
- Give feedback

### Admin User
The admin manages the knowledge base and monitors the system.

Capabilities:

- Manage foods
- Manage nutrients
- Manage supplements
- Manage rules
- View users
- View recommendation logs
- View feedback
- View analytics
- Inspect logs via Dozzle

## Main Functional Goal

When a user requests recommendations, the system should return ranked foods with:

- Food name
- Food category and recommendation tags
- Score
- Supplement matched
- Nutrient reason
- Explanation
- Warnings if any
- Tags such as `rich in vitamin C`, `good with iron`, `avoid near coffee`, etc.

## Health Disclaimer

All recommendation responses must include or support this disclaimer:

> This recommendation is for educational nutrition guidance only and does not replace advice from a doctor, pharmacist, or registered dietitian.

## Non-Goals for Version 1

Do not implement these in the first version unless core features are complete:

- Real hospital/clinical integration
- Prescription drug interaction checking
- Barcode scanner
- AI chatbot
- Payment/subscription
- Wearable integration
- Complex deep learning

## Version 1 Success Criteria

The project is successful if:

- Admin can manage foods, nutrients, supplements, and rules.
- User can create a profile and add supplements.
- User receives personalized food recommendations.
- Recommendations are explained clearly.
- Allergies and restrictions are respected.
- Backend tests pass.
- Admin and mobile flows work against the API.
- Docker Compose can run the system locally.
- VPS deployment with Traefik and Dozzle is documented.
- Live VPS/domain verification is the only remaining production step.
