import { useSyncExternalStore } from "react";

/** Subscribe to both "storage" and a custom "auth-change" event */
function subscribe(callback) {
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener("auth-change", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("auth-change", handler);
  };
}

function getSnapshot() {
  return localStorage.getItem("token") || null;
}

/** Reactive hook for auth token */
export function useAuthToken() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Set token+role and notify listeners */
export function setAuth(token, role = "user") {
  if (token) localStorage.setItem("token", token);
  if (role) localStorage.setItem("role", role);
  window.dispatchEvent(new Event("auth-change"));
}

/** Clear all auth and notify listeners */
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("role");
  window.dispatchEvent(new Event("auth-change"));
}
