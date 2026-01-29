-- Cold email module schema (MySQL)
-- Run manually in your database. All tables are prefixed with cold_email_.

CREATE TABLE IF NOT EXISTS cold_email_lists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  status ENUM('active','archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cold_email_lists_user (user_id)
);

CREATE TABLE IF NOT EXISTS cold_email_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(320) NOT NULL,
  first_name VARCHAR(120) NULL,
  last_name VARCHAR(120) NULL,
  company VARCHAR(255) NULL,
  title VARCHAR(255) NULL,
  custom_fields JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_cold_email_contact (user_id, email),
  KEY idx_cold_email_contacts_user (user_id)
);

CREATE TABLE IF NOT EXISTS cold_email_list_items (
  list_id BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active','bounced','unsubscribed','suppressed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (list_id, contact_id),
  KEY idx_cold_email_list_items_contact (contact_id)
);

CREATE TABLE IF NOT EXISTS cold_email_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  template_type ENUM('predefined','custom','ai') DEFAULT 'custom',
  subject VARCHAR(255) NOT NULL,
  body_html MEDIUMTEXT NULL,
  body_text MEDIUMTEXT NULL,
  variables_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cold_email_templates_user (user_id)
);

CREATE TABLE IF NOT EXISTS cold_email_ai_generations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  prompt TEXT NOT NULL,
  model VARCHAR(120) NULL,
  output_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cold_email_ai_user (user_id)
);

CREATE TABLE IF NOT EXISTS cold_email_campaigns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  list_id BIGINT UNSIGNED NOT NULL,
  template_id BIGINT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  status ENUM('draft','scheduled','sending','paused','completed') DEFAULT 'draft',
  schedule_type ENUM('immediate','scheduled') DEFAULT 'immediate',
  scheduled_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cold_email_campaigns_user (user_id),
  KEY idx_cold_email_campaigns_list (list_id)
);

CREATE TABLE IF NOT EXISTS cold_email_campaign_steps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  campaign_id BIGINT UNSIGNED NOT NULL,
  step_number INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html MEDIUMTEXT NULL,
  body_text MEDIUMTEXT NULL,
  delay_hours INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_cold_email_step (campaign_id, step_number),
  KEY idx_cold_email_steps_campaign (campaign_id)
);

CREATE TABLE IF NOT EXISTS cold_email_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  campaign_id BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NOT NULL,
  step_id BIGINT UNSIGNED NOT NULL,
  scheduled_at DATETIME NOT NULL,
  sent_at DATETIME NULL,
  status ENUM('queued','sending','sent','failed','skipped') DEFAULT 'queued',
  error_text VARCHAR(500) NULL,
  provider_message_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cold_email_messages_campaign (campaign_id),
  KEY idx_cold_email_messages_status (status, scheduled_at)
);

CREATE TABLE IF NOT EXISTS cold_email_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM('sent','delivered','opened','clicked','bounced','replied','unsubscribed') NOT NULL,
  occurred_at DATETIME NOT NULL,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  KEY idx_cold_email_events_message (message_id)
);

CREATE TABLE IF NOT EXISTS cold_email_suppression (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  email VARCHAR(320) NOT NULL,
  reason VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cold_email_suppression_email (email),
  KEY idx_cold_email_suppression_user (user_id)
);
