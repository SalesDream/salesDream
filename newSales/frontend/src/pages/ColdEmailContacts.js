import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import Pagination from "../components/Pagination";

const cardCls =
  "bg-[color:var(--surface)] border border-[color:var(--border-color)] rounded-xl shadow-sm p-4";
const labelCls = "block text-xs font-semibold text-[color:var(--text-primary)]";
const inputCls =
  "mt-1 w-full h-9 rounded-md border border-[color:var(--border-color)] px-3 text-xs bg-[color:var(--surface)] text-[color:var(--text-primary)]";
const btnCls =
  "inline-flex items-center gap-2 px-3 py-2 border border-[color:var(--border-color)] rounded-md bg-[color:var(--surface)] text-xs text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]";

export default function ColdEmailContacts() {
  const [lists, setLists] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [listFilter, setListFilter] = useState("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsPage, setContactsPage] = useState(1);
  const contactsLimit = 20;
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactDraft, setContactDraft] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLists = async () => {
    try {
      const res = await api.get("/api/cold-email/lists", {
        params: { limit: 500, offset: 0 },
      });
      setLists(res.data.lists || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load lists");
    }
  };

  const loadContacts = async (listId, page = contactsPage) => {
    setLoading(true);
    setError("");
    try {
      const offset = (page - 1) * contactsLimit;
      const params = {
        limit: contactsLimit,
        offset,
        q: searchEmail.trim() || undefined,
      };
      if (listId && listId !== "all") params.list_id = listId;
      const res = await api.get("/api/cold-email/contacts", { params });
      setContacts(res.data.contacts || []);
      setContactsTotal(res.data.total || 0);
      setSelectedContactIds([]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (!listFilter) setListFilter("all");
  }, [lists, listFilter]);

  useEffect(() => {
    setContactsPage(1);
    loadContacts(listFilter, 1);
  }, [listFilter, searchEmail]);

  useEffect(() => {
    loadContacts(listFilter, contactsPage);
  }, [contactsPage]);

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
      if (listFilter !== "all") {
        payload.list_id = Number(listFilter);
        payload.list_status = contactDraft.list_status || "active";
      }
      await api.put(`/api/cold-email/contacts/${id}`, payload);
      setEditingContactId(null);
      setContactDraft({});
      await loadContacts(listFilter, contactsPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update contact");
    }
  };

  const deleteContact = async (id) => {
    try {
      if (listFilter === "all") {
        await api.delete(`/api/cold-email/contacts/${id}`);
      } else {
        await api.delete(`/api/cold-email/contacts/${id}`, {
          params: { list_id: listFilter },
        });
      }
      await loadContacts(listFilter, contactsPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete contact");
    }
  };

  const deleteContactCompletely = async (id) => {
    try {
      await api.delete(`/api/cold-email/contacts/${id}`);
      await loadContacts(listFilter, contactsPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete contact");
    }
  };

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedContactIds.includes(c.id)),
    [contacts, selectedContactIds]
  );

  const toggleSelectAll = () => {
    if (!contacts.length) return;
    if (selectedContactIds.length === contacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(contacts.map((c) => c.id));
    }
  };

  const toggleSelectContact = (id) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const removeSelectedContacts = async () => {
    if (listFilter === "all" || selectedContacts.length === 0) return;
    try {
      const emails = selectedContacts.map((c) => c.email);
      await api.post(`/api/cold-email/lists/${listFilter}/contacts/remove`, {
        emails,
      });
      setSelectedContactIds([]);
      await loadContacts(listFilter, contactsPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove selected contacts");
    }
  };

  const deleteSelectedContacts = async () => {
    if (selectedContacts.length === 0) return;
    try {
      await Promise.all(
        selectedContacts.map((c) => api.delete(`/api/cold-email/contacts/${c.id}`))
      );
      setSelectedContactIds([]);
      await loadContacts(listFilter, contactsPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete selected contacts");
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Cold Email Contacts
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

      <div className={cardCls}>
        <label className="block">
          <span className={labelCls}>Filter by list</span>
          <select
            className={inputCls}
            value={listFilter}
            onChange={(e) => setListFilter(e.target.value)}
          >
            <option value="all">All lists</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block mt-3">
          <span className={labelCls}>Search by email</span>
          <input
            className={inputCls}
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Search email..."
          />
        </label>

        <div className="mt-4 max-h-[520px] overflow-auto border rounded-lg">
          {contacts.length === 0 ? (
            <div className="p-3 text-xs text-[color:var(--text-muted)]">
              No contacts found.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[color:var(--surface-muted)] text-[color:var(--text-primary)]">
                <tr>
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      checked={contacts.length > 0 && selectedContactIds.length === contacts.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">
                    {listFilter === "all" ? "Lists" : "Status"}
                  </th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(c.id)}
                        onChange={() => toggleSelectContact(c.id)}
                      />
                    </td>
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
                      {listFilter !== "all" && editingContactId === c.id ? (
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
                      ) : listFilter === "all" ? (
                        <span>{c.list_names || "-"}</span>
                      ) : (
                        <span>{c.list_status || "active"}</span>
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
                          {listFilter !== "all" && (
                            <button type="button" className={btnCls} onClick={() => deleteContact(c.id)}>
                              Remove
                            </button>
                          )}
                          <button type="button" className={btnCls} onClick={() => deleteContactCompletely(c.id)}>
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
        {listFilter !== "all" && contacts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${btnCls} disabled:opacity-50`}
              onClick={removeSelectedContacts}
              disabled={selectedContactIds.length === 0}
            >
              Remove Selected
            </button>
          </div>
        )}
        {contacts.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              className={`${btnCls} disabled:opacity-50`}
              onClick={deleteSelectedContacts}
              disabled={selectedContactIds.length === 0}
            >
              Delete Selected
            </button>
          </div>
        )}
        <Pagination
          total={contactsTotal}
          limit={contactsLimit}
          offset={(contactsPage - 1) * contactsLimit}
          onPageChange={(next) => setContactsPage(next)}
        />
      </div>
    </div>
  );
}
