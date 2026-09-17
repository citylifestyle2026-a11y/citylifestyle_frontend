import api from "../api/axios";

// Get Dashboard Summary
// `eventId` is optional — pass it to view a specific event (active or
// inactive/expired) via the dashboard's Event selector; omit it for the
// default (currently active event, or the most recently expired one).
export const getDashboardSummaryApi = async (eventId) => {
  const response = await api.get("/dashboard/summary", {
    params: eventId ? { eventId } : {},
  });
  return response.data;
};