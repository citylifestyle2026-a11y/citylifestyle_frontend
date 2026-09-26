import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createNominationApi,
  getAllNominationsApi,
  getNominationByIdApi,
} from "../../services/nominationService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= CREATE NOMINATION =================
export const createNomination = createAsyncThunk(
  "nomination/createNomination",
  async (data, thunkAPI) => {
    try {
      return await createNominationApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to create nomination")
      );
    }
  }
);

// ================= GET ALL NOMINATIONS =================
// Coordinator gets only their own nominations back — scoped server-side
// (see services/nomination.service.js), not by any param sent here.
export const getAllNominations = createAsyncThunk(
  "nomination/getAllNominations",
  async (params, thunkAPI) => {
    try {
      return await getAllNominationsApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch nominations")
      );
    }
  }
);

// ================= GET NOMINATION BY ID =================
export const getNominationById = createAsyncThunk(
  "nomination/getNominationById",
  async (id, thunkAPI) => {
    try {
      return await getNominationByIdApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch nomination")
      );
    }
  }
);
