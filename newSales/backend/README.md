# SalesDream Backend

## Setup
1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies
   ```bash
   npm install
   ```
3. Start
   ```bash
   npm run dev
   ```

## MySQL schema
See `schema.sql` for starter tables.

## Cold email architecture
High-level flow and data model: `../docs/cold-email-architecture.md`

## Cold email module (new)
1. Create tables with `sql/cold_email_schema.sql`.
2. Optional seed data with `sql/cold_email_seed.sql` (auto-uses the first user, creates 5 lists/templates/campaigns and 100 contacts; MySQL/MariaDB compatible).
2. Optional env:
   - `COLD_EMAIL_WORKER_ENABLED=false` to disable the worker
   - `COLD_EMAIL_WORKER_INTERVAL_MS=15000`
   - `COLD_EMAIL_WORKER_BATCH=20`
   - `OPENAI_API_KEY` and `OPENAI_MODEL` for AI template generation

## Cold email API (quick list)
- Lists: `GET/POST /api/cold-email/lists`, `PUT/DELETE /api/cold-email/lists/:id`, `POST /api/cold-email/lists/:id/contacts`, `POST /api/cold-email/lists/:id/contacts/remove`
- Contacts: `GET /api/cold-email/contacts?list_id=&q=&limit=&offset=`, `PUT /api/cold-email/contacts/:id`, `DELETE /api/cold-email/contacts/:id`
- Templates: `GET/POST /api/cold-email/templates`, `PUT/DELETE /api/cold-email/templates/:id`, `POST /api/cold-email/templates/ai`
- Campaigns: `GET/POST /api/cold-email/campaigns`, `GET/PUT/DELETE /api/cold-email/campaigns/:id`
- Campaign steps: `POST /api/cold-email/campaigns/:id/steps`
- Campaign actions: `POST /api/cold-email/campaigns/:id/launch`, `POST /api/cold-email/campaigns/:id/pause`
- Campaign insights: `GET /api/cold-email/campaigns/:id/history`, `GET /api/cold-email/campaigns/:id/contacts`
