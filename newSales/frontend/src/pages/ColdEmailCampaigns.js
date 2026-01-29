import React, { useEffect, useState } from "react";
import api from "../api";
import Pagination from "../components/Pagination";

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

export default function ColdEmailCampaigns() {
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignTotal, setCampaignTotal] = useState(0);
  const [campaignPage, setCampaignPage] = useState(1);
  const campaignLimit = 8;
  const [campaignName, setCampaignName] = useState("");
  const [campaignListId, setCampaignListId] = useState("");
  const [campaignTemplateId, setCampaignTemplateId] = useState("");
  const [scheduleType, setScheduleType] = useState("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [steps, setSteps] = useState([
    { subject: "", body_text: "", delay_hours: 0 },
  ]);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState(null);
  const [campaignHistory, setCampaignHistory] = useState(null);
  const [campaignMessages, setCampaignMessages] = useState([]);
  const [messageTotal, setMessageTotal] = useState(0);
  const [messagePage, setMessagePage] = useState(1);
  const messageLimit = 25;
  const [emailsText, setEmailsText] = useState("");
  const [fileText, setFileText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAll = async (page = campaignPage) => {
    setLoading(true);
    setError("");
    try {
      const offset = (page - 1) * campaignLimit;
      const [listsRes, templatesRes, campaignsRes] = await Promise.all([
        api.get("/api/cold-email/lists", { params: { limit: 500, offset: 0 } }),
        api.get("/api/cold-email/templates", { params: { limit: 500, offset: 0 } }),
        api.get("/api/cold-email/campaigns", {
          params: { limit: campaignLimit, offset },
        }),
      ]);
      setLists(listsRes.data.lists || []);
      setTemplates(templatesRes.data.templates || []);
      setCampaigns(campaignsRes.data.campaigns || []);
      setCampaignTotal(campaignsRes.data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [campaignPage]);

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

  const createOrUpdateCampaign = async (launchNow) => {
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
      setCampaignPage(1);
      await loadAll(1);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save campaign");
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
        setSelectedCampaignDetail(null);
      }
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete campaign");
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

  const fetchCampaignActivity = async (id, page = messagePage) => {
    try {
      const offset = (page - 1) * messageLimit;
      const [detailRes, historyRes, messagesRes] = await Promise.all([
        api.get(`/api/cold-email/campaigns/${id}`),
        api.get(`/api/cold-email/campaigns/${id}/history`),
        api.get(`/api/cold-email/campaigns/${id}/contacts`, {
          params: { limit: messageLimit, offset },
        }),
      ]);
      setSelectedCampaignDetail(detailRes.data?.campaign || null);
      setCampaignHistory(historyRes.data || null);
      setCampaignMessages(messagesRes.data.messages || []);
      setMessageTotal(messagesRes.data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load campaign activity");
    }
  };

  useEffect(() => {
    if (!selectedCampaignId) return;
    fetchCampaignActivity(selectedCampaignId, messagePage);
  }, [selectedCampaignId, messagePage]);

  const cancelEdit = () => {
    setEditingCampaignId(null);
    setCampaignName("");
    setCampaignListId("");
    setCampaignTemplateId("");
    setScheduleType("immediate");
    setScheduledAt("");
    setSteps([{ subject: "", body_text: "", delay_hours: 0 }]);
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

  const updateCampaignList = async (action) => {
    const listId = selectedCampaignDetail?.list_id;
    if (!selectedCampaignId || !listId) return;
    try {
      const path =
        action === "remove"
          ? `/api/cold-email/lists/${listId}/contacts/remove`
          : `/api/cold-email/lists/${listId}/contacts`;
      await api.post(path, {
        text: emailsText,
        fileText,
      });
      setEmailsText("");
      setFileText("");
      await loadAll();
      if (selectedCampaignId) {
        await fetchCampaignActivity(selectedCampaignId, messagePage);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update campaign list");
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Cold Email Campaigns
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            {editingCampaignId ? "Edit Campaign" : "Create Campaign"}
          </h2>

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
            <button type="button" onClick={() => createOrUpdateCampaign(false)} className={btnCls}>
              {editingCampaignId ? "Save Changes" : "Save Draft"}
            </button>
            <button type="button" onClick={() => createOrUpdateCampaign(true)} className={btnCls}>
              Save + Launch
            </button>
            {editingCampaignId && (
              <button type="button" onClick={cancelEdit} className={btnCls}>
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            All Campaigns
          </h2>
          <div className="mt-4 sd-table-wrap overflow-x-auto">
            {campaigns.length === 0 ? (
              <div className="p-3 text-xs text-[color:var(--text-muted)]">
                No campaigns yet.
              </div>
            ) : (
              <table className="sd-table w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="p-2">
                        <div className="font-medium cell-capitalize">{c.name}</div>
                        <div className="text-[10px] text-[color:var(--text-muted)]">
                          {c.list_name} · {c.message_count || 0} messages
                        </div>
                      </td>
                      <td className="p-2">{c.status}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={btnCls} onClick={() => launchCampaign(c.id)}>
                            Launch
                          </button>
                          <button type="button" className={btnCls} onClick={() => pauseCampaign(c.id)}>
                            Pause
                          </button>
                          <button type="button" className={btnCls} onClick={() => editCampaign(c.id)}>
                            Edit
                          </button>
                          <button type="button" className={btnCls} onClick={() => deleteCampaign(c.id)}>
                            Delete
                          </button>
                          <button
                            type="button"
                            className={btnCls}
                            onClick={() => {
                              setSelectedCampaignId(String(c.id));
                              setMessagePage(1);
                            }}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination
            total={campaignTotal}
            limit={campaignLimit}
            offset={(campaignPage - 1) * campaignLimit}
            onPageChange={(next) => setCampaignPage(next)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            Campaign Activity
          </h2>
          {!selectedCampaignId && (
            <div className="mt-3 text-xs text-[color:var(--text-muted)]">
              Select "View" on a campaign to see its history and message status.
            </div>
          )}

          {selectedCampaignId && (
            <>
              <div className="mt-3 text-xs text-[color:var(--text-primary)]">
                <div>Scheduled: {campaignHistory?.scheduled_at || "-"}</div>
                <div>First scheduled: {campaignHistory?.timing?.first_scheduled || "-"}</div>
                <div>Last sent: {campaignHistory?.timing?.last_sent || "-"}</div>
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

              <div className="mt-4 sd-table-wrap overflow-x-auto">
                {campaignMessages.length === 0 ? (
                  <div className="p-3 text-xs text-[color:var(--text-muted)]">
                    No messages yet.
                  </div>
                ) : (
                  <table className="sd-table w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Step</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Event</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignMessages.map((m) => (
                        <tr key={m.message_id}>
                          <td className="p-2">{m.email}</td>
                          <td className="p-2">{m.step_number}</td>
                          <td className="p-2">{m.status}</td>
                          <td className="p-2">{m.last_event || "none"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <Pagination
                total={messageTotal}
                limit={messageLimit}
                offset={(messagePage - 1) * messageLimit}
                onPageChange={(next) => setMessagePage(next)}
              />
            </>
          )}
        </div>

        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            Update Campaign List
          </h2>
          {!selectedCampaignId && (
            <div className="mt-3 text-xs text-[color:var(--text-muted)]">
              Select a campaign to add or remove emails from its list.
            </div>
          )}
          {selectedCampaignId && (
            <>
              <label className="block mt-3">
                <span className={labelCls}>Paste emails (comma or line separated)</span>
                <textarea
                  className="mt-1 w-full min-h-[100px] rounded-md border border-[color:var(--border-color)] px-3 py-2 text-xs bg-[color:var(--surface)] text-[color:var(--text-primary)]"
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
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateCampaignList("add")} className={btnCls}>
                  Add to List
                </button>
                <button type="button" onClick={() => updateCampaignList("remove")} className={btnCls}>
                  Remove from List
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
