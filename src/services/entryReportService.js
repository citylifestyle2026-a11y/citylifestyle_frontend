import api from "../api/axios";
import { normalizeBlobError } from "../utilits/apiError";

// ================= GET ACTIVE EVENTS (FOR EVENT DROPDOWN) =================
export const getActiveEventsApi = async (params) => {
  const response = await api.get("/entry-report/active-events", {
    params,
  });

  return response?.data;
};

// ================= GET ALL ENTRY REPORT =================
export const getAllEntryReportApi = async (params) => {
  const response = await api.get("/entry-report/get-all-entry-report", {
    params,
  });

  return response?.data;
};

// ================= EXPORT ENTRY REPORT =================
export const exportEntryReportApi = async (params) => {
  try {
    const response = await api.get("/entry-report/export", {
      params,
      responseType: "blob",
    });

    return response?.data;
  } catch (error) {
    // With responseType "blob" the server's JSON error (e.g. "No active
    // event found.") arrives as a Blob — unwrap it so the real message
    // reaches the thunk instead of a generic "Failed to export".
    throw await normalizeBlobError(error);
  }
};