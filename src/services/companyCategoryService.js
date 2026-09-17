import api from "../api/axios";

// ================= CREATE COMPANY CATEGORY =================
export const createCompanyCategoryApi = async (data) => {
  const response = await api.post("/company-categories/create", data);
  return response.data;
};

// ================= GET ALL COMPANY CATEGORIES =================
// params supports: search, sortBy, sortOrder, page, limit — same query
// params companyCategoryService.getAllCompanyCategories (backend) reads.
export const getAllCompanyCategoriesApi = async (params) => {
  const response = await api.get("/company-categories/get-all-categories", {
    params,
  });

  return response.data;
};

// ================= GET COMPANY CATEGORY BY ID =================
export const getCompanyCategoryByIdApi = async (id) => {
  const response = await api.get(`/company-categories/${id}`);
  return response.data;
};

// ================= UPDATE COMPANY CATEGORY =================
export const updateCompanyCategoryApi = async (id, data) => {
  const response = await api.put(`/company-categories/${id}/update`, data);
  return response.data;
};

// ================= DELETE COMPANY CATEGORY =================
export const deleteCompanyCategoryApi = async (id) => {
  const response = await api.delete(`/company-categories/${id}/delete`);
  return response.data;
};