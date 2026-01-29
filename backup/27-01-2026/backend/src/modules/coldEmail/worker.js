const pool = require("../../config/db");
const { sendMail } = require("../../utils/email");
const { renderTemplate, normalizeEmail, isValidEmail } = require("./utils");

let workerTimer = null;

async function isSuppressed(userId, email) {
  const [rows] = await pool.query(
    `SELECT id FROM cold_email_suppression
     WHERE email = ? AND (user_id IS NULL OR user_id = ?)
     LIMIT 1`,
    [email, userId]
  );
  return rows.length > 0;
}

async function markCampaignIfComplete(campaignId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM cold_email_messages WHERE campaign_id = ? AND status IN ('queued','sending')",
    [campaignId]
  );
  if (rows[0]?.cnt === 0) {
    await pool.query("UPDATE cold_email_campaigns SET status = ? WHERE id = ?", [
      "completed",
      campaignId,
    ]);
  }
}

async function processDueMessages(batchSize = 20) {
  const [rows] = await pool.query(
    `SELECT m.id, m.campaign_id, m.contact_id, m.step_id, m.scheduled_at,
        c.email, c.first_name, c.last_name, c.company, c.title,
        s.subject, s.body_html, s.body_text,
        cam.user_id, cam.status AS campaign_status
     FROM cold_email_messages m
     JOIN cold_email_contacts c ON c.id = m.contact_id
     JOIN cold_email_campaign_steps s ON s.id = m.step_id
     JOIN cold_email_campaigns cam ON cam.id = m.campaign_id
     WHERE m.status = 'queued'
       AND m.scheduled_at <= NOW()
       AND cam.status IN ('scheduled','sending')
     ORDER BY m.scheduled_at ASC
     LIMIT ?`,
    [batchSize]
  );

  for (const row of rows) {
    const messageId = row.id;
    const campaignId = row.campaign_id;
    const email = normalizeEmail(row.email);
    if (!email || !isValidEmail(email)) {
      await pool.query(
        "UPDATE cold_email_messages SET status = ?, error_text = ? WHERE id = ?",
        ["failed", "Invalid email address", messageId]
      );
      continue;
    }

    const [locked] = await pool.query(
      "UPDATE cold_email_messages SET status = 'sending' WHERE id = ? AND status = 'queued'",
      [messageId]
    );
    if (!locked.affectedRows) continue;

    try {
      const suppressed = await isSuppressed(row.user_id, email);
      if (suppressed) {
        await pool.query(
          "UPDATE cold_email_messages SET status = ?, error_text = ? WHERE id = ?",
          ["skipped", "Suppressed", messageId]
        );
        await pool.query(
          "INSERT INTO cold_email_events (message_id, event_type, occurred_at) VALUES (?, 'unsubscribed', NOW())",
          [messageId]
        );
        await markCampaignIfComplete(campaignId);
        continue;
      }

      if (row.campaign_status === "scheduled") {
        await pool.query("UPDATE cold_email_campaigns SET status = ? WHERE id = ?", [
          "sending",
          campaignId,
        ]);
      }

      const mergeData = {
        email,
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        company: row.company || "",
        title: row.title || "",
      };

      const subject = renderTemplate(row.subject, mergeData);
      const bodyText = renderTemplate(row.body_text || "", mergeData);
      const bodyHtml = renderTemplate(row.body_html || "", mergeData);

      const html = bodyHtml || (bodyText ? `<p>${bodyText}</p>` : "");
      const info = await sendMail({
        to: email,
        subject: subject || "(no subject)",
        text: bodyText || undefined,
        html: html || undefined,
      });

      await pool.query(
        "UPDATE cold_email_messages SET status = ?, sent_at = NOW(), provider_message_id = ? WHERE id = ?",
        ["sent", info?.messageId || null, messageId]
      );
      await pool.query(
        "INSERT INTO cold_email_events (message_id, event_type, occurred_at) VALUES (?, 'sent', NOW())",
        [messageId]
      );
    } catch (err) {
      await pool.query(
        "UPDATE cold_email_messages SET status = ?, error_text = ? WHERE id = ?",
        ["failed", String(err?.message || err), messageId]
      );
    }

    await markCampaignIfComplete(campaignId);
  }
}

function startColdEmailWorker({ intervalMs = 15000, batchSize = 20 } = {}) {
  if (workerTimer) return;
  workerTimer = setInterval(() => {
    processDueMessages(batchSize).catch((err) =>
      console.error("coldEmail worker error:", err)
    );
  }, intervalMs);
  console.log(`Cold email worker started (every ${intervalMs}ms).`);
}

function stopColdEmailWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}

module.exports = {
  processDueMessages,
  startColdEmailWorker,
  stopColdEmailWorker,
};
