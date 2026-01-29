// src/pages/AdminDashboard.jsx
// Screenshot reference: /mnt/data/73a9e989-2cb6-42af-b1ed-5e57e7e84cba.png

import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api';
import '../styles/AdminDashboard.css';

export default function AdminDashboard(){
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // toggle to show short column headers
  const [shortHeaders, setShortHeaders] = useState(false);

  // Column filters (compact inside headers)
  const [colFilters, setColFilters] = useState({
    id: '',
    name: '',
    email: '',
    userStatus: 'all', // all | active | blocked
    subscription: 'all',
    plan: 'all',
  });

  // Sorting state
  const [sortBy, setSortBy] = useState(null); // e.g. 'id', 'name', ...
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // default rows per page
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 500];

  // header labels (full and short)
  const HEADER_LABELS = {
    id: { full: 'ID', short: 'ID' },
    name: { full: 'Name', short: 'Name' },
    email: { full: 'Email', short: 'Email' },
    userStatus: { full: 'User Status', short: 'Status' },
    subscription: { full: 'Subscription Status', short: 'Subscr.' },
    expiry: { full: 'Subscription Expiry', short: 'Expiry' },
    plan: { full: 'Plan', short: 'Plan' },
    total: { full: 'Total Quota', short: 'Total' },
    used: { full: 'Used Quota', short: 'Used' },
    action: { full: 'Action', short: 'Action' },
  };

  const token = localStorage.getItem('token');

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line

  async function fetchUsers(){
    try{
      setLoading(true);
      const res = await axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data.users || []);
    }catch(err){
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to load users');
    }finally{
      setLoading(false);
    }
  }

  async function toggleBlock(userId, shouldBlock){
    try{
      await axios.patch(`/api/admin/users/${userId}/block`, { block: shouldBlock }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: shouldBlock ? 1 : 0 } : u));
    }catch(err){
      console.error(err);
      alert(err?.response?.data?.message || 'Update failed');
    }
  }

  // dynamic options
  const subscriptionOptions = useMemo(() => {
    const s = new Set();
    users.forEach(u => s.add(u.subscription_status || 'none'));
    return Array.from(s).sort();
  }, [users]);

  const planOptions = useMemo(() => {
    const p = new Set();
    users.forEach(u => {
      if(u.subscription_plan) p.add(u.subscription_plan);
      else if (u.free_quota > 0) p.add('free');
      else p.add('none');
    });
    return Array.from(p).sort();
  }, [users]);

  // Filtering
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const blocked = !!user.is_blocked;
      const userStatus = blocked ? 'blocked' : 'active';
      const subscription = user.subscription_status || 'none';
      const plan = user.subscription_plan || (user.free_quota > 0 ? 'free' : 'none');

      if(colFilters.userStatus !== 'all' && colFilters.userStatus !== userStatus) return false;
      if(colFilters.subscription !== 'all' && colFilters.subscription !== subscription) return false;
      if(colFilters.plan !== 'all' && colFilters.plan !== plan) return false;
      if(colFilters.id && !String(user.id).includes(colFilters.id)) return false;
      if(colFilters.name && !(user.name || '').toLowerCase().includes(colFilters.name.toLowerCase())) return false;
      if(colFilters.email && !(user.email || '').toLowerCase().includes(colFilters.email.toLowerCase())) return false;
      return true;
    });
  }, [users, colFilters]);

  // Sorting: stable sort over filteredUsers
  const sortedUsers = useMemo(() => {
    if (!sortBy) return filteredUsers.slice();

    const mapValue = (u, key) => {
      switch (key) {
        case 'id': return Number(u.id ?? 0);
        case 'name': return (u.name || '').toString().toLowerCase();
        case 'email': return (u.email || '').toString().toLowerCase();
        case 'userStatus': return (!!u.is_blocked) ? 'blocked' : 'active';
        case 'subscription': return (u.subscription_status || 'none').toString().toLowerCase();
        case 'expiry': {
          if (!u.subscription_expiry) return 0;
          const t = Date.parse(u.subscription_expiry);
          return isNaN(t) ? 0 : t;
        }
        case 'plan': return (u.subscription_plan || (u.free_quota > 0 ? 'free' : 'none')).toString().toLowerCase();
        case 'total': return Number(u.quota_total ?? 0);
        case 'used': return Number(u.quota_used ?? 0);
        default: return '';
      }
    };

    const dir = sortDir === 'asc' ? 1 : -1;
    // Create shallow copy and sort
    const arr = filteredUsers.slice();
    arr.sort((a, b) => {
      const va = mapValue(a, sortBy);
      const vb = mapValue(b, sortBy);

      // numeric comparison if both are numbers
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }

      // fallback to string comparison
      const sa = String(va || '').toLowerCase();
      const sb = String(vb || '').toLowerCase();
      if (sa < sb) return -1 * dir;
      if (sa > sb) return 1 * dir;
      return 0;
    });

    return arr;
  }, [filteredUsers, sortBy, sortDir]);

  // When any column filter changes, reset to page 1
  function handleColFilterChange(key, value){
    setColFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }

  // When page size changes, reset to page 1
  function handlePageSizeChange(newSize){
    setPageSize(Number(newSize));
    setCurrentPage(1);
  }

  // Pagination calculations (using pageSize)
  const totalRecords = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Clamp currentPage if filters/pageSize reduce pages
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, currentPage, pageSize]);

  // Small function to generate visible page buttons (show current ±2 and first/last if needed)
  function getPageButtons() {
    const pages = [];
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    // Always include 1 and last
    pages.push(1);
    let start = Math.max(2, currentPage - 2);
    let end = Math.min(totalPages - 1, currentPage + 2);

    if (start > 2) pages.push('left-ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('right-ellipsis');
    pages.push(totalPages);
    return pages;
  }

  // Small UI helpers
  function gotoPage(n){
    if(n < 1) n = 1;
    if(n > totalPages) n = totalPages;
    setCurrentPage(n);
  }

  // Toggle sorting for header key
  function toggleSort(key) {
    // Clicking same header toggles direction; clicking new header sets asc
    if (sortBy === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  }

  const label = key => (shortHeaders ? HEADER_LABELS[key].short : HEADER_LABELS[key].full);

  // Helper to render a sort indicator
  const sortIndicator = key => {
    if (sortBy !== key) return null;
    return sortDir === 'asc' ? ' ^' : ' v';
  };

  return (
    <div className="admin-wrap p-1">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Admin Dashboard — Users</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* <label style={{ fontSize: 13, color: '#374151', marginRight: 8 }}>Short headers</label>
          <button
            onClick={() => setShortHeaders(s => !s)}
            className="btn"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: shortHeaders ? '#1f7bd1' : '#ffffff',
              color: shortHeaders ? '#fff' : '#111827',
              border: '1px solid #e6eef6',
            }}
          >
            {shortHeaders ? 'ON' : 'OFF'}
          </button> */}
        </div>
      </div>

      {loading ? <div className="loading">Loading...</div> : (
        <div className="table-card" style={{ marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr className="head-row">
                <th className="col-id">
                  <div className="th-content">
                    <div
                      className="th-title clickable"
                      onClick={() => toggleSort('id')}
                      title="Sort by ID"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {label('id')}{sortIndicator('id')}
                    </div>
                    <input className="th-filter" placeholder="ID" value={colFilters.id} onChange={e => handleColFilterChange('id', e.target.value)} />
                  </div>
                </th>

                <th className="col-name">
                  <div className="th-content">
                    <div
                      className="th-title clickable"
                      onClick={() => toggleSort('name')}
                      title="Sort by Name"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {label('name')}{sortIndicator('name')}
                    </div>
                    <input className="th-filter" placeholder="Filter name" value={colFilters.name} onChange={e => handleColFilterChange('name', e.target.value)} />
                  </div>
                </th>

                <th className="col-email">
                  <div className="th-content">
                    <div
                      className="th-title clickable"
                      onClick={() => toggleSort('email')}
                      title="Sort by Email"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {label('email')}{sortIndicator('email')}
                    </div>
                    <input className="th-filter" placeholder="Filter email" value={colFilters.email} onChange={e => handleColFilterChange('email', e.target.value)} />
                  </div>
                </th>

                <th className="col-status">
                  <div className="th-content">
                    <div
                      className="th-title clickable"
                      onClick={() => toggleSort('userStatus')}
                      title="Sort by Status"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {label('userStatus')}{sortIndicator('userStatus')}
                    </div>
                    <select className="th-filter-select" value={colFilters.userStatus} onChange={e => handleColFilterChange('userStatus', e.target.value)}>
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </th>

                <th className="col-sub">
                  <div className="th-content">
                    <div
                      className="th-title clickable"
                      onClick={() => toggleSort('subscription')}
                      title="Sort by Subscription Status"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {label('subscription')}{sortIndicator('subscription')}
                    </div>
                    <select className="th-filter-select" value={colFilters.subscription} onChange={e => handleColFilterChange('subscription', e.target.value)}>
                      <option value="all">All</option>
                      {subscriptionOptions.map(o => <option key={o} value={o}>{o || 'none'}</option>)}
                    </select>
                  </div>
                </th>

                <th className="col-expiry">
                  <div className="th-content">
                    <div
                      className="th-title clickable"
                      onClick={() => toggleSort('expiry')}
                      title="Sort by Expiry"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {label('expiry')}{sortIndicator('expiry')}
                    </div>
                    <input className="th-filter" placeholder="YYYY-MM-DD" value={''} onChange={() => {}} disabled />
                  </div>
                </th>

                <th className="col-plan">
                  <div className="th-content">
                    <div
                      className="th-title clickable"
                      onClick={() => toggleSort('plan')}
                      title="Sort by Plan"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {label('plan')}{sortIndicator('plan')}
                    </div>
                    <select className="th-filter-select" value={colFilters.plan} onChange={e => handleColFilterChange('plan', e.target.value)}>
                      <option value="all">All</option>
                      {planOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </th>

                <th className="col-total">
                  <div className="th-title clickable" onClick={() => toggleSort('total')} title="Sort by Total" style={{ cursor: 'pointer' }}>
                    {label('total')}{sortIndicator('total')}
                  </div>
                </th>

                <th className="col-used">
                  <div className="th-title clickable" onClick={() => toggleSort('used')} title="Sort by Used" style={{ cursor: 'pointer' }}>
                    {label('used')}{sortIndicator('used')}
                  </div>
                </th>

                <th className="col-action"><div className="th-title">{label('action')}</div></th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.length === 0 && (
                <tr><td colSpan={10} className="no-results">No users found</td></tr>
              )}

              {paginatedUsers.map(user => {
                const blocked = !!user.is_blocked;
                const plan = user.subscription_plan || (user.free_quota > 0 ? 'free' : 'none');
                return (
                  <tr key={user.id} className={blocked ? 'row-blocked' : ''}>
                    <td className="col-id">{user.id}</td>
                    <td className="col-name">
                      <span className="cell-capitalize">{user.name || "-"}</span>
                    </td>
                    <td className="col-email">{user.email}</td>

                    <td className="col-status">
                      <span className={`badge status-badge ${blocked ? 'blocked' : 'active'}`}>
                        {blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>

                    <td className="col-sub">{user.subscription_status || 'none'}</td>
                    <td className="col-expiry">{user.subscription_expiry ? new Date(user.subscription_expiry).toLocaleString() : '-'}</td>
                    <td className="col-plan">{renderPlanBadge(plan)}</td>

                    <td className="col-total" style={{ textAlign: 'right' }}>{user.quota_total ?? 0}</td>
                    <td className="col-used" style={{ textAlign: 'right' }}>{user.quota_used ?? 0}</td>

                    <td className="col-action" style={{ textAlign: 'right' }}>
                      {blocked
                        ? <button className="btn small" onClick={() => toggleBlock(user.id, false)}>Unblock</button>
                        : <button className="btn small danger" onClick={() => toggleBlock(user.id, true)}>Block</button>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination bar */}
          <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Rows per page selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ color: '#6b7280', fontSize: 13 }}>Rows per page</label>
                <select
                  value={pageSize}
                  onChange={e => handlePageSizeChange(e.target.value)}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e6eef6', fontSize: 13 }}
                >
                  {PAGE_SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} rows</option>)}
                </select>
              </div>

              {/* Showing X - Y of Z */}
              <div className="pagination-info" style={{ color: '#6b7280', fontSize: 13 }}>
                Showing&nbsp;
                {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                &nbsp;-&nbsp;
                {Math.min(currentPage * pageSize, totalRecords)}
                &nbsp;of&nbsp;{totalRecords}
              </div>
            </div>

            <div className="pagination-controls" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn" onClick={() => gotoPage(currentPage - 1)} disabled={currentPage === 1} style={{ opacity: currentPage === 1 ? 0.5 : 1 }}>
                Prev
              </button>

              {getPageButtons().map((p, idx) => {
                if (p === 'left-ellipsis' || p === 'right-ellipsis') {
                  return <span key={p + idx} style={{ padding: '6px 8px', color: '#6b7280' }}>…</span>;
                }
                return (
                  <button
                    key={p}
                    onClick={() => gotoPage(p)}
                    className="btn"
                    style={{
                      background: p === currentPage ? '#1f7bd1' : 'transparent',
                      color: p === currentPage ? 'white' : '#111827',
                      borderRadius: 6,
                      padding: '6px 10px',
                      border: p === currentPage ? 'none' : '1px solid #e6eef6'
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button className="btn" onClick={() => gotoPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}>
                Next
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );

  // small helper used above for plan badge rendering (kept here)
  function renderPlanBadge(value) {
    const v = (value ?? '').toString().toLowerCase();
    if(v === 'free') return <span className="badge pill info-sm">Free</span>;
    if(v === 'pro') return <span className="badge pill pro-sm">Pro</span>;
    if(v === 'enterprise') return <span className="badge pill enterprise-sm">Enterprise</span>;
    return <span className="badge pill muted-sm">—</span>;
  }
}


