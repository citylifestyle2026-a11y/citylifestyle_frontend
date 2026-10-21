import api from "../api/axios";

// "Form Links" module (sidebar) — admin side.
// target: "contact" (Guest List) | "member" (Contact Book)

export const createFormLinkApi = async (data) => {
  const response = await api.post("/form-links", data);
  return response.data;
};

// params: { page, limit, search, target, sortBy, sortOrder }
export const getFormLinksApi = async (params) => {
  const response = await api.get("/form-links", { params });
  return response.data;
};

// data: { name?, quantity?, target?, status?: "active" | "closed" }
export const updateFormLinkApi = async (id, data) => {
  const response = await api.put(`/form-links/${id}`, data);
  return response.data;
};

export const deleteFormLinkApi = async (id) => {
  const response = await api.delete(`/form-links/${id}`);
  return response.data;
};

// The address people open to fill the form.
export const buildFormLinkUrl = (token) =>
  `${window.location.origin}/form?link=${token}`;
