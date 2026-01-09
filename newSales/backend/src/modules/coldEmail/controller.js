const pool = require("../../config/db");
const fetch = require("node-fetch");
const {
  normalizeEmail,
  isValidEmail,
  extractEmails,
  uniqByEmail,
  chunk,
  toMysqlDateTime,
} = require("./utils");

const MAX_BATCH = 500;

async function ensureListOwnership(listId, userId) {
  const [rows] = await pool.query(
    "SELECT id, name FROM cold_email_lists WHERE id = ? AND user_id = ?",
    [listId, userId]
  );
  return rows[0] || null;
}

async function ensureCampaignOwnership(campaignId, userId) {
  const [rows] = await pool.query(
    "SELECT * FROM cold_email_campaigns WHERE id = ? AND user_id = ?",
    [campaignId, userId]
  );
  return rows[0] || null;
}

async function ensureContactOwnership(contactId, userId) {
  const [rows] = await pool.query(
    "SELECT * FROM cold_email_contacts WHERE id = ? AND user_id = ?",
    [contactId, userId]
  );
  return rows[0] || null;
}

function buildContactsFromBody(body = {}) {
  const contacts = [];

  if (Array.isArray(body.contacts)) {
    for (const c of body.contacts) {
      if (!c) continue;
      contacts.push({
        email: c.email,
        first_name: c.first_name || c.firstName || null,
        last_name: c.last_name || c.lastName || null,
        company: c.company || null,
        title: c.title || null,
        custom_fields: c.custom_fields || c.customFields || null,
      });
    }
  }

  if (Array.isArray(body.emails)) {
    for (const email of body.emails) {
      contacts.push({ email });
    }
  }

  const textSource = body.text || body.fileText || "";
  if (textSource) {
    const emails = extractEmails(textSource);
    for (const email of emails) contacts.push({ email });
  }

  return uniqByEmail(contacts)
    .filter((c) => isValidEmail(c.email))
    .map((c) => ({ ...c, email: normalizeEmail(c.email) }));
}

async function upsertContacts(userId, contacts = []) {
  if (!contacts.length) return [];
  const unique = uniqByEmail(contacts);
  const valid = unique.filter((c) => isValidEmail(c.email));
  const rows = valid.map((c) => [
    userId,
    normalizeEmail(c.email),
    c.first_name || null,
    c.last_name || null,
    c.company || null,
    c.title || null,
    c.custom_fields ? JSON.stringify(c.custom_fields) : null,
  ]);

  for (const batch of chunk(rows, MAX_BATCH)) {
    await pool.query(
      `INSERT INTO cold_email_contacts
        (user_id, email, first_name, last_name, company, title, custom_fields)
       VALUES ?
       ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        company = VALUES(company),
        title = VALUES(title),
        custom_fields = VALUES(custom_fields)`,
      [batch]
    );
  }

  return valid.map((c) => normalizeEmail(c.email));
}

async function fetchContactIds(userId, emails = []) {
  if (!emails.length) return [];
  const out = [];
  for (const group of chunk(emails, MAX_BATCH)) {
    const [rows] = await pool.query(
      "SELECT id, email FROM cold_email_contacts WHERE user_id = ? AND email IN (?)",
      [userId, group]
    );
    out.push(...rows);
  }
  return out;
}

async function attachContactsToList(listId, contactIds = []) {
  if (!contactIds.length) return 0;
  let inserted = 0;
  for (const group of chunk(contactIds, MAX_BATCH)) {
    const values = group.map((id) => [listId, id, "active"]);
    const [result] = await pool.query(
      "INSERT IGNORE INTO cold_email_list_items (list_id, contact_id, status) VALUES ?",
      [values]
    );
    inserted += result.affectedRows || 0;
  }
  return inserted;
}

