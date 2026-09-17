import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createEventApi,
  getEventByIdApi,
  getAllEventsApi,
  changeEventStatusApi,
  updateEventApi,
  deleteEventApi,
} from "../../services/eventService";

// ================= CREATE EVENT =================
export const createEvent = createAsyncThunk(
  "event/createEvent",
  async (data, thunkAPI) => {
    try {
      const response = await createEventApi(data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to create event"
      );
    }
  }
);

// ================= GET EVENT BY ID =================
export const getEventById = createAsyncThunk(
  "event/getEventById",
  async (id, thunkAPI) => {
    try {
      const response = await getEventByIdApi(id);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch event"
      );
    }
  }
);
// ================ GET ALL EVENT =================
export const getAllEvents = createAsyncThunk(
  "event/getAllEvents",
  async (params, thunkAPI) => {
    try {
      return await getAllEventsApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch events"
      );
    }
  }
);
// ================= UPDATE EVENT =================
export const updateEvent = createAsyncThunk(
  "event/updateEvent",
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await updateEventApi(id, data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to update event"
      );
    }
  }
);

// ================= DELETE EVENT =================
// Secure Manual Event Delete (Step 4): now requires the currently
// authenticated admin's own { email, password } alongside the event id,
// forwarded as the DELETE request body to the Step 3 backend endpoint.
export const deleteEvent = createAsyncThunk(
  "event/deleteEvent",
  async ({ id, email, password }, thunkAPI) => {
    try {
      return await deleteEventApi(id, { email, password });
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to delete event"
      );
    }
  }
);

// Change Event Status
export const changeEventStatus = createAsyncThunk(
  "event/changeEventStatus",
  async (id, thunkAPI) => {
    try {
      return await changeEventStatusApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to change status"
      );
    }
  }
);