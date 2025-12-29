// src/useAuth.js
import { useSyncExternalStore } from "react";

/**
 * Subscribe to both "storage" and a custom "auth-change" event
 * so multiple tabs/components stay in sync.
 */
function subscribe(callback) {
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener("auth-change", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("auth-change", handler);
  };
}

/** Snapshots used by useSyncExternalStore */
function getTokenSnapshot() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
}
function getRoleSnapshot() {
  return localStorage.getItem("role") || sessionStorage.getItem("role") || null;
}
function getUserSnapshot() {
  const j = localStorage.getItem("user") || sessionStorage.getItem("user");
  try {
    return j ? JSON.parse(j) : null;
  } catch (e) {
    return null;
  }
}

/** Reactive hooks for token, role and user */
export function useAuthToken() {
  return useSyncExternalStore(subscribe, getTokenSnapshot, getTokenSnapshot);
}
export function useAuthRole() {
  return useSyncExternalStore(subscribe, getRoleSnapshot, getRoleSnapshot);
}
export function useAuthUser() {
  return useSyncExternalStore(subscribe, getUserSnapshot, getUserSnapshot);
}

/** Convenience: return all auth pieces at once (not reactive) */
export function getAuth() {
  return {
    token: getTokenSnapshot(),
    role: getRoleSnapshot(),
    user: getUserSnapshot(),
  };
}

/**
 * Set token + role + optional user object.
 * - token: JWT string
 * - role: 'user' | 'admin' etc
 * - user: plain object (will be JSON.stringified)
 *
 * Persisted to localStorage by default; if you want session-only storage,
 * pass useSession = true.
 */
export function setAuth(token, role = "user", user = null, useSession = false) {
  const store = useSession ? sessionStorage : localStorage;

  if (token) {
    store.setItem("token", token);
    // remove from the opposite storage to avoid confusion
    if (useSession) localStorage.removeItem("token");
    else sessionStorage.removeItem("token");
  }
  if (role) {
    store.setItem("role", role);
    if (useSession) localStorage.removeItem("role");
    else sessionStorage.removeItem("role");
  }
  if (user !== null && typeof user !== "undefined") {
    try {
      store.setItem("user", JSON.stringify(user));
      if (useSession) localStorage.removeItem("user");
      else sessionStorage.removeItem("user");
    } catch (e) {
      console.warn("useAuth.setAuth: failed to stringify user object", e);
    }
  }

  // notify listeners (other tabs/components)
  window.dispatchEvent(new Event("auth-change"));
}

/** Clear all auth (token, role, user) and notify listeners.
 * Kept named `logout` to preserve existing calls; it's safe to call from anywhere.
 */
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("user");

  window.dispatchEvent(new Event("auth-change"));
}

/** Alias for clarity */
export const clearAuth = logout;

/** Utility: update only the stored role (and notify) */
export function setRole(role, useSession = false) {
  const store = useSession ? sessionStorage : localStorage;
  if (role) store.setItem("role", role);
  window.dispatchEvent(new Event("auth-change"));
}

/** Utility: update stored user object (merge shallow) */
export function updateUser(partial = {}, useSession = false) {
  const store = useSession ? sessionStorage : localStorage;
  const current = getUserSnapshot() || {};
  const merged = { ...current, ...partial };
  try {
    store.setItem("user", JSON.stringify(merged));
    window.dispatchEvent(new Event("auth-change"));
  } catch (e) {
    console.warn("useAuth.updateUser: failed to stringify", e);
  }
}