exports.getLists = async (req, res) => {
  const userId = req.user?.id;
  const limit = Math.min(Number(req.query?.limit || 20), 200);
  const offset = Math.max(Number(req.query?.offset || 0), 0);
  try {
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM cold_email_lists WHERE user_id = ?",
      [userId]
    );
    const [rows] = await pool.query(
      `SELECT l.id, l.name, l.status, l.created_at,
        (SELECT COUNT(*) FROM cold_email_list_items li WHERE li.list_id = l.id) AS contact_count
       FROM cold_email_lists l
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return res.json({ lists: rows, total: countRow?.total || 0, limit, offset });
  } catch (err) {
    console.error("coldEmail.getLists error:", err);
    return res.status(500).json({ message: "Failed to load lists" });
  }
};

exports.getContacts = async (req, res) => {
  const userId = req.user?.id;
  const listId = req.query?.list_id ? Number(req.query.list_id) : null;
  const limit = Math.min(Number(req.query?.limit || 50), 200);
  const offset = Math.max(Number(req.query?.offset || 0), 0);
  const q = String(req.query?.q || "").trim();
  const likeValue = q ? `%${q}%` : null;
  try {
    let rows = [];
    let total = 0;
    if (listId) {
      const list = await ensureListOwnership(listId, userId);
      if (!list) return res.status(404).json({ message: "List not found" });

      const where = q
        ? "WHERE li.list_id = ? AND c.email LIKE ?"
        : "WHERE li.list_id = ?";
      const countParams = q ? [listId, likeValue] : [listId];
      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM cold_email_list_items li
         JOIN cold_email_contacts c ON c.id = li.contact_id
         ${where}`,
        countParams
      );
      total = countRow?.total || 0;

      const dataParams = q
        ? [listId, likeValue, limit, offset]
        : [listId, limit, offset];
      const [data] = await pool.query(
        `SELECT c.id, c.email, c.first_name, c.last_name, c.company, c.title, c.custom_fields,
            li.status AS list_status
         FROM cold_email_list_items li
         JOIN cold_email_contacts c ON c.id = li.contact_id
         ${where}
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`,
        dataParams
      );
      rows = data;
    } else {
      const where = q ? "WHERE c.user_id = ? AND c.email LIKE ?" : "WHERE c.user_id = ?";
      const countParams = q ? [userId, likeValue] : [userId];
      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM cold_email_contacts c
         ${where}`,
        countParams
      );
      total = countRow?.total || 0;

      const dataParams = q
        ? [userId, likeValue, limit, offset]
        : [userId, limit, offset];
      const [data] = await pool.query(
        `SELECT c.id, c.email, c.first_name, c.last_name, c.company, c.title, c.custom_fields,
            COUNT(DISTINCT li.list_id) AS list_count,
            GROUP_CONCAT(DISTINCT l.name ORDER BY l.name SEPARATOR ', ') AS list_names
         FROM cold_email_contacts c
         LEFT JOIN cold_email_list_items li ON li.contact_id = c.id
         LEFT JOIN cold_email_lists l ON l.id = li.list_id
         ${where}
         GROUP BY c.id, c.email, c.first_name, c.last_name, c.company, c.title, c.custom_fields, c.created_at
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`,
        dataParams
      );
      rows = data;
    }

    const contacts = rows.map((row) => ({
      ...row,
      email_valid: isValidEmail(row.email),
    }));
    return res.json({ contacts, total, limit, offset });
  } catch (err) {
    console.error("coldEmail.getContacts error:", err);
    return res.status(500).json({ message: "Failed to load contacts" });
  }
};

exports.updateContact = async (req, res) => {
  const userId = req.user?.id;
  const contactId = Number(req.params.id);
  if (!contactId) return res.status(400).json({ message: "Invalid contact id" });

  const email = req.body?.email ? normalizeEmail(req.body.email) : null;
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ message: "Invalid email" });
  }

  try {
    const contact = await ensureContactOwnership(contactId, userId);
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    const fields = {
      email: email || contact.email,
      first_name: req.body?.first_name ?? contact.first_name,
      last_name: req.body?.last_name ?? contact.last_name,
      company: req.body?.company ?? contact.company,
      title: req.body?.title ?? contact.title,
      custom_fields: req.body?.custom_fields ?? contact.custom_fields,
    };

    let customFieldsValue = null;
    if (fields.custom_fields) {
      if (typeof fields.custom_fields === "string") customFieldsValue = fields.custom_fields;
      else customFieldsValue = JSON.stringify(fields.custom_fields);
    }

    await pool.query(
      `UPDATE cold_email_contacts
       SET email = ?, first_name = ?, last_name = ?, company = ?, title = ?, custom_fields = ?
       WHERE id = ? AND user_id = ?`,
      [
        fields.email,
        fields.first_name,
        fields.last_name,
        fields.company,
        fields.title,
        customFieldsValue,
        contactId,
        userId,
      ]
    );

    if (req.body?.list_id && req.body?.list_status) {
      const listId = Number(req.body.list_id);
      await pool.query(
        `UPDATE cold_email_list_items
         SET status = ?
         WHERE list_id = ? AND contact_id = ?`,
        [req.body.list_status, listId, contactId]
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    if (String(err?.message || "").includes("Duplicate")) {
      return res.status(409).json({ message: "Email already exists" });
    }
    console.error("coldEmail.updateContact error:", err);
    return res.status(500).json({ message: "Failed to update contact" });
  }
};

exports.deleteContact = async (req, res) => {
  const userId = req.user?.id;
  const contactId = Number(req.params.id);
  const listId = req.query?.list_id ? Number(req.query.list_id) : null;
  if (!contactId) return res.status(400).json({ message: "Invalid contact id" });

  try {
    const contact = await ensureContactOwnership(contactId, userId);
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    if (listId) {
      await pool.query(
        "DELETE FROM cold_email_list_items WHERE list_id = ? AND contact_id = ?",
        [listId, contactId]
      );
      return res.json({ ok: true, removed_from_list: listId });
    }

    await pool.query("DELETE FROM cold_email_list_items WHERE contact_id = ?", [
      contactId,
    ]);
    await pool.query("DELETE FROM cold_email_events WHERE message_id IN (SELECT id FROM cold_email_messages WHERE contact_id = ?)", [
      contactId,
    ]);
    await pool.query("DELETE FROM cold_email_messages WHERE contact_id = ?", [
      contactId,
    ]);
    await pool.query("DELETE FROM cold_email_contacts WHERE id = ? AND user_id = ?", [
      contactId,
      userId,
    ]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.deleteContact error:", err);
    return res.status(500).json({ message: "Failed to delete contact" });
  }
};

exports.createList = async (req, res) => {
  const userId = req.user?.id;
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ message: "List name required" });

  try {
    const [result] = await pool.query(
      "INSERT INTO cold_email_lists (user_id, name) VALUES (?, ?)",
      [userId, name]
    );
    return res.json({ id: result.insertId, name });
  } catch (err) {
    console.error("coldEmail.createList error:", err);
    return res.status(500).json({ message: "Failed to create list" });
  }
};

exports.updateList = async (req, res) => {
  const userId = req.user?.id;
  const listId = Number(req.params.id);
  if (!listId) return res.status(400).json({ message: "Invalid list id" });

  const name = req.body?.name ? String(req.body.name).trim() : null;
  const status = req.body?.status || null;
  if (name !== null && !name) {
    return res.status(400).json({ message: "List name required" });
  }

  try {
    const list = await ensureListOwnership(listId, userId);
    if (!list) return res.status(404).json({ message: "List not found" });

    await pool.query(
      `UPDATE cold_email_lists
       SET name = COALESCE(?, name),
           status = COALESCE(?, status)
       WHERE id = ? AND user_id = ?`,
      [name, status, listId, userId]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.updateList error:", err);
    return res.status(500).json({ message: "Failed to update list" });
  }
};

exports.deleteList = async (req, res) => {
  const userId = req.user?.id;
  const listId = Number(req.params.id);
  if (!listId) return res.status(400).json({ message: "Invalid list id" });

  try {
    const list = await ensureListOwnership(listId, userId);
    if (!list) return res.status(404).json({ message: "List not found" });

    const [[campaigns]] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM cold_email_campaigns WHERE list_id = ? AND user_id = ?",
      [listId, userId]
    );
    if (campaigns?.cnt > 0) {
      return res.status(409).json({ message: "List is used by campaigns" });
    }

    await pool.query("DELETE FROM cold_email_list_items WHERE list_id = ?", [
      listId,
    ]);
    await pool.query("DELETE FROM cold_email_lists WHERE id = ? AND user_id = ?", [
      listId,
      userId,
    ]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.deleteList error:", err);
    return res.status(500).json({ message: "Failed to delete list" });
  }
};

exports.addContacts = async (req, res) => {
  const userId = req.user?.id;
  const listId = Number(req.params.id);
  if (!listId) return res.status(400).json({ message: "Invalid list id" });

  try {
    const list = await ensureListOwnership(listId, userId);
    if (!list) return res.status(404).json({ message: "List not found" });

    const contacts = buildContactsFromBody(req.body);
    if (!contacts.length) {
      return res.status(400).json({ message: "No valid contacts found" });
    }

    const emails = await upsertContacts(userId, contacts);
    const contactRows = await fetchContactIds(userId, emails);
    const inserted = await attachContactsToList(
      listId,
      contactRows.map((r) => r.id)
    );

    return res.json({
      list_id: listId,
      inserted_contacts: contactRows.length,
      added_to_list: inserted,
    });
  } catch (err) {
    console.error("coldEmail.addContacts error:", err);
    return res.status(500).json({ message: "Failed to add contacts" });
  }
};

exports.removeContactsFromList = async (req, res) => {
  const userId = req.user?.id;
  const listId = Number(req.params.id);
  if (!listId) return res.status(400).json({ message: "Invalid list id" });

  try {
    const list = await ensureListOwnership(listId, userId);
    if (!list) return res.status(404).json({ message: "List not found" });

    const contacts = buildContactsFromBody(req.body);
    if (!contacts.length) {
      return res.status(400).json({ message: "No valid contacts found" });
    }

    const emails = contacts.map((c) => normalizeEmail(c.email)).filter(Boolean);
    const contactRows = await fetchContactIds(userId, emails);
    const contactIds = contactRows.map((r) => r.id);

    let removed = 0;
    for (const group of chunk(contactIds, MAX_BATCH)) {
      const [result] = await pool.query(
        "DELETE FROM cold_email_list_items WHERE list_id = ? AND contact_id IN (?)",
        [listId, group]
      );
      removed += result.affectedRows || 0;
    }

    return res.json({ list_id: listId, removed_from_list: removed });
  } catch (err) {
    console.error("coldEmail.removeContactsFromList error:", err);
    return res.status(500).json({ message: "Failed to remove contacts" });
  }
};

exports.importContacts = async (req, res) => {
  return exports.addContacts(req, res);
};

exports.getTemplates = async (req, res) => {
  const userId = req.user?.id;
  const limit = Math.min(Number(req.query?.limit || 20), 200);
  const offset = Math.max(Number(req.query?.offset || 0), 0);
  try {
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM cold_email_templates WHERE user_id = ? OR user_id IS NULL",
      [userId]
    );
    const [rows] = await pool.query(
      `SELECT id, user_id, name, template_type, subject, body_html, body_text, variables_json, created_at
       FROM cold_email_templates
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return res.json({ templates: rows, total: countRow?.total || 0, limit, offset });
  } catch (err) {
    console.error("coldEmail.getTemplates error:", err);
    return res.status(500).json({ message: "Failed to load templates" });
  }
};

