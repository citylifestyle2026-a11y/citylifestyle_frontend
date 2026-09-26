import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createCoordinatorApi,
  getAllCoordinatorsApi,
  getCoordinatorByIdApi,
  updateCoordinatorApi,
  deleteCoordinatorApi,
} from "../../services/coordinatorService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= CREATE COORDINATOR =================
export const createCoordinator = createAsyncThunk(
  "coordinator/createCoordinator",
  async (data, thunkAPI) => {
    try {
      return await createCoordinatorApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to create coordinator")
      );
    }
  }
);

// ================= GET ALL COORDINATORS =================
export const getAllCoordinators = createAsyncThunk(
  "coordinator/getAllCoordinators",
  async (params, thunkAPI) => {
    try {
      return await getAllCoordinatorsApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch coordinators")
      );
    }
  }
);

// ================= GET COORDINATOR BY ID =================
export const getCoordinatorById = createAsyncThunk(
  "coordinator/getCoordinatorById",
  async (id, thunkAPI) => {
    try {
      return await getCoordinatorByIdApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch coordinator")
      );
    }
  }
);

// ================= UPDATE COORDINATOR =================
export const updateCoordinator = createAsyncThunk(
  "coordinator/updateCoordinator",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateCoordinatorApi(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to update coordinator")
      );
    }
  }
);

// ================= DELETE COORDINATOR =================
export const deleteCoordinator = createAsyncThunk(
  "coordinator/deleteCoordinator",
  async (id, thunkAPI) => {
    try {
      return await deleteCoordinatorApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to delete coordinator")
      );
    }
  }
);
