-- Cold email module seed data (MySQL/MariaDB)
-- Uses the first user in the users table. If no users exist, inserts will fail.

SET @user_id := (SELECT id FROM users ORDER BY id ASC LIMIT 1);
SELECT IF(@user_id IS NULL, 'No users found. Create a user first.', CONCAT('Using user id: ', @user_id)) AS seed_notice;

DROP TEMPORARY TABLE IF EXISTS seed_numbers;
CREATE TEMPORARY TABLE seed_numbers (n INT PRIMARY KEY);
INSERT INTO seed_numbers (n)
SELECT ones.n + tens.n * 10 + 1
FROM (
  SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
) ones
CROSS JOIN (
  SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
) tens
WHERE ones.n + tens.n * 10 < 100;

-- Lists (5)
INSERT INTO cold_email_lists (user_id, name, status)
VALUES
  (@user_id, 'Sample List 1', 'active'),
  (@user_id, 'Sample List 2', 'active'),
  (@user_id, 'Sample List 3', 'active'),
  (@user_id, 'Sample List 4', 'active'),
  (@user_id, 'Sample List 5', 'active');

-- Templates (5)
INSERT INTO cold_email_templates (user_id, name, template_type, subject, body_html, body_text, variables_json)
VALUES
  (@user_id, 'Sample Template 1', 'predefined', 'Quick question, {{first_name}}',
   '<p>Hi {{first_name}},</p><p>We help {{company}} streamline ops. Open to a 10-min chat?</p>',
   'Hi {{first_name}},\n\nWe help {{company}} streamline ops. Open to a 10-min chat?\n',
   JSON_OBJECT('first_name', 'First name', 'company', 'Company')),
  (@user_id, 'Sample Template 2', 'custom', 'Idea for {{company}}',
   '<p>Hi {{first_name}},</p><p>Sharing a quick idea for {{company}} to save time each week.</p>',
   'Hi {{first_name}},\n\nSharing a quick idea for {{company}} to save time each week.\n',
   JSON_OBJECT('first_name', 'First name', 'company', 'Company')),
  (@user_id, 'Sample Template 3', 'custom', 'Could we help {{company}}?',
   '<p>Hi {{first_name}},</p><p>We help teams like {{company}} reduce manual work.</p>',
   'Hi {{first_name}},\n\nWe help teams like {{company}} reduce manual work.\n',
   JSON_OBJECT('first_name', 'First name', 'company', 'Company')),
  (@user_id, 'Sample Template 4', 'predefined', 'Quick intro',
   '<p>Hi {{first_name}},</p><p>Would you be open to a short intro call?</p>',
   'Hi {{first_name}},\n\nWould you be open to a short intro call?\n',
   JSON_OBJECT('first_name', 'First name')),
  (@user_id, 'Sample Template 5', 'ai', 'Automation for {{company}}',
   '<p>Hi {{first_name}},</p><p>We can automate key workflows at {{company}} in days.</p>',
   'Hi {{first_name}},\n\nWe can automate key workflows at {{company}} in days.\n',
   JSON_OBJECT('first_name', 'First name', 'company', 'Company'));

-- AI generations (5)
INSERT INTO cold_email_ai_generations (user_id, prompt, model, output_json)
VALUES
  (@user_id, 'Write a short outreach for founders.', 'gpt-4o-mini',
   JSON_OBJECT('subject', 'Quick question, {{first_name}}', 'body_text', 'Hi {{first_name}}, we help teams automate ops.')),
  (@user_id, 'Write a polite follow-up.', 'gpt-4o-mini',
   JSON_OBJECT('subject', 'Following up', 'body_text', 'Just looping back in case you missed this.')),
  (@user_id, 'Write a cold email for product teams.', 'gpt-4o-mini',
   JSON_OBJECT('subject', 'Product ops idea', 'body_text', 'I have a quick idea to help {{company}}.')),
  (@user_id, 'Write a short intro for agency owners.', 'gpt-4o-mini',
   JSON_OBJECT('subject', 'Hello from SalesDream', 'body_text', 'Hi {{first_name}}, can we help with pipeline?')),
  (@user_id, 'Write a short email about CRM cleanup.', 'gpt-4o-mini',
   JSON_OBJECT('subject', 'CRM cleanup for {{company}}', 'body_text', 'We can clean CRM data in days.'));

-- Contacts (100)
INSERT IGNORE INTO cold_email_contacts
  (user_id, email, first_name, last_name, company, title, custom_fields)
SELECT
  @user_id,
  CONCAT('testuser', n, '@demo.test'),
  CONCAT('Test', n),
  'User',
  CONCAT('Demo Company ', ((n - 1) % 10) + 1),
  'Founder',
  JSON_OBJECT('source', 'seed', 'segment', CONCAT('S', ((n - 1) % 5) + 1))
FROM seed_numbers;

-- List items (assign contacts evenly across 5 lists)
INSERT IGNORE INTO cold_email_list_items (list_id, contact_id, status)
SELECT l.id, c.id, 'active'
FROM cold_email_contacts c
JOIN cold_email_lists l
  ON l.user_id = @user_id
 AND l.name = CONCAT(
    'Sample List ',
    ((CAST(REPLACE(SUBSTRING_INDEX(c.email, '@', 1), 'testuser', '') AS UNSIGNED) - 1) % 5) + 1
  )
WHERE c.user_id = @user_id
  AND c.email LIKE 'testuser%@demo.test';