exports.createTemplate = async (req, res) => {
  const userId = req.user?.id;
  const name = String(req.body?.name || "").trim();
  const subject = String(req.body?.subject || "").trim();
  const templateType = req.body?.template_type || "custom";
  const bodyHtml = req.body?.body_html || null;
  const bodyText = req.body?.body_text || null;
  const variables = req.body?.variables || null;

  if (!name) return res.status(400).json({ message: "Template name required" });
  if (!subject) return res.status(400).json({ message: "Subject required" });
  if (!bodyHtml && !bodyText) {
    return res.status(400).json({ message: "Body text or HTML required" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO cold_email_templates
        (user_id, name, template_type, subject, body_html, body_text, variables_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        templateType,
        subject,
        bodyHtml,
        bodyText,
        variables ? JSON.stringify(variables) : null,
      ]
    );

    return res.json({ id: result.insertId });
  } catch (err) {
    console.error("coldEmail.createTemplate error:", err);
    return res.status(500).json({ message: "Failed to create template" });
  }
};

exports.updateTemplate = async (req, res) => {
  const userId = req.user?.id;
  const templateId = Number(req.params.id);
  if (!templateId) return res.status(400).json({ message: "Invalid template id" });

  const name = req.body?.name ? String(req.body.name).trim() : null;
  const subject = req.body?.subject ? String(req.body.subject).trim() : null;
  const templateType = req.body?.template_type || null;
  const bodyHtml = req.body?.body_html ?? null;
  const bodyText = req.body?.body_text ?? null;
  const variables = req.body?.variables ?? null;

  if (name !== null && !name) return res.status(400).json({ message: "Template name required" });
  if (subject !== null && !subject) return res.status(400).json({ message: "Subject required" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM cold_email_templates WHERE id = ?",
      [templateId]
    );
    if (!rows.length) return res.status(404).json({ message: "Template not found" });

    const tpl = rows[0];
    if (!tpl.user_id || Number(tpl.user_id) !== Number(userId)) {
      return res.status(403).json({ message: "Template not editable" });
    }

    const nextBodyHtml = bodyHtml === null ? tpl.body_html : bodyHtml;
    const nextBodyText = bodyText === null ? tpl.body_text : bodyText;
    if (!nextBodyHtml && !nextBodyText) {
      return res.status(400).json({ message: "Body text or HTML required" });
    }

    await pool.query(
      `UPDATE cold_email_templates
       SET name = COALESCE(?, name),
           template_type = COALESCE(?, template_type),
           subject = COALESCE(?, subject),
           body_html = ?,
           body_text = ?,
           variables_json = ?
       WHERE id = ? AND user_id = ?`,
      [
        name,
        templateType,
        subject,
        nextBodyHtml,
        nextBodyText,
        variables ? JSON.stringify(variables) : tpl.variables_json,
        templateId,
        userId,
      ]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.updateTemplate error:", err);
    return res.status(500).json({ message: "Failed to update template" });
  }
};

exports.deleteTemplate = async (req, res) => {
  const userId = req.user?.id;
  const templateId = Number(req.params.id);
  if (!templateId) return res.status(400).json({ message: "Invalid template id" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM cold_email_templates WHERE id = ?",
      [templateId]
    );
    if (!rows.length) return res.status(404).json({ message: "Template not found" });
    const tpl = rows[0];
    if (!tpl.user_id || Number(tpl.user_id) !== Number(userId)) {
      return res.status(403).json({ message: "Template not deletable" });
    }

    await pool.query(
      "UPDATE cold_email_campaigns SET template_id = NULL WHERE template_id = ? AND user_id = ?",
      [templateId, userId]
    );
    await pool.query("DELETE FROM cold_email_templates WHERE id = ? AND user_id = ?", [
      templateId,
      userId,
    ]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.deleteTemplate error:", err);
    return res.status(500).json({ message: "Failed to delete template" });
  }
};

exports.generateAiTemplate = async (req, res) => {
  const userId = req.user?.id;
  const apiKey = process.env.OPENAI_API_KEY;
  const prompt = String(req.body?.prompt || "").trim();
  const model = String(req.body?.model || process.env.OPENAI_MODEL || "gpt-4o-mini");

  if (!prompt) return res.status(400).json({ message: "Prompt required" });
  if (!apiKey) return res.status(400).json({ message: "OPENAI_API_KEY not configured" });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You write concise cold emails. Return JSON with keys: subject, body_text.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ message: "AI request failed", details: errText });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      parsed = { subject: "", body_text: content };
    }

    await pool.query(
      "INSERT INTO cold_email_ai_generations (user_id, prompt, model, output_json) VALUES (?, ?, ?, ?)",
      [userId, prompt, model, JSON.stringify(parsed)]
    );

    return res.json({ draft: parsed });
  } catch (err) {
    console.error("coldEmail.generateAiTemplate error:", err);
    return res.status(500).json({ message: "Failed to generate template" });
  }
};

