import React, { useEffect, useState } from "react";
import api from "../api";

const cardCls =
  "bg-[color:var(--surface)] border border-[color:var(--border-color)] rounded-xl shadow-sm p-4";
const labelCls = "block text-xs font-semibold text-[color:var(--text-primary)]";
const inputCls =
  "mt-1 w-full h-9 rounded-md border border-[color:var(--border-color)] px-3 text-xs bg-[color:var(--surface)] text-[color:var(--text-primary)]";
const btnCls =
  "inline-flex items-center gap-2 px-3 py-2 border border-[color:var(--border-color)] rounded-md bg-[color:var(--surface)] text-xs text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]";

function StepEditor({ steps, setSteps }) {
  const updateStep = (idx, key, value) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s))
    );
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { subject: "", body_text: "", delay_hours: 0 },
    ]);
  };

  const removeStep = (idx) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => (
        <div key={`step-${idx}`} className="border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[color:var(--text-primary)]">
              Step {idx + 1}
            </div>
            {steps.length > 1 && (
              <button type="button" onClick={() => removeStep(idx)} className={btnCls}>
                Remove
              </button>
            )}
          </div>
          <label className="block mt-3">
            <span className={labelCls}>Subject</span>
            <input
              className={inputCls}
              value={step.subject}
              onChange={(e) => updateStep(idx, "subject", e.target.value)}
              placeholder="Subject line"
            />
          </label>
          <label className="block mt-3">
            <span className={labelCls}>Body (text)</span>
            <textarea
              className="mt-1 w-full min-h-[120px] rounded-md border border-[color:var(--border-color)] px-3 py-2 text-xs bg-[color:var(--surface)] text-[color:var(--text-primary)]"
              value={step.body_text}
              onChange={(e) => updateStep(idx, "body_text", e.target.value)}
              placeholder="Hi {{first_name}}, ..."
            />
          </label>
          <label className="block mt-3">
            <span className={labelCls}>Delay (hours after previous step)</span>
            <input
              className={inputCls}
              type="number"
              min="0"
              value={step.delay_hours}
              onChange={(e) => updateStep(idx, "delay_hours", e.target.value)}
            />
          </label>
        </div>
      ))}
      <button type="button" onClick={addStep} className={btnCls}>
        Add Step
      </button>
    </div>
  );
}

