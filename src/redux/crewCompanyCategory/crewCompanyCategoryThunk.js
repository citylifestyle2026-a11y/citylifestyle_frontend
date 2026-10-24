import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createCrewCompanyCategoryApi,
  getAllCrewCompanyCategoriesApi,
  getCrewCompanyCategoryByIdApi,
  updateCrewCompanyCategoryApi,
  deleteCrewCompanyCategoryApi,
} from "../../services/crewCompanyCategoryService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= CREATE COMPANY CATEGORY =================
export const createCrewCompanyCategory = createAsyncThunk(
  "crewCompanyCategory/createCrewCompanyCategory",
  async (data, thunkAPI) => {
    try {
      return await createCrewCompanyCategoryApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to create crew company category")
      );
    }
  }
);

// ================= GET ALL COMPANY CATEGORIES =================
export const getAllCrewCompanyCategories = createAsyncThunk(
  "crewCompanyCategory/getAllCrewCompanyCategories",
  async (params, thunkAPI) => {
    try {
      return await getAllCrewCompanyCategoriesApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch crew company categories")
      );
    }
  }
);

// ================= GET COMPANY CATEGORY BY ID =================
export const getCrewCompanyCategoryById = createAsyncThunk(
  "crewCompanyCategory/getCrewCompanyCategoryById",
  async (id, thunkAPI) => {
    try {
      return await getCrewCompanyCategoryByIdApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch crew company category")
      );
    }
  }
);

// ================= UPDATE COMPANY CATEGORY =================
export const updateCrewCompanyCategory = createAsyncThunk(
  "crewCompanyCategory/updateCrewCompanyCategory",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateCrewCompanyCategoryApi(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to update crew company category")
      );
    }
  }
);

// ================= DELETE COMPANY CATEGORY =================
export const deleteCrewCompanyCategory = createAsyncThunk(
  "crewCompanyCategory/deleteCrewCompanyCategory",
  async (id, thunkAPI) => {
    try {
      return await deleteCrewCompanyCategoryApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to delete crew company category")
      );
    }
  }
);