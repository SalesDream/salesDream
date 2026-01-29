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

export default function ColdEmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [templateTotal, setTemplateTotal] = useState(0);
  const [templatePage, setTemplatePage] = useState(1);
  const templateLimit = 10;
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateType, setTemplateType] = useState("custom");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTemplates = async (page = templatePage) => {
    setLoading(true);
    setError("");
    try {
      const offset = (page - 1) * templateLimit;
      const res = await api.get("/api/cold-email/templates", {
        params: { limit: templateLimit, offset },
      });
      setTemplates(res.data.templates || []);
      setTemplateTotal(res.data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [templatePage]);

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

  const saveTemplate = async () => {
    if (!templateName.trim() || !templateSubject.trim()) return;
    try {
      if (editingTemplateId) {
        await api.put(`/api/cold-email/templates/${editingTemplateId}`, {
          name: templateName.trim(),
          subject: templateSubject.trim(),
          body_text: templateBody,
          template_type: templateType,
        });
      } else {
        await api.post("/api/cold-email/templates", {
          name: templateName.trim(),
          subject: templateSubject.trim(),
          body_text: templateBody,
          template_type: templateType,
        });
      }
      setTemplateName("");
      setTemplateSubject("");
      setTemplateBody("");
      setTemplateType("custom");
      setAiPrompt("");
      setAiDraft(null);
      setEditingTemplateId(null);
      setTemplatePage(1);
      await loadTemplates(1);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save template");
    }
  };

  const editTemplate = (template) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name || "");
    setTemplateSubject(template.subject || "");
    setTemplateBody(template.body_text || "");
    setTemplateType(template.template_type || "custom");
  };

  const deleteTemplate = async (id) => {
    try {
      await api.delete(`/api/cold-email/templates/${id}`);
      await loadTemplates();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete template");
    }
  };

  const cancelEdit = () => {
    setEditingTemplateId(null);
    setTemplateName("");
    setTemplateSubject("");
    setTemplateBody("");
    setTemplateType("custom");
    setAiPrompt("");
    setAiDraft(null);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Cold Email Templates
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
            {editingTemplateId ? "Edit Template" : "Create Template"}
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

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={saveTemplate} className={btnCls}>
              {editingTemplateId ? "Save Changes" : "Save Template"}
            </button>
            {editingTemplateId && (
              <button type="button" onClick={cancelEdit} className={btnCls}>
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            All Templates
          </h2>
          <div className="mt-4 sd-table-wrap overflow-x-auto">
            {templates.length === 0 ? (
              <div className="p-3 text-xs text-[color:var(--text-muted)]">
                No templates yet.
              </div>
            ) : (
              <table className="sd-table w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td className="p-2">
                        <div className="font-medium cell-capitalize">{tpl.name}</div>
                        <div className="text-[10px] text-[color:var(--text-muted)]">
                          {tpl.subject}
                        </div>
                      </td>
                      <td className="p-2">{tpl.template_type}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={btnCls} onClick={() => editTemplate(tpl)}>
                            Edit
                          </button>
                          <button type="button" className={btnCls} onClick={() => deleteTemplate(tpl.id)}>
                            Delete
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
            total={templateTotal}
            limit={templateLimit}
            offset={(templatePage - 1) * templateLimit}
            onPageChange={(next) => setTemplatePage(next)}
          />
        </div>
      </div>
    </div>
  );
}
