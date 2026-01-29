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

export default function ColdEmailLists() {
  const [lists, setLists] = useState([]);
  const [listOptions, setListOptions] = useState([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [listName, setListName] = useState("");
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState("");
  const [contacts, setContacts] = useState([]);
  const [listTotal, setListTotal] = useState(0);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [contactsPage, setContactsPage] = useState(1);
  const listLimit = 6;
  const contactsLimit = 20;
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [emailsText, setEmailsText] = useState("");
  const [fileText, setFileText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLists = async (page = listPage) => {
    setLoading(true);
    setError("");
    try {
      const offset = (page - 1) * listLimit;
      const res = await api.get("/api/cold-email/lists", {
        params: { limit: listLimit, offset },
      });
      setLists(res.data.lists || []);
      setListTotal(res.data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load lists");
    } finally {
      setLoading(false);
    }
  };

  const loadListOptions = async () => {
    try {
      const res = await api.get("/api/cold-email/lists", {
        params: { limit: 500, offset: 0 },
      });
      setListOptions(res.data.lists || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load list options");
    }
  };

  const loadContacts = async (listId, page = contactsPage) => {
    if (!listId) {
      setContacts([]);
      setContactsTotal(0);
      setSelectedContactIds([]);
      return;
    }
    try {
      const offset = (page - 1) * contactsLimit;
      const res = await api.get("/api/cold-email/contacts", {
        params: { list_id: listId, limit: contactsLimit, offset },
      });
      setContacts(res.data.contacts || []);
      setContactsTotal(res.data.total || 0);
      setSelectedContactIds([]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load contacts");
    }
  };

  useEffect(() => {
    loadLists();
    loadListOptions();
  }, [listPage]);

  useEffect(() => {
    setContactsPage(1);
    setSelectedContactIds([]);
    loadContacts(selectedListId, 1);
  }, [selectedListId]);

  useEffect(() => {
    if (!selectedListId) return;
    loadContacts(selectedListId, contactsPage);
  }, [contactsPage]);

  const createList = async () => {
    if (!listName.trim()) return;
    try {
      await api.post("/api/cold-email/lists", { name: listName.trim() });
      setListName("");
      setListPage(1);
      await loadLists(1);
      await loadListOptions();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create list");
    }
  };

  const startEditList = (list) => {
    setEditingListId(list.id);
    setEditingListName(list.name || "");
  };

  const saveList = async (listId) => {
    if (!editingListName.trim()) return;
    try {
      await api.put(`/api/cold-email/lists/${listId}`, {
        name: editingListName.trim(),
      });
      setEditingListId(null);
      setEditingListName("");
      await loadLists();
      await loadListOptions();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update list");
    }
  };

  const deleteList = async (listId) => {
    try {
      await api.delete(`/api/cold-email/lists/${listId}`);
      if (String(selectedListId) === String(listId)) {
        setSelectedListId("");
        setContacts([]);
      }
      await loadLists();
      await loadListOptions();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete list");
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
      await loadLists();
      await loadContacts(selectedListId, contactsPage);
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
      await loadLists();
      await loadContacts(selectedListId, contactsPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove contacts");
    }
  };

  const removeContactFromList = async (contactId) => {
    if (!selectedListId) return;
    try {
      await api.delete(`/api/cold-email/contacts/${contactId}`, {
        params: { list_id: selectedListId },
      });
      await loadLists();
      await loadContacts(selectedListId, contactsPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove contact");
    }
  };

  const deleteContactCompletely = async (contactId) => {
    try {
      await api.delete(`/api/cold-email/contacts/${contactId}`);
      await loadLists();
      await loadContacts(selectedListId, contactsPage);
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
    if (!selectedListId || selectedContacts.length === 0) return;
    try {
      const emails = selectedContacts.map((c) => c.email);
      await api.post(`/api/cold-email/lists/${selectedListId}/contacts/remove`, {
        emails,
      });
      setSelectedContactIds([]);
      await loadLists();
      await loadContacts(selectedListId, contactsPage);
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
      await loadLists();
      await loadContacts(selectedListId, contactsPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete selected contacts");
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Cold Email Lists
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
            Your Lists
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

          <div className="mt-6 border-t pt-4 space-y-2 text-xs">
            {lists.length === 0 && (
              <div className="text-[color:var(--text-muted)]">No lists yet.</div>
            )}
            {lists.map((list) => (
              <div key={list.id} className="border rounded-lg p-2">
                {editingListId === list.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      className={inputCls}
                      value={editingListName}
                      onChange={(e) => setEditingListName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={btnCls}
                        onClick={() => saveList(list.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={btnCls}
                        onClick={() => {
                          setEditingListId(null);
                          setEditingListName("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        className="text-left font-medium text-[color:var(--text-primary)]"
                        onClick={() => setSelectedListId(String(list.id))}
                      >
                        {list.name}
                      </button>
                      <span className="text-[color:var(--text-muted)]">
                        {list.contact_count || 0} contacts
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        className={btnCls}
                        onClick={() => startEditList(list)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={btnCls}
                        onClick={() => deleteList(list.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <Pagination
            total={listTotal}
            limit={listLimit}
            offset={(listPage - 1) * listLimit}
            onPageChange={(next) => setListPage(next)}
          />
        </div>

        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            List Contacts
          </h2>
          <label className="block mt-3">
            <span className={labelCls}>Select list</span>
            <select
              className={inputCls}
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
            >
              <option value="">Choose list</option>
              {listOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

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
            <button type="button" onClick={addContacts} className={btnCls}>
              Add Contacts
            </button>
            <button type="button" onClick={removeContacts} className={btnCls}>
              Remove Contacts
            </button>
          </div>

          <div className="mt-4 sd-table-wrap overflow-x-auto">
            {!selectedListId && (
              <div className="p-3 text-xs text-[color:var(--text-muted)]">
                Select a list to view its contacts.
              </div>
            )}
            {selectedListId && contacts.length === 0 && (
              <div className="p-3 text-xs text-[color:var(--text-muted)]">
                No contacts in this list.
              </div>
            )}
            {selectedListId && contacts.length > 0 && (
              <table className="sd-table w-full text-xs">
                <thead>
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
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(c.id)}
                          onChange={() => toggleSelectContact(c.id)}
                        />
                      </td>
                      <td className="p-2">
                        <div>{c.email}</div>
                        <div className="text-[10px] text-[color:var(--text-muted)]">
                          {c.email_valid ? "valid" : "invalid"}
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="cell-capitalize">{`${c.first_name || ""} ${c.last_name || ""}`}</span>
                      </td>
                      <td className="p-2">{c.list_status || "active"}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={btnCls}
                            onClick={() => removeContactFromList(c.id)}
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            className={btnCls}
                            onClick={() => deleteContactCompletely(c.id)}
                          >
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
          {selectedListId && contacts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={`${btnCls} disabled:opacity-50`}
                onClick={removeSelectedContacts}
                disabled={selectedContactIds.length === 0}
              >
                Remove Selected
              </button>
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
    </div>
  );
}
