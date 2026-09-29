import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  getAllEventHistoryApi,
  createEventHistoryApi,
  getEventHistoryByContactApi,
  updateEventHistoryApi,
  deleteEventHistoryApi,
  getEventHistorySyncSummaryApi,
  syncEventHistoryFromEventApi,
} from "../../services/contactEventHistoryService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= GET ALL EVENT HISTORY (ALL CONTACTS) =================
export const getAllEventHistory = createAsyncThunk(
  "contactEventHistory/getAllEventHistory",
  async (params, thunkAPI) => {
    try {
      return await getAllEventHistoryApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch event history")
      );
    }
  }
);

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

// ================= ENTRY REPORT -> ADD TO EVENT HISTORY =================
// Used by AddToEventHistoryModal only, which reads the result straight from
// `.unwrap()` — no slice state is needed, so contactEventHistorySlice stays
// untouched.
export const getEventHistorySyncSummary = createAsyncThunk(
  "contactEventHistory/getEventHistorySyncSummary",
  async (eventId, thunkAPI) => {
    try {
      return await getEventHistorySyncSummaryApi(eventId);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to load the event history summary")
      );
    }
  }
);

export const syncEventHistoryFromEvent = createAsyncThunk(
  "contactEventHistory/syncEventHistoryFromEvent",
  async (data, thunkAPI) => {
    try {
      return await syncEventHistoryFromEventApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to add entries to event history")
      );
    }
  }
);
