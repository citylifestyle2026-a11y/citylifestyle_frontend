import axios from "axios";

// NOTE: Do NOT hardcode "Content-Type": "application/json" here.
// When a request body is a plain JS object, axios's own transformRequest
// already sets Content-Type: application/json automatically. When the
// body is a FormData instance (e.g. profileImage uploads), axios needs
// to set Content-Type: multipart/form-data; boundary=... itself — but it
// will only do that if no Content-Type was already explicitly set on the
// instance/request. A hardcoded application/json default here overrides
// that auto-detection, so FormData requests get sent with the wrong
// Content-Type and the server can never parse req.file.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// The localhost fallback above is intentionally kept as-is (existing local
// dev workflows may rely on it working with no .env file present at all).
// This warning only makes a missing VITE_API_BASE_URL visible during local
// development, so a production build that was deployed without setting it
// doesn't silently and confusingly point at localhost. It never runs in a
// production build (import.meta.env.DEV is false there), so it changes
// nothing about production behavior — only dev-time observability.
if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "[api/axios] VITE_API_BASE_URL is not set — falling back to " +
      API_BASE_URL +
      ". Set VITE_API_BASE_URL in your .env file before building for production."
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  // No timeout was previously configured, meaning a hung request/response
  // (e.g. a stalled connection) could leave a page's loading state active
  // indefinitely. 30s is a conservative, industry-standard default that
  // comfortably covers normal requests. Note: /bookings/export and
  // /entry-report/export return large generated files (responseType:
  // "blob") — if real-world testing ever shows very large exports taking
  // longer than this, override `timeout` on that specific request rather
  // than raising the global default.
  timeout: 30000,
});

let activeRequests = 0;

const showLoader = () => {
  activeRequests += 1;
  window.dispatchEvent(new Event("api-loading-start"));
};

const hideLoader = () => {
  activeRequests = Math.max(0, activeRequests - 1);

  if (activeRequests === 0) {
    window.dispatchEvent(new Event("api-loading-stop"));
  }
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    showLoader();

    return config;
  },
  (error) => {
    hideLoader();
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    hideLoader();
    return response;
  },
  (error) => {
    hideLoader();

    // Do not redirect/reload when login credentials are invalid.
    // Let authSlice handle the login error and show it on the Login page.
    const isLoginRequest = error.config?.url?.includes("/auth/login");

    // Same reasoning for the secure Manual Event Delete flow (Step 4): a
    // wrong admin email/password submitted to DELETE /events/:id/delete
    // also responds 401, but that is a normal "credentials didn't match"
    // form-validation outcome, not an expired/invalid session — it must
    // keep the admin logged in and let DeleteEventModal show the error
    // inline instead of force-logging-out and redirecting to "/".
    const isEventDeleteRequest =
      error.config?.method === "delete" &&
      /\/events\/[^/]+\/delete$/.test(error.config?.url || "");

    if (
      error.response?.status === 401 &&
      !isLoginRequest &&
      !isEventDeleteRequest
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;