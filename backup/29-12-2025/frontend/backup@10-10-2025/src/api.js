import axios from "axios";

const API_URL = (process.env.REACT_APP_API_URL || "http://139.144.56.127:5000");

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: {
    // Bypass ngrok's browser warning (needed for XHR/fetch)
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Ensure header is always present (even if headers were replaced)
  config.headers["ngrok-skip-browser-warning"] = "true";

  // Default JSON content-type for write methods
  const method = (config.method || "").toLowerCase();
  if (!config.headers["Content-Type"] && ["post", "put", "patch", "delete"].includes(method)) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // auto-logout on unauthorized
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.dispatchEvent(new Event("auth-change"));
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    // Helpful log for CORS/preflight/network issues (no response object)
    if (!err.response && err.request) {
      console.error("Network/CORS error calling API:", API_URL, err);
    }
    return Promise.reject(err);
  }
);

export default api;
