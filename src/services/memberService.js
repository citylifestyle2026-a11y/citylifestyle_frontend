import api from "../api/axios";

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