exports.getCampaigns = async (req, res) => {
  const userId = req.user?.id;
  const limit = Math.min(Number(req.query?.limit || 20), 200);
  const offset = Math.max(Number(req.query?.offset || 0), 0);
  try {
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM cold_email_campaigns WHERE user_id = ?",
      [userId]
    );
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.status, c.schedule_type, c.scheduled_at, c.created_at, c.template_id,
        l.name AS list_name,
        (SELECT COUNT(*) FROM cold_email_messages m WHERE m.campaign_id = c.id) AS message_count
       FROM cold_email_campaigns c
       JOIN cold_email_lists l ON l.id = c.list_id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return res.json({ campaigns: rows, total: countRow?.total || 0, limit, offset });
  } catch (err) {
    console.error("coldEmail.getCampaigns error:", err);
    return res.status(500).json({ message: "Failed to load campaigns" });
  }
};

exports.createCampaign = async (req, res) => {
  const userId = req.user?.id;
  const name = String(req.body?.name || "").trim();
  const listId = Number(req.body?.list_id || 0);
  const templateId = req.body?.template_id ? Number(req.body.template_id) : null;
  const scheduleType = req.body?.schedule_type || "immediate";
  const scheduledAt = req.body?.scheduled_at ? toMysqlDateTime(req.body.scheduled_at) : null;

  if (!name) return res.status(400).json({ message: "Campaign name required" });
  if (!listId) return res.status(400).json({ message: "List required" });

  try {
    const list = await ensureListOwnership(listId, userId);
    if (!list) return res.status(404).json({ message: "List not found" });

    const [result] = await pool.query(
      `INSERT INTO cold_email_campaigns
        (user_id, list_id, template_id, name, schedule_type, scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, listId, templateId, name, scheduleType, scheduledAt]
    );

    return res.json({ id: result.insertId });
  } catch (err) {
    console.error("coldEmail.createCampaign error:", err);
    return res.status(500).json({ message: "Failed to create campaign" });
  }
};

exports.getCampaignDetail = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });

  try {
    const [rows] = await pool.query(
      `SELECT c.*, l.name AS list_name, t.name AS template_name
       FROM cold_email_campaigns c
       JOIN cold_email_lists l ON l.id = c.list_id
       LEFT JOIN cold_email_templates t ON t.id = c.template_id
       WHERE c.id = ? AND c.user_id = ?`,
      [campaignId, userId]
    );
    if (!rows.length) return res.status(404).json({ message: "Campaign not found" });

    const [steps] = await pool.query(
      `SELECT id, step_number, subject, body_html, body_text, delay_hours
       FROM cold_email_campaign_steps
       WHERE campaign_id = ?
       ORDER BY step_number ASC`,
      [campaignId]
    );

    return res.json({ campaign: rows[0], steps });
  } catch (err) {
    console.error("coldEmail.getCampaignDetail error:", err);
    return res.status(500).json({ message: "Failed to load campaign" });
  }
};

exports.updateCampaign = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });

  try {
    const campaign = await ensureCampaignOwnership(campaignId, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    if (!["draft", "paused"].includes(campaign.status)) {
      return res.status(409).json({ message: "Only draft or paused campaigns can be edited" });
    }

    const name = req.body?.name ? String(req.body.name).trim() : campaign.name;
    const listId = req.body?.list_id ? Number(req.body.list_id) : campaign.list_id;
    const templateId = req.body?.template_id ? Number(req.body.template_id) : campaign.template_id;
    const scheduleType = req.body?.schedule_type || campaign.schedule_type;
    const scheduledAt = req.body?.scheduled_at ? toMysqlDateTime(req.body.scheduled_at) : campaign.scheduled_at;

    if (!name) return res.status(400).json({ message: "Campaign name required" });
    const list = await ensureListOwnership(listId, userId);
    if (!list) return res.status(404).json({ message: "List not found" });

    await pool.query(
      `UPDATE cold_email_campaigns
       SET name = ?, list_id = ?, template_id = ?, schedule_type = ?, scheduled_at = ?
       WHERE id = ? AND user_id = ?`,
      [name, listId, templateId || null, scheduleType, scheduledAt, campaignId, userId]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.updateCampaign error:", err);
    return res.status(500).json({ message: "Failed to update campaign" });
  }
};

exports.deleteCampaign = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });

  try {
    const campaign = await ensureCampaignOwnership(campaignId, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    await pool.query(
      "DELETE FROM cold_email_events WHERE message_id IN (SELECT id FROM cold_email_messages WHERE campaign_id = ?)",
      [campaignId]
    );
    await pool.query("DELETE FROM cold_email_messages WHERE campaign_id = ?", [
      campaignId,
    ]);
    await pool.query("DELETE FROM cold_email_campaign_steps WHERE campaign_id = ?", [
      campaignId,
    ]);
    await pool.query("DELETE FROM cold_email_campaigns WHERE id = ? AND user_id = ?", [
      campaignId,
      userId,
    ]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.deleteCampaign error:", err);
    return res.status(500).json({ message: "Failed to delete campaign" });
  }
};

exports.setCampaignSteps = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  const steps = Array.isArray(req.body?.steps) ? req.body.steps : [];

  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });
  if (!steps.length) return res.status(400).json({ message: "Steps required" });

  try {
    const campaign = await ensureCampaignOwnership(campaignId, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const cleaned = steps
      .map((s, idx) => ({
        step_number: Number(s.step_number || idx + 1),
        subject: String(s.subject || "").trim(),
        body_html: s.body_html || null,
        body_text: s.body_text || null,
        delay_hours: Number(s.delay_hours || 0),
      }))
      .filter((s) => s.subject && (s.body_html || s.body_text));

    if (!cleaned.length) return res.status(400).json({ message: "Invalid steps" });

    await pool.query("DELETE FROM cold_email_campaign_steps WHERE campaign_id = ?", [
      campaignId,
    ]);

    const values = cleaned.map((s) => [
      campaignId,
      s.step_number,
      s.subject,
      s.body_html,
      s.body_text,
      s.delay_hours,
    ]);

    await pool.query(
      `INSERT INTO cold_email_campaign_steps
        (campaign_id, step_number, subject, body_html, body_text, delay_hours)
       VALUES ?`,
      [values]
    );

    return res.json({ steps: cleaned.length });
  } catch (err) {
    console.error("coldEmail.setCampaignSteps error:", err);
    return res.status(500).json({ message: "Failed to save steps" });
  }
};

exports.launchCampaign = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  const force = Boolean(req.body?.force);

  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });

  try {
    const campaign = await ensureCampaignOwnership(campaignId, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const [existing] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM cold_email_messages WHERE campaign_id = ?",
      [campaignId]
    );
    if (existing[0]?.cnt > 0 && !force) {
      return res.status(409).json({ message: "Campaign already has queued messages" });
    }
    if (existing[0]?.cnt > 0 && force) {
      await pool.query("DELETE FROM cold_email_messages WHERE campaign_id = ?", [
        campaignId,
      ]);
    }

    const [steps] = await pool.query(
      `SELECT id, step_number, subject, body_html, body_text, delay_hours
       FROM cold_email_campaign_steps
       WHERE campaign_id = ?
       ORDER BY step_number ASC`,
      [campaignId]
    );
    if (!steps.length) return res.status(400).json({ message: "Add steps first" });

    const [contacts] = await pool.query(
      `SELECT c.id, c.email
       FROM cold_email_list_items li
       JOIN cold_email_contacts c ON c.id = li.contact_id
       WHERE li.list_id = ? AND li.status = 'active'`,
      [campaign.list_id]
    );
    if (!contacts.length) return res.status(400).json({ message: "List has no contacts" });

    let baseTime = new Date();
    if (campaign.schedule_type === "scheduled") {
      if (!campaign.scheduled_at) {
        return res.status(400).json({ message: "Scheduled time required" });
      }
      baseTime = new Date(campaign.scheduled_at);
    }

    const messages = [];
    for (const contact of contacts) {
      for (const step of steps) {
        const scheduled = new Date(baseTime.getTime() + step.delay_hours * 3600 * 1000);
        messages.push([campaignId, contact.id, step.id, toMysqlDateTime(scheduled)]);
      }
    }

    for (const batch of chunk(messages, MAX_BATCH)) {
      await pool.query(
        `INSERT INTO cold_email_messages
          (campaign_id, contact_id, step_id, scheduled_at)
         VALUES ?`,
        [batch]
      );
    }

    await pool.query(
      "UPDATE cold_email_campaigns SET status = ? WHERE id = ?",
      ["scheduled", campaignId]
    );

    return res.json({ queued: messages.length });
  } catch (err) {
    console.error("coldEmail.launchCampaign error:", err);
    return res.status(500).json({ message: "Failed to launch campaign" });
  }
};

exports.pauseCampaign = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });

  try {
    const campaign = await ensureCampaignOwnership(campaignId, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    await pool.query("UPDATE cold_email_campaigns SET status = ? WHERE id = ?", [
      "paused",
      campaignId,
    ]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.pauseCampaign error:", err);
    return res.status(500).json({ message: "Failed to pause campaign" });
  }
};

exports.getCampaignMessages = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });

  try {
    const campaign = await ensureCampaignOwnership(campaignId, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const [rows] = await pool.query(
      `SELECT m.id, m.status, m.scheduled_at, m.sent_at, m.error_text,
        c.email, s.step_number
       FROM cold_email_messages m
       JOIN cold_email_contacts c ON c.id = m.contact_id
       JOIN cold_email_campaign_steps s ON s.id = m.step_id
       WHERE m.campaign_id = ?
       ORDER BY m.scheduled_at DESC
       LIMIT 200`,
      [campaignId]
    );

    return res.json({ messages: rows });
  } catch (err) {
    console.error("coldEmail.getCampaignMessages error:", err);
    return res.status(500).json({ message: "Failed to load messages" });
  }
};

exports.getCampaignContacts = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  const limit = Math.min(Number(req.query?.limit || 50), 200);
  const offset = Math.max(Number(req.query?.offset || 0), 0);
  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });

  try {
    const campaign = await ensureCampaignOwnership(campaignId, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM cold_email_messages WHERE campaign_id = ?",
      [campaignId]
    );

    const [rows] = await pool.query(
      `SELECT m.id AS message_id, m.status, m.scheduled_at, m.sent_at,
        c.email, c.first_name, c.last_name,
        s.step_number,
        (SELECT e.event_type FROM cold_email_events e WHERE e.message_id = m.id ORDER BY e.occurred_at DESC LIMIT 1) AS last_event,
        (SELECT e.occurred_at FROM cold_email_events e WHERE e.message_id = m.id ORDER BY e.occurred_at DESC LIMIT 1) AS last_event_at
       FROM cold_email_messages m
       JOIN cold_email_contacts c ON c.id = m.contact_id
       JOIN cold_email_campaign_steps s ON s.id = m.step_id
       WHERE m.campaign_id = ?
       ORDER BY m.scheduled_at DESC
       LIMIT ? OFFSET ?`,
      [campaignId, limit, offset]
    );

    return res.json({
      messages: rows,
      total: countRow?.total || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("coldEmail.getCampaignContacts error:", err);
    return res.status(500).json({ message: "Failed to load campaign contacts" });
  }
};

exports.getCampaignHistory = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });

  try {
    const campaign = await ensureCampaignOwnership(campaignId, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const [[timing]] = await pool.query(
      `SELECT MIN(scheduled_at) AS first_scheduled,
        MAX(scheduled_at) AS last_scheduled,
        MIN(sent_at) AS first_sent,
        MAX(sent_at) AS last_sent
       FROM cold_email_messages
       WHERE campaign_id = ?`,
      [campaignId]
    );

    const [statusCounts] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM cold_email_messages
       WHERE campaign_id = ?
       GROUP BY status`,
      [campaignId]
    );

    const [eventCounts] = await pool.query(
      `SELECT event_type, COUNT(*) AS count
       FROM cold_email_events
       WHERE message_id IN (SELECT id FROM cold_email_messages WHERE campaign_id = ?)
       GROUP BY event_type`,
      [campaignId]
    );

    return res.json({
      campaign_id: campaignId,
      scheduled_at: campaign.scheduled_at,
      created_at: campaign.created_at,
      timing,
      status_counts: statusCounts,
      event_counts: eventCounts,
    });
  } catch (err) {
    console.error("coldEmail.getCampaignHistory error:", err);
    return res.status(500).json({ message: "Failed to load campaign history" });
  }
};

