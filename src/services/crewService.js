import api from "../api/axios";
import { saveBlob, XLSX_MIME } from "../utilits/download";

const SEND_PASS_CHUNK = 10;

export const createCrewApi = async (data) => (await api.post("/crew/create", data)).data;

// params: search, crewCategory, passStatus (sent | notSent), sortBy, sortOrder, page, limit
export const getAllCrewApi = async (params) =>
  (await api.get("/crew/get-all-crew", { params })).data;

export const updateCrewApi = async (id, data) => (await api.put(`/crew/${id}/update`, data)).data;

export const deleteCrewApi = async (id) => (await api.delete(`/crew/${id}/delete`)).data;

export const bulkDeleteCrewApi = async (ids) => (await api.post("/crew/bulk-delete", { ids })).data;

// Same filters as the list; params.ids (comma separated) = only the ticked rows.
export const exportCrewApi = async (params, fileName = "crew.xlsx") => {
  const response = await api.get("/crew/export", { params, responseType: "blob" });
  saveBlob(new Blob([response.data], { type: XLSX_MIME }), fileName);
};

export const downloadCrewSampleApi = async () => {
  const response = await api.get("/crew/import-template", { responseType: "blob" });
  saveBlob(new Blob([response.data], { type: XLSX_MIME }), "crew-import-sample.xlsx");
};

export const importCrewApi = async (file, { dryRun = false } = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/crew/import", formData, {
    params: dryRun ? { dryRun: true } : undefined,
    timeout: 180000,
  });
  return response.data;
};

// Sends in chunks of 10 so one slow request never blocks the whole list.
export const sendCrewPassApi = async (data) => {
  const ids = Array.isArray(data?.ids) ? data.ids : [];
  const results = [];

  for (let i = 0; i < ids.length; i += SEND_PASS_CHUNK) {
    const chunk = ids.slice(i, i + SEND_PASS_CHUNK);
    try {
      const response = await api.post(
        "/crew/send-pass",
        { ...data, ids: chunk },
        { timeout: 180000 }
      );
      results.push(...(response.data?.data?.results || []));
    } catch (error) {
      if (error?.response?.status && error.response.status < 500 && i === 0) throw error;
      const message =
        error?.response?.data?.message ||
        "No answer from the server - check Pass sent status before sending again.";
      chunk.forEach((id) => results.push({ id, name: "-", status: "failed", message }));
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.length - sent;

  return {
    success: true,
    message:
      failed === 0
        ? `Pass sent to ${sent} crew member${sent === 1 ? "" : "s"}.`
        : `Pass sent to ${sent}, failed for ${failed}.`,
    data: { sent, failed, results },
  };
};

// Cancels the pass of approved crew: QR stops working, crew moves to
// Rejected / Pass Cancelled and gets a WhatsApp message.
export const cancelCrewPassApi = async (data) => (await api.post("/crew/cancel-pass", data)).data;

// { ids, status: "approved" | "rejected" | "pending" }. Approving crew whose
// pass was cancelled brings the SAME pass back and sends it again.
export const bulkUpdateCrewStatusApi = async (data) => (await api.put("/crew/bulk-status", data)).data;

export const resendCrewPassApi = async (ids) => (await api.post("/crew/resend-pass", { ids })).data;