-- Campaigns (5)
INSERT INTO cold_email_campaigns (user_id, list_id, template_id, name, status, schedule_type, scheduled_at)
SELECT
  @user_id,
  l.id,
  t.id,
  CONCAT('Sample Campaign ', n.n),
  'scheduled',
  'scheduled',
  DATE_ADD(NOW(), INTERVAL n.n HOUR)
FROM seed_numbers n
JOIN cold_email_lists l
  ON l.user_id = @user_id AND l.name = CONCAT('Sample List ', n.n)
JOIN cold_email_templates t
  ON t.user_id = @user_id AND t.name = CONCAT('Sample Template ', n.n)
WHERE n.n BETWEEN 1 AND 5;

-- Campaign steps (2 per campaign)
INSERT INTO cold_email_campaign_steps (campaign_id, step_number, subject, body_html, body_text, delay_hours)
SELECT
  c.id,
  1,
  'Quick question, {{first_name}}',
  '<p>Hi {{first_name}},</p><p>We help {{company}} automate ops quickly.</p>',
  'Hi {{first_name}},\n\nWe help {{company}} automate ops quickly.\n',
  0
FROM cold_email_campaigns c
WHERE c.user_id = @user_id AND c.name LIKE 'Sample Campaign %';

INSERT INTO cold_email_campaign_steps (campaign_id, step_number, subject, body_html, body_text, delay_hours)
SELECT
  c.id,
  2,
  'Following up, {{first_name}}',
  '<p>Just checking in. Happy to share a short demo.</p>',
  'Just checking in. Happy to share a short demo.',
  48
FROM cold_email_campaigns c
WHERE c.user_id = @user_id AND c.name LIKE 'Sample Campaign %';

-- Messages (20 contacts per campaign for step 1)
INSERT INTO cold_email_messages (campaign_id, contact_id, step_id, scheduled_at, sent_at, status, provider_message_id)
SELECT
  c.id,
  ct.id,
  s.id,
  DATE_SUB(NOW(), INTERVAL 30 MINUTE),
  CASE WHEN MOD(ct.id, 3) = 0 THEN NULL ELSE NOW() END,
  CASE
    WHEN MOD(ct.id, 3) = 0 THEN 'queued'
    WHEN MOD(ct.id, 3) = 1 THEN 'sent'
    ELSE 'failed'
  END,
  CASE WHEN MOD(ct.id, 3) = 1 THEN CONCAT('seed-', c.id, '-', ct.id) ELSE NULL END
FROM cold_email_campaigns c
JOIN cold_email_campaign_steps s ON s.campaign_id = c.id AND s.step_number = 1
JOIN cold_email_lists l ON l.id = c.list_id
JOIN cold_email_list_items li ON li.list_id = l.id
JOIN cold_email_contacts ct ON ct.id = li.contact_id
WHERE c.user_id = @user_id
  AND c.name LIKE 'Sample Campaign %'
  AND CAST(REPLACE(SUBSTRING_INDEX(ct.email, '@', 1), 'testuser', '') AS UNSIGNED)
      BETWEEN ((CAST(SUBSTRING_INDEX(c.name, ' ', -1) AS UNSIGNED) - 1) * 20 + 1)
          AND (CAST(SUBSTRING_INDEX(c.name, ' ', -1) AS UNSIGNED) * 20);

-- Events (sent, delivered, opened, replied, bounced)
INSERT INTO cold_email_events (message_id, event_type, occurred_at, metadata_json)
SELECT m.id, 'sent', NOW(), JSON_OBJECT('seed', true)
FROM cold_email_messages m
JOIN cold_email_campaigns c ON c.id = m.campaign_id
WHERE c.user_id = @user_id AND m.status = 'sent';

INSERT INTO cold_email_events (message_id, event_type, occurred_at, metadata_json)
SELECT m.id, 'delivered', NOW(), JSON_OBJECT('seed', true)
FROM cold_email_messages m
JOIN cold_email_campaigns c ON c.id = m.campaign_id
WHERE c.user_id = @user_id AND m.status = 'sent' AND MOD(m.id, 2) = 0;

INSERT INTO cold_email_events (message_id, event_type, occurred_at, metadata_json)
SELECT m.id, 'opened', NOW(), JSON_OBJECT('seed', true)
FROM cold_email_messages m
JOIN cold_email_campaigns c ON c.id = m.campaign_id
WHERE c.user_id = @user_id AND m.status = 'sent' AND MOD(m.id, 3) = 0;

INSERT INTO cold_email_events (message_id, event_type, occurred_at, metadata_json)
SELECT m.id, 'replied', NOW(), JSON_OBJECT('seed', true)
FROM cold_email_messages m
JOIN cold_email_campaigns c ON c.id = m.campaign_id
WHERE c.user_id = @user_id AND m.status = 'sent' AND MOD(m.id, 5) = 0;

INSERT INTO cold_email_events (message_id, event_type, occurred_at, metadata_json)
SELECT m.id, 'bounced', NOW(), JSON_OBJECT('seed', true)
FROM cold_email_messages m
JOIN cold_email_campaigns c ON c.id = m.campaign_id
WHERE c.user_id = @user_id AND m.status = 'failed';

-- Suppression
INSERT INTO cold_email_suppression (user_id, email, reason)
VALUES (@user_id, 'unsubscribe@sample.test', 'manual');

DROP TEMPORARY TABLE IF EXISTS seed_numbers;
