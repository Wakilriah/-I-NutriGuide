# Neo4j Graph Database Integration Plan

## Context
The project currently uses PostgreSQL for all data, including nutritional relationships. By introducing a Neo4j Graph Database, we can transition from complex relational `JOIN`s to a Knowledge Graph RAG (Retrieval-Augmented Generation) system. This will significantly improve the Chat feature's accuracy and explainability, and it will turbocharge the Recommendation Engine by allowing real-time collaborative filtering, instant safety checks (allergies/dislikes), and complex nutritional traversals.

## Phases and Progress

### Phase 1: Infrastructure & Configuration
- [x] Add `neo4j` service (image: `neo4j:5-community`) to `docker-compose.yml`, `docker-compose.dev.yml`, and `docker-compose.prod.yml`.
- [x] Expose ports `7474` (HTTP) and `7687` (Bolt) and configure persistent volumes.
- [x] Add `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` to environment files (`.env.example`, `.env.production.example`).
- [x] Add the official `neo4j` Python driver to `apps/backend/requirements/base.txt`.

### Phase 2: Database Connection & Architecture
- [x] Create a singleton Neo4j driver connection manager in `apps/backend/apps/common/neo4j_client.py`.
- [x] Update `apps/backend/config/settings/base.py` to read Neo4j environment variables and initialize settings.

### Phase 3: Polyglot Persistence (Data Synchronization)
- [x] Map data schema for Nodes (`User`, `Food`, `Category`, `Nutrient`, `Supplement`, `Allergen`, `HealthGoal`) and Edges (`LIKES`, `DISLIKES`, `ALLERGIC_TO`, `CONTAINS_NUTRIENT`, `BELONGS_TO`).
- [x] Implement Django signals (`post_save`, `m2m_changed`) on standard models to synchronize data to Neo4j automatically.
- [x] Create a Django management command (`python manage.py sync_to_neo4j`) for initial bulk export/backfill from PostgreSQL to Neo4j.

### Phase 4: Upgrading the Recommendation Engine
- [x] Refactor `apps/backend/apps/recommendations/services/hybrid.py`.
- [x] Replace complex Postgres relational queries with Cypher queries for filtering allergies and finding safe foods.
- [x] Update scoring logic to utilize graph paths.

### Phase 5: Knowledge Graph RAG for Chat
- [x] Refactor `apps/backend/apps/chat/services.py`.
- [x] Modify `_profile_context` to execute a contextual subgraph query in Neo4j.
- [x] Inject the structured "Graph Path" into the Groq LLM prompt for grounded, accurate explanations.
