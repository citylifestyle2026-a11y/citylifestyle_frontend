import api from "../api/axios";

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
  const response = await api.get("/entry-report/export", {
    params,
    responseType: "blob",
  });

  return response?.data;
};