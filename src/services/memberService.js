import api from "../api/axios";
import { saveBlob } from "../utilits/download";

// ================= LIST =================
// params: { page, limit, search, profession, moved, sortBy, sortOrder }
export const getAllMembersApi = async (params) => {
  const response = await api.get("/members", {
    params,
    // reference: ["a","b"] -> reference=a&reference=b
    paramsSerializer: { indexes: null },
  });
  return response.data;
};

export const getMemberProfessionsApi = async () => {
  const response = await api.get("/members/professions");
  return response.data;
};

export const getMemberReferencesApi = async () => {
  const response = await api.get("/members/references");
  return response.data;
};

// ================= IMPORT (.xlsx / .csv) =================
// dryRun = true only checks the file (nothing is saved).
// mode "all" also saves duplicate / invalid rows (flagged "Needs Fix").
export const importMembersApi = async (file, { dryRun = false, mode = "valid" } = {}) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/members/import", formData, {
    params: dryRun ? { dryRun: true } : mode === "all" ? { mode: "all" } : undefined,
  });
  return response.data;
};

// ================= MOVE TO GUEST LIST =================
// body: { ids: string[] } or { selectAll: true, filters: {...} }, + eventId
export const moveMembersToGuestListApi = async (data) => {
  const response = await api.post("/members/move-to-guest-list", data);
  return response.data;
};

// ================= CREATE (ONE MEMBER) =================
export const createMemberApi = async (data) => {
  const response = await api.post("/members", data);
  return response.data;
};

// ================= UPDATE =================
export const updateMemberApi = async (id, data) => {
  const response = await api.put(`/members/${id}`, data);
  return response.data;
};

// ================= DELETE (HARD) =================
export const deleteMemberApi = async (id) => {
  const response = await api.delete(`/members/${id}`);
  return response.data;
};

// ================= NEEDS FIX: DELETE ALL / EXPORT =================
// body: { ids } or { selectAll: true, filters } (only Needs Fix rows are deleted)
export const bulkDeleteMembersApi = async (data) => {
  const response = await api.post("/members/bulk-delete", data);
  return response.data;
};

// Downloads the rows that match `params` (same filters as the list) as a .csv file.
export const exportMembersApi = async (params, fileName = "members.csv") => {
  const response = await api.get("/members/export", {
    params,
    responseType: "blob",
  });

  saveBlob(new Blob([response.data], { type: "text/csv;charset=utf-8" }), fileName);
};

// Downloads the rows that match `params` (same filters as the list) as an
// Excel (.xlsx) file. params.ids (comma separated) = only the ticked rows.
export const exportMembersExcelApi = async (params, fileName = "contact-book.xlsx") => {
  const response = await api.get("/members/export", {
    params: { ...params, format: "xlsx" },
    responseType: "blob",
  });

  saveBlob(
    new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName
  );
};