exports.createEvent = async (req, res) => {
  const userId = req.user?.id;
  const messageId = Number(req.body?.message_id);
  const eventType = String(req.body?.event_type || "").trim();
  const metadata = req.body?.metadata || null;
  if (!messageId || !eventType) {
    return res.status(400).json({ message: "message_id and event_type required" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT m.id, c.user_id
       FROM cold_email_messages m
       JOIN cold_email_campaigns c ON c.id = m.campaign_id
       WHERE m.id = ?`,
      [messageId]
    );
    if (!rows.length) return res.status(404).json({ message: "Message not found" });
    if (rows[0].user_id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await pool.query(
      `INSERT INTO cold_email_events (message_id, event_type, occurred_at, metadata_json)
       VALUES (?, ?, NOW(), ?)`,
      [messageId, eventType, metadata ? JSON.stringify(metadata) : null]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.createEvent error:", err);
    return res.status(500).json({ message: "Failed to create event" });
  }
};

exports.getCampaignStats = async (req, res) => {
  const userId = req.user?.id;
  const campaignId = Number(req.params.id);
  if (!campaignId) return res.status(400).json({ message: "Invalid campaign id" });

  try {
    const campaign = await ensureCampaignOwnership(campaignId, userId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM cold_email_messages
       WHERE campaign_id = ?
       GROUP BY status`,
      [campaignId]
    );
    return res.json({ stats: rows });
  } catch (err) {
    console.error("coldEmail.getCampaignStats error:", err);
    return res.status(500).json({ message: "Failed to load stats" });
  }
};

exports.unsubscribe = async (req, res) => {
  const email = normalizeEmail(req.body?.email || "");
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: "Valid email required" });
  }

  try {
    await pool.query(
      "INSERT INTO cold_email_suppression (user_id, email, reason) VALUES (?, ?, ?)",
      [null, email, "unsubscribe"]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("coldEmail.unsubscribe error:", err);
    return res.status(500).json({ message: "Failed to unsubscribe" });
  }
};
