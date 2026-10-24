import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createCrewCategoryApi,
  getAllCrewCategoriesApi,
  getCrewCategoryByIdApi,
  updateCrewCategoryApi,
  deleteCrewCategoryApi,
} from "../../services/crewCategoryService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= CREATE COMPANY CATEGORY =================
export const createCrewCategory = createAsyncThunk(
  "crewCategory/createCrewCategory",
  async (data, thunkAPI) => {
    try {
      return await createCrewCategoryApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to create crew category")
      );
    }
  }
);

// ================= GET ALL COMPANY CATEGORIES =================
export const getAllCrewCategories = createAsyncThunk(
  "crewCategory/getAllCrewCategories",
  async (params, thunkAPI) => {
    try {
      return await getAllCrewCategoriesApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch crew categories")
      );
    }
  }
);

// ================= GET COMPANY CATEGORY BY ID =================
export const getCrewCategoryById = createAsyncThunk(
  "crewCategory/getCrewCategoryById",
  async (id, thunkAPI) => {
    try {
      return await getCrewCategoryByIdApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch crew category")
      );
    }
  }
);

// ================= UPDATE COMPANY CATEGORY =================
export const updateCrewCategory = createAsyncThunk(
  "crewCategory/updateCrewCategory",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateCrewCategoryApi(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to update crew category")
      );
    }
  }
);

// ================= DELETE COMPANY CATEGORY =================
export const deleteCrewCategory = createAsyncThunk(
  "crewCategory/deleteCrewCategory",
  async (id, thunkAPI) => {
    try {
      return await deleteCrewCategoryApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to delete crew category")
      );
    }
  }
);