export default function ColdEmail() {
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsListId, setContactsListId] = useState("");
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactDraft, setContactDraft] = useState({});
  const [campaignHistory, setCampaignHistory] = useState(null);
  const [campaignMessages, setCampaignMessages] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [listName, setListName] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [emailsText, setEmailsText] = useState("");
  const [fileText, setFileText] = useState("");

  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateType, setTemplateType] = useState("custom");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState(null);

  const [campaignName, setCampaignName] = useState("");
  const [campaignListId, setCampaignListId] = useState("");
  const [campaignTemplateId, setCampaignTemplateId] = useState("");
  const [scheduleType, setScheduleType] = useState("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [steps, setSteps] = useState([
    { subject: "", body_text: "", delay_hours: 0 },
  ]);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [listsRes, templatesRes, campaignsRes] = await Promise.all([
        api.get("/api/cold-email/lists"),
        api.get("/api/cold-email/templates"),
        api.get("/api/cold-email/campaigns"),
      ]);
      setLists(listsRes.data.lists || []);
      setTemplates(templatesRes.data.templates || []);
      setCampaigns(campaignsRes.data.campaigns || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load cold email data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadContacts = async (listId = "") => {
    setContactsLoading(true);
    try {
      const params = listId ? { list_id: listId } : {};
      const res = await api.get("/api/cold-email/contacts", { params });
      setContacts(res.data.contacts || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load contacts");
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts(contactsListId);
  }, [contactsListId]);

  useEffect(() => {
    if (!campaignTemplateId) return;
    const tpl = templates.find((t) => String(t.id) === String(campaignTemplateId));
    if (!tpl) return;
    setSteps((prev) => {
      const next = prev.length ? [...prev] : [{ subject: "", body_text: "", delay_hours: 0 }];
      next[0] = {
        ...next[0],
        subject: tpl.subject || next[0].subject,
        body_text: tpl.body_text || next[0].body_text,
      };
      return next;
    });
  }, [campaignTemplateId, templates]);

  const createList = async () => {
    if (!listName.trim()) return;
    try {
      await api.post("/api/cold-email/lists", { name: listName.trim() });
      setListName("");
      await loadAll();
      await loadContacts(contactsListId);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create list");
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setFileText(String(evt.target?.result || ""));
    };
    reader.readAsText(file);
  };

  const addContacts = async () => {
    if (!selectedListId) return;
    try {
      await api.post(`/api/cold-email/lists/${selectedListId}/contacts`, {
        text: emailsText,
        fileText,
      });
      setEmailsText("");
      setFileText("");
      await loadAll();
      if (!contactsListId || String(contactsListId) === String(selectedListId)) {
        await loadContacts(selectedListId);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add contacts");
    }
  };

  const removeContacts = async () => {
    if (!selectedListId) return;
    try {
      await api.post(`/api/cold-email/lists/${selectedListId}/contacts/remove`, {
        text: emailsText,
        fileText,
      });
      setEmailsText("");
      setFileText("");
      await loadAll();
      if (!contactsListId || String(contactsListId) === String(selectedListId)) {
        await loadContacts(selectedListId);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove contacts");
    }
  };

  const startEditContact = (contact) => {
    setEditingContactId(contact.id);
    setContactDraft({
      email: contact.email || "",
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      company: contact.company || "",
      title: contact.title || "",
      list_status: contact.list_status || "active",
    });
  };

  const saveContact = async (id) => {
    try {
      const payload = {
        email: contactDraft.email,
        first_name: contactDraft.first_name,
        last_name: contactDraft.last_name,
        company: contactDraft.company,
        title: contactDraft.title,
      };
      if (contactsListId) {
        payload.list_id = Number(contactsListId);
        payload.list_status = contactDraft.list_status || "active";
      }
      await api.put(`/api/cold-email/contacts/${id}`, payload);
      setEditingContactId(null);
      setContactDraft({});
      await loadContacts(contactsListId);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update contact");
    }
  };

  const deleteContact = async (id) => {
    try {
      const params = contactsListId ? { list_id: contactsListId } : {};
      await api.delete(`/api/cold-email/contacts/${id}`, { params });
      await loadContacts(contactsListId);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete contact");
    }
  };

  const createTemplate = async () => {
    if (!templateName.trim() || !templateSubject.trim()) return;
    try {
      await api.post("/api/cold-email/templates", {
        name: templateName.trim(),
        subject: templateSubject.trim(),
        body_text: templateBody,
        template_type: templateType,
      });
      setTemplateName("");
      setTemplateSubject("");
      setTemplateBody("");
      setTemplateType("custom");
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create template");
    }
  };

  const generateTemplate = async () => {
    if (!aiPrompt.trim()) return;
    try {
      const res = await api.post("/api/cold-email/templates/ai", {
        prompt: aiPrompt.trim(),
      });
      setAiDraft(res.data.draft || null);
      if (res.data.draft?.subject) setTemplateSubject(res.data.draft.subject);
      if (res.data.draft?.body_text) setTemplateBody(res.data.draft.body_text);
      setTemplateType("ai");
    } catch (err) {
      setError(err?.response?.data?.message || "AI generation failed");
    }
  };

  const createCampaign = async (launchNow) => {
    if (!campaignName.trim() || !campaignListId) return;
    try {
      let campaignId = editingCampaignId;
      if (editingCampaignId) {
        await api.put(`/api/cold-email/campaigns/${editingCampaignId}`, {
          name: campaignName.trim(),
          list_id: Number(campaignListId),
          template_id: campaignTemplateId ? Number(campaignTemplateId) : null,
          schedule_type: scheduleType,
          scheduled_at: scheduledAt || null,
        });
      } else {
        const res = await api.post("/api/cold-email/campaigns", {
          name: campaignName.trim(),
          list_id: Number(campaignListId),
          template_id: campaignTemplateId ? Number(campaignTemplateId) : null,
          schedule_type: scheduleType,
          scheduled_at: scheduledAt || null,
        });
        campaignId = res.data.id;
      }

      await api.post(`/api/cold-email/campaigns/${campaignId}/steps`, { steps });

      if (launchNow) {
        await api.post(`/api/cold-email/campaigns/${campaignId}/launch`);
      }

      setCampaignName("");
      setCampaignListId("");
      setCampaignTemplateId("");
      setScheduleType("immediate");
      setScheduledAt("");
      setSteps([{ subject: "", body_text: "", delay_hours: 0 }]);
      setEditingCampaignId(null);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create campaign");
    }
  };

  const launchCampaign = async (id) => {
    try {
      await api.post(`/api/cold-email/campaigns/${id}/launch`);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to launch campaign");
    }
  };

  const pauseCampaign = async (id) => {
    try {
      await api.post(`/api/cold-email/campaigns/${id}/pause`);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to pause campaign");
    }
  };

  const editCampaign = async (id) => {
    try {
      const res = await api.get(`/api/cold-email/campaigns/${id}`);
      const campaign = res.data.campaign;
      const dtValue = campaign.scheduled_at
        ? String(campaign.scheduled_at).replace(" ", "T").slice(0, 16)
        : "";
      setCampaignName(campaign.name || "");
      setCampaignListId(String(campaign.list_id || ""));
      setCampaignTemplateId(campaign.template_id ? String(campaign.template_id) : "");
      setScheduleType(campaign.schedule_type || "immediate");
      setScheduledAt(dtValue);
      setSteps(
        (res.data.steps || []).map((s) => ({
          subject: s.subject || "",
          body_text: s.body_text || "",
          delay_hours: s.delay_hours || 0,
        }))
      );
      setEditingCampaignId(id);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load campaign");
    }
  };

  const deleteCampaign = async (id) => {
    try {
      await api.delete(`/api/cold-email/campaigns/${id}`);
      if (String(selectedCampaignId) === String(id)) {
        setSelectedCampaignId("");
        setCampaignHistory(null);
        setCampaignMessages([]);
      }
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete campaign");
    }
  };

  const loadCampaignActivity = async (id) => {
    try {
      const [historyRes, messagesRes] = await Promise.all([
        api.get(`/api/cold-email/campaigns/${id}/history`),
        api.get(`/api/cold-email/campaigns/${id}/contacts`),
      ]);
      setCampaignHistory(historyRes.data || null);
      setCampaignMessages(messagesRes.data.messages || []);
      setSelectedCampaignId(id);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load campaign activity");
    }
  };

  const cancelCampaignEdit = () => {
    setEditingCampaignId(null);
    setCampaignName("");
    setCampaignListId("");
    setCampaignTemplateId("");
    setScheduleType("immediate");
    setScheduledAt("");
    setSteps([{ subject: "", body_text: "", delay_hours: 0 }]);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Cold Email
        </h1>
        {loading && (
          <span className="text-xs text-[color:var(--text-muted)]">Loading...</span>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            Lists
          </h2>
          <label className="block mt-3">
            <span className={labelCls}>New list name</span>
            <input
              className={inputCls}
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Prospects - Q1"
            />
          </label>
          <button type="button" onClick={createList} className={`${btnCls} mt-3`}>
            Create List
          </button>

          <div className="mt-6 border-t pt-4">
            <label className="block">
              <span className={labelCls}>Select list</span>
              <select
                className={inputCls}
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
              >
                <option value="">Choose list</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.contact_count || 0})
                  </option>
                ))}
              </select>
            </label>

            <label className="block mt-3">
              <span className={labelCls}>Paste emails (comma or line separated)</span>
              <textarea
                className="mt-1 w-full min-h-[120px] rounded-md border border-[color:var(--border-color)] px-3 py-2 text-xs bg-[color:var(--surface)] text-[color:var(--text-primary)]"
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder="jane@acme.com, john@company.com"
              />
            </label>

            <label className="block mt-3">
              <span className={labelCls}>Upload file (CSV or TXT)</span>
              <input className="mt-2 text-xs" type="file" onChange={onFileChange} />
              {fileText ? (
                <div className="text-[11px] text-[color:var(--text-muted)] mt-1">
                  File loaded
                </div>
              ) : null}
            </label>

            <button type="button" onClick={addContacts} className={`${btnCls} mt-3`}>
              Add Contacts
            </button>
            <button type="button" onClick={removeContacts} className={`${btnCls} mt-3 ml-2`}>
              Remove Contacts
            </button>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-[color:var(--text-primary)]">
              Existing lists
            </div>
            <ul className="mt-2 space-y-2 text-xs text-[color:var(--text-primary)]">
              {lists.map((list) => (
                <li key={list.id} className="flex items-center justify-between">
                  <span>{list.name}</span>
                  <span className="text-[color:var(--text-muted)]">
                    {list.contact_count || 0} contacts
                  </span>
                </li>
              ))}
              {lists.length === 0 && (
                <li className="text-[color:var(--text-muted)]">No lists yet.</li>
              )}
            </ul>
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            Templates
          </h2>

          <label className="block mt-3">
            <span className={labelCls}>AI prompt</span>
            <textarea
              className="mt-1 w-full min-h-[100px] rounded-md border border-[color:var(--border-color)] px-3 py-2 text-xs bg-[color:var(--surface)] text-[color:var(--text-primary)]"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Write a short cold email for founders about a data tool..."
            />
          </label>
          <button type="button" onClick={generateTemplate} className={`${btnCls} mt-2`}>
            Generate with AI
          </button>
          {aiDraft && (
            <div className="mt-2 text-[11px] text-[color:var(--text-muted)]">
              AI draft ready. Review and save below.
            </div>
          )}

          <label className="block mt-4">
            <span className={labelCls}>Template name</span>
            <input
              className={inputCls}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Founder intro"
            />
          </label>
          <label className="block mt-3">
            <span className={labelCls}>Subject</span>
            <input
              className={inputCls}
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
              placeholder="Quick question, {{first_name}}"
            />
          </label>
          <label className="block mt-3">
            <span className={labelCls}>Body</span>
            <textarea
              className="mt-1 w-full min-h-[140px] rounded-md border border-[color:var(--border-color)] px-3 py-2 text-xs bg-[color:var(--surface)] text-[color:var(--text-primary)]"
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              placeholder="Hi {{first_name}}, ..."
            />
          </label>
          <label className="block mt-3">
            <span className={labelCls}>Template type</span>
            <select
              className={inputCls}
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
            >
              <option value="custom">Custom</option>
              <option value="predefined">Predefined</option>
              <option value="ai">AI</option>
            </select>
          </label>
          <button type="button" onClick={createTemplate} className={`${btnCls} mt-3`}>
            Save Template
          </button>

          <div className="mt-6">
            <div className="text-xs font-semibold text-[color:var(--text-primary)]">
              Existing templates
            </div>
            <ul className="mt-2 space-y-2 text-xs text-[color:var(--text-primary)]">
              {templates.map((tpl) => (
                <li key={tpl.id} className="flex items-center justify-between">
                  <span>{tpl.name}</span>
                  <span className="text-[color:var(--text-muted)]">
                    {tpl.template_type}
                  </span>
                </li>
              ))}
              {templates.length === 0 && (
                <li className="text-[color:var(--text-muted)]">No templates yet.</li>
              )}
            </ul>
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            Campaigns
          </h2>
          {editingCampaignId && (
            <div className="mt-2 text-[11px] text-[color:var(--text-muted)]">
              Editing campaign ID: {editingCampaignId}
            </div>
          )}
          <label className="block mt-3">
            <span className={labelCls}>Campaign name</span>
            <input
              className={inputCls}
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Product outreach"
            />
          </label>
          <label className="block mt-3">
            <span className={labelCls}>List</span>
            <select
              className={inputCls}
              value={campaignListId}
              onChange={(e) => setCampaignListId(e.target.value)}
            >
              <option value="">Choose list</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block mt-3">
            <span className={labelCls}>Template (optional)</span>
            <select
              className={inputCls}
              value={campaignTemplateId}
              onChange={(e) => setCampaignTemplateId(e.target.value)}
            >
              <option value="">Choose template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block mt-3">
            <span className={labelCls}>Schedule</span>
            <select
              className={inputCls}
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value)}
            >
              <option value="immediate">Send now</option>
              <option value="scheduled">Scheduled time</option>
            </select>
          </label>
          {scheduleType === "scheduled" && (
            <label className="block mt-3">
              <span className={labelCls}>Scheduled at (local time)</span>
              <input
                className={inputCls}
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </label>
          )}

          <div className="mt-4">
            <div className="text-xs font-semibold text-[color:var(--text-primary)] mb-2">
              Steps
            </div>
            <StepEditor steps={steps} setSteps={setSteps} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => createCampaign(false)} className={btnCls}>
              {editingCampaignId ? "Save Changes" : "Save Draft"}
            </button>
            <button type="button" onClick={() => createCampaign(true)} className={btnCls}>
              {editingCampaignId ? "Save + Launch" : "Save + Launch"}
            </button>
            {editingCampaignId && (
              <button type="button" onClick={cancelCampaignEdit} className={btnCls}>
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-[color:var(--text-primary)]">
              Existing campaigns
            </div>
            <ul className="mt-2 space-y-2 text-xs text-[color:var(--text-primary)]">
              {campaigns.map((c) => (
                <li key={c.id} className="border rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[color:var(--text-muted)]">{c.status}</span>
                  </div>
                  <div className="text-[11px] text-[color:var(--text-muted)] mt-1">
                    List: {c.list_name} · Messages: {c.message_count || 0}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => launchCampaign(c.id)} className={btnCls}>
                      Launch
                    </button>
                    <button type="button" onClick={() => pauseCampaign(c.id)} className={btnCls}>
                      Pause
                    </button>
                    <button type="button" onClick={() => editCampaign(c.id)} className={btnCls}>
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteCampaign(c.id)} className={btnCls}>
                      Delete
                    </button>
                    <button type="button" onClick={() => loadCampaignActivity(c.id)} className={btnCls}>
                      View
                    </button>
                  </div>
                </li>
              ))}
              {campaigns.length === 0 && (
                <li className="text-[color:var(--text-muted)]">No campaigns yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
              Contacts
            </h2>
            {contactsLoading && (
              <span className="text-[11px] text-[color:var(--text-muted)]">
                Loading...
              </span>
            )}
          </div>

          <label className="block mt-3">
            <span className={labelCls}>Filter by list</span>
            <select
              className={inputCls}
              value={contactsListId}
              onChange={(e) => setContactsListId(e.target.value)}
            >
              <option value="">All contacts</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 max-h-[420px] overflow-auto border rounded-lg">
            {contacts.length === 0 ? (
              <div className="p-3 text-xs text-[color:var(--text-muted)]">
                No contacts found.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-[color:var(--surface-muted)] text-[color:var(--text-primary)]">
                  <tr>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Company</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-2">
                        {editingContactId === c.id ? (
                          <input
                            className={inputCls}
                            value={contactDraft.email || ""}
                            onChange={(e) =>
                              setContactDraft((prev) => ({ ...prev, email: e.target.value }))
                            }
                          />
                        ) : (
                          <div>
                            <div>{c.email}</div>
                            <div className="text-[10px] text-[color:var(--text-muted)]">
                              {c.email_valid ? "valid" : "invalid"}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        {editingContactId === c.id ? (
                          <div className="space-y-2">
                            <input
                              className={inputCls}
                              value={contactDraft.first_name || ""}
                              onChange={(e) =>
                                setContactDraft((prev) => ({
                                  ...prev,
                                  first_name: e.target.value,
                                }))
                              }
                              placeholder="First"
                            />
                            <input
                              className={inputCls}
                              value={contactDraft.last_name || ""}
                              onChange={(e) =>
                                setContactDraft((prev) => ({
                                  ...prev,
                                  last_name: e.target.value,
                                }))
                              }
                              placeholder="Last"
                            />
                          </div>
                        ) : (
                          <div>
                            {(c.first_name || "") + " " + (c.last_name || "")}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        {editingContactId === c.id ? (
                          <div className="space-y-2">
                            <input
                              className={inputCls}
                              value={contactDraft.company || ""}
                              onChange={(e) =>
                                setContactDraft((prev) => ({
                                  ...prev,
                                  company: e.target.value,
                                }))
                              }
                              placeholder="Company"
                            />
                            <input
                              className={inputCls}
                              value={contactDraft.title || ""}
                              onChange={(e) =>
                                setContactDraft((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="Title"
                            />
                          </div>
                        ) : (
                          <div>
                            <div>{c.company || "-"}</div>
                            <div className="text-[10px] text-[color:var(--text-muted)]">
                              {c.title || ""}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        {contactsListId ? (
                          editingContactId === c.id ? (
                            <select
                              className={inputCls}
                              value={contactDraft.list_status || "active"}
                              onChange={(e) =>
                                setContactDraft((prev) => ({
                                  ...prev,
                                  list_status: e.target.value,
                                }))
                              }
                            >
                              <option value="active">active</option>
                              <option value="bounced">bounced</option>
                              <option value="unsubscribed">unsubscribed</option>
                              <option value="suppressed">suppressed</option>
                            </select>
                          ) : (
                            <span>{c.list_status || "active"}</span>
                          )
                        ) : (
                          <span>{c.list_count || 0} lists</span>
                        )}
                      </td>
                      <td className="p-2">
                        {editingContactId === c.id ? (
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className={btnCls} onClick={() => saveContact(c.id)}>
                              Save
                            </button>
                            <button
                              type="button"
                              className={btnCls}
                              onClick={() => {
                                setEditingContactId(null);
                                setContactDraft({});
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className={btnCls} onClick={() => startEditContact(c)}>
                              Edit
                            </button>
                            <button type="button" className={btnCls} onClick={() => deleteContact(c.id)}>
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
              Campaign Activity
            </h2>
            {selectedCampaignId && (
              <span className="text-[11px] text-[color:var(--text-muted)]">
                Campaign ID: {selectedCampaignId}
              </span>
            )}
          </div>

          {!selectedCampaignId && (
            <div className="mt-3 text-xs text-[color:var(--text-muted)]">
              Select "View" on a campaign to see its history and message status.
            </div>
          )}

          {selectedCampaignId && (
            <>
              <div className="mt-3 text-xs text-[color:var(--text-primary)]">
                <div>
                  Scheduled: {campaignHistory?.scheduled_at || "-"}
                </div>
                <div>
                  First scheduled: {campaignHistory?.timing?.first_scheduled || "-"}
                </div>
                <div>
                  Last sent: {campaignHistory?.timing?.last_sent || "-"}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                {(campaignHistory?.status_counts || []).map((item) => (
                  <div key={`status-${item.status}`} className="border rounded-md p-2">
                    <div className="text-[color:var(--text-muted)]">{item.status}</div>
                    <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {item.count}
                    </div>
                  </div>
                ))}
                {(campaignHistory?.event_counts || []).map((item) => (
                  <div key={`event-${item.event_type}`} className="border rounded-md p-2">
                    <div className="text-[color:var(--text-muted)]">{item.event_type}</div>
                    <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {item.count}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 max-h-[360px] overflow-auto border rounded-lg">
                {campaignMessages.length === 0 ? (
                  <div className="p-3 text-xs text-[color:var(--text-muted)]">
                    No messages yet.
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-[color:var(--surface-muted)] text-[color:var(--text-primary)]">
                      <tr>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Step</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Event</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignMessages.map((m) => (
                        <tr key={m.message_id} className="border-t">
                          <td className="p-2">{m.email}</td>
                          <td className="p-2">{m.step_number}</td>
                          <td className="p-2">{m.status}</td>
                          <td className="p-2">
                            {m.last_event || "none"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
