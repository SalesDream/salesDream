# Cold Email Architecture (High-Level)

This document outlines the high-level flow, database architecture, and backend/frontend app flow for a cold email platform with multi-campaign support per user, list uploads, templated or AI-generated emails, and long-term stability.

## Product Flow (User Journey)
1. User signs in and sets up sending profile (SMTP/API provider, domain, daily caps).
2. User creates a campaign and selects an audience:
   - Upload a list (CSV) or choose from existing contacts/lists.
3. User selects content:
   - Predefined template or AI-generated template.
4. User personalizes variables, reviews preview, and schedules sending.
5. System validates list, removes duplicates, checks suppression/unsubscribe.
6. Emails are queued, sent in batches, and tracked (opens/clicks/bounces/replies).
7. Campaign analytics are updated continuously and summarized.

## Database Architecture (MySQL)
Use a normalized relational schema with MySQL and keep event data partitionable for long-term scale.

Core tables (recommended):
- users
  - id, email, password_hash, plan_id, timezone, created_at
- sender_accounts
  - id, user_id, provider, smtp_host, smtp_user, smtp_pass_encrypted, daily_cap, status
- campaigns
  - id, user_id, name, status, schedule_type, start_at, end_at, created_at
- campaign_steps
  - id, campaign_id, step_number, subject, body_html, body_text, delay_hours
- templates
  - id, user_id (nullable for system templates), name, subject, body_html, body_text, variables_json
- ai_generations
  - id, user_id, prompt, output_json, model, created_at
- contacts
  - id, user_id, email, first_name, last_name, company, custom_fields_json, created_at
- contact_lists
  - id, user_id, name, created_at
- contact_list_items
  - list_id, contact_id, status, created_at
- suppression_list
  - id, user_id (nullable for global), email, reason, created_at
- upload_jobs
  - id, user_id, filename, total_rows, success_rows, error_rows, status, created_at
- email_messages
  - id, campaign_id, contact_id, step_id, scheduled_at, sent_at, status, provider_message_id
- email_events
  - id, message_id, event_type, occurred_at, metadata_json

Indexes and constraints:
- contacts(email, user_id) unique to avoid duplicates.
- email_messages(campaign_id, status, scheduled_at) for send queue scans.
- email_events(message_id, event_type) for fast analytics.
- suppression_list(email, user_id) for instant suppression checks.

Scaling notes:
- Consider partitioning email_events by month.
- Archive old email_messages and events after a retention period.

## Node/Express Flow (Backend)
Suggested services and flow for stability:

API endpoints (examples):
- POST /api/lists/upload -> create upload_job, parse CSV, upsert contacts
- POST /api/campaigns -> create campaign
- POST /api/campaigns/:id/steps -> create drip steps
- POST /api/campaigns/:id/launch -> validate, schedule, enqueue messages
- GET /api/campaigns/:id/stats -> read analytics
- POST /api/webhooks/provider -> store email_events

Queue/worker flow:
1. Scheduler builds email_messages with scheduled_at.
2. Worker scans due messages and checks:
   - suppression_list
   - daily caps per sender_account
   - time window + timezone
3. Worker renders template (merge variables) and sends via SMTP/API provider.
4. Update email_messages status and create email_events.
5. Retry transient failures with backoff.

Recommended infrastructure:
- MySQL for core data
- Redis for queue, rate limiting, and idempotency keys
- Object storage for uploads (S3-compatible)

## Angular Flow (Frontend)
If building in Angular, organize UI by domain and keep API calls in services.

Suggested modules:
- CampaignsModule: wizard, steps editor, scheduling, analytics
- ContactsModule: list upload, list view, dedupe
- TemplatesModule: library, AI generation, preview
- SettingsModule: sender accounts, domains, limits

Core components:
- CampaignWizardComponent (steps: audience, content, schedule, review)
- ListUploadComponent (CSV, error report)
- TemplatePickerComponent (predefined + AI)
- StepEditorComponent (drip sequence)
- CampaignStatsComponent (open/click/bounce)

Services:
- CampaignService: CRUD, launch, stats
- ContactService: lists, upload, validation
- TemplateService: predefined + AI output
- SenderService: sender profile and limits

State management:
- Use a store (NgRx or signals) for campaign drafts.
- Keep upload progress and errors in a dedicated slice.

Note: This repo currently ships a React frontend. If you want Angular, plan a new client app or map these modules to React pages/components.

## Performance and Stability (Long-Term)
- Use queues and batch sends to avoid provider throttling.
- Enforce per-user and per-sender daily caps.
- Idempotency for send operations to prevent duplicates.
- Cache campaign summaries to avoid heavy joins.
- Use background jobs for analytics rollups.
- Log and alert on bounce rates and queue delays.
