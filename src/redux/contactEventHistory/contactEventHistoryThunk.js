import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createEventHistoryApi,
  getEventHistoryByContactApi,
  updateEventHistoryApi,
  deleteEventHistoryApi,
} from "../../services/contactEventHistoryService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= CREATE EVENT HISTORY =================
export const createEventHistory = createAsyncThunk(
  "contactEventHistory/createEventHistory",
  async (data, thunkAPI) => {
    try {
      return await createEventHistoryApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to create event history entry")
      );
    }
  }
);

// ================= GET EVENT HISTORY BY CONTACT =================
export const getEventHistoryByContact = createAsyncThunk(
  "contactEventHistory/getEventHistoryByContact",
  async ({ contactId, params }, thunkAPI) => {
    try {
      return await getEventHistoryByContactApi(contactId, params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch event history")
      );
    }
  }
);

// ================= UPDATE EVENT HISTORY =================
export const updateEventHistory = createAsyncThunk(
  "contactEventHistory/updateEventHistory",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateEventHistoryApi(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to update event history entry")
      );
    }
  }
);

// ================= DELETE EVENT HISTORY =================
export const deleteEventHistory = createAsyncThunk(
  "contactEventHistory/deleteEventHistory",
  async (id, thunkAPI) => {
    try {
      return await deleteEventHistoryApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to delete event history entry")
      );
    }
  }
);
