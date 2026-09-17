import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createCompanyCategoryApi,
  getAllCompanyCategoriesApi,
  getCompanyCategoryByIdApi,
  updateCompanyCategoryApi,
  deleteCompanyCategoryApi,
} from "../../services/companyCategoryService";

// ================= CREATE COMPANY CATEGORY =================
export const createCompanyCategory = createAsyncThunk(
  "companyCategory/createCompanyCategory",
  async (data, thunkAPI) => {
    try {
      return await createCompanyCategoryApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to create company category"
      );
    }
  }
);

// ================= GET ALL COMPANY CATEGORIES =================
export const getAllCompanyCategories = createAsyncThunk(
  "companyCategory/getAllCompanyCategories",
  async (params, thunkAPI) => {
    try {
      return await getAllCompanyCategoriesApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch company categories"
      );
    }
  }
);

// ================= GET COMPANY CATEGORY BY ID =================
export const getCompanyCategoryById = createAsyncThunk(
  "companyCategory/getCompanyCategoryById",
  async (id, thunkAPI) => {
    try {
      return await getCompanyCategoryByIdApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch company category"
      );
    }
  }
);

// ================= UPDATE COMPANY CATEGORY =================
export const updateCompanyCategory = createAsyncThunk(
  "companyCategory/updateCompanyCategory",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateCompanyCategoryApi(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to update company category"
      );
    }
  }
);

// ================= DELETE COMPANY CATEGORY =================
export const deleteCompanyCategory = createAsyncThunk(
  "companyCategory/deleteCompanyCategory",
  async (id, thunkAPI) => {
    try {
      return await deleteCompanyCategoryApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to delete company category"
      );
    }
  }
);