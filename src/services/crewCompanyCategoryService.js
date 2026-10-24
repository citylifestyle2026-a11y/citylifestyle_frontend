import api from "../api/axios";

// ================= CREATE COMPANY CATEGORY =================
export const createCrewCompanyCategoryApi = async (data) => {
  const response = await api.post("/crew-company-categories/create", data);
  return response.data;
};

// ================= GET ALL COMPANY CATEGORIES =================
// params supports: search, sortBy, sortOrder, page, limit — same query
// params crewCompanyCategoryService.getAllCrewCompanyCategories (backend) reads.
export const getAllCrewCompanyCategoriesApi = async (params) => {
  const response = await api.get("/crew-company-categories/get-all-categories", {
    params,
  });

  return response.data;
};

// ================= GET COMPANY CATEGORY BY ID =================
export const getCrewCompanyCategoryByIdApi = async (id) => {
  const response = await api.get(`/crew-company-categories/${id}`);
  return response.data;
};

// ================= UPDATE COMPANY CATEGORY =================
export const updateCrewCompanyCategoryApi = async (id, data) => {
  const response = await api.put(`/crew-company-categories/${id}/update`, data);
  return response.data;
};

// ================= DELETE COMPANY CATEGORY =================
export const deleteCrewCompanyCategoryApi = async (id) => {
  const response = await api.delete(`/crew-company-categories/${id}/delete`);
  return response.data;
};