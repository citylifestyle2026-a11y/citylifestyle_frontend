import api from "../api/axios";

// ================= CREATE COMPANY CATEGORY =================
export const createCrewCategoryApi = async (data) => {
  const response = await api.post("/crew-categories/create", data);
  return response.data;
};

// ================= GET ALL COMPANY CATEGORIES =================
// params supports: search, sortBy, sortOrder, page, limit — same query
// params crewCategoryService.getAllCrewCategories (backend) reads.
export const getAllCrewCategoriesApi = async (params) => {
  const response = await api.get("/crew-categories/get-all-categories", {
    params,
  });

  return response.data;
};

// ================= GET COMPANY CATEGORY BY ID =================
export const getCrewCategoryByIdApi = async (id) => {
  const response = await api.get(`/crew-categories/${id}`);
  return response.data;
};

// ================= UPDATE COMPANY CATEGORY =================
export const updateCrewCategoryApi = async (id, data) => {
  const response = await api.put(`/crew-categories/${id}/update`, data);
  return response.data;
};

// ================= DELETE COMPANY CATEGORY =================
export const deleteCrewCategoryApi = async (id) => {
  const response = await api.delete(`/crew-categories/${id}/delete`);
  return response.data;
};