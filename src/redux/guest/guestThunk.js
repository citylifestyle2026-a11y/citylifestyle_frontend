import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createGuestApi,
  getAllGuestsApi,
  getGuestByIdApi,
  updateGuestApi,
  deleteGuestApi,
} from "../../services/guestService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= CREATE GUEST =================
export const createGuest = createAsyncThunk(
  "guest/createGuest",
  async (data, thunkAPI) => {
    try {
      return await createGuestApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to create guest")
      );
    }
  }
);

// ================= GET ALL GUESTS =================
export const getAllGuests = createAsyncThunk(
  "guest/getAllGuests",
  async (params, thunkAPI) => {
    try {
      return await getAllGuestsApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch guests")
      );
    }
  }
);

// ================= GET GUEST BY ID =================
export const getGuestById = createAsyncThunk(
  "guest/getGuestById",
  async (id, thunkAPI) => {
    try {
      return await getGuestByIdApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch guest")
      );
    }
  }
);

// ================= UPDATE GUEST =================
export const updateGuest = createAsyncThunk(
  "guest/updateGuest",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateGuestApi(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to update guest")
      );
    }
  }
);

// ================= DELETE GUEST =================
export const deleteGuest = createAsyncThunk(
  "guest/deleteGuest",
  async (id, thunkAPI) => {
    try {
      return await deleteGuestApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to delete guest")
      );
    }
  }
);
