import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createEditionApi,
  getAllEditionsApi,
  getEditionByIdApi,
  updateEditionApi,
  deleteEditionApi,
} from "../../services/editionService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= CREATE EDITION =================
export const createEdition = createAsyncThunk(
  "edition/createEdition",
  async (data, thunkAPI) => {
    try {
      return await createEditionApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to create edition")
      );
    }
  }
);

// ================= GET ALL EDITIONS =================
export const getAllEditions = createAsyncThunk(
  "edition/getAllEditions",
  async (params, thunkAPI) => {
    try {
      return await getAllEditionsApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch editions")
      );
    }
  }
);

// ================= GET EDITION BY ID =================
export const getEditionById = createAsyncThunk(
  "edition/getEditionById",
  async (id, thunkAPI) => {
    try {
      return await getEditionByIdApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch edition")
      );
    }
  }
);

// ================= UPDATE EDITION =================
export const updateEdition = createAsyncThunk(
  "edition/updateEdition",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateEditionApi(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to update edition")
      );
    }
  }
);

// ================= DELETE EDITION =================
export const deleteEdition = createAsyncThunk(
  "edition/deleteEdition",
  async (id, thunkAPI) => {
    try {
      return await deleteEditionApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to delete edition")
      );
    }
  }
);
