import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  getActiveEventsApi,
  getAllEntryReportApi,
  exportEntryReportApi,
} from "../../services/entryReportService";

// ================= GET ACTIVE EVENTS =================
export const getActiveEvents = createAsyncThunk(
  "entryReport/getActiveEvents",
  async (params, thunkAPI) => {
    try {
      return await getActiveEventsApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to fetch active events"
      );
    }
  }
);

// ================= GET ENTRY REPORT =================
export const getAllEntryReport = createAsyncThunk(
  "entryReport/getAllEntryReport",
  async (params, thunkAPI) => {
    try {
      return await getAllEntryReportApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to fetch entry report"
      );
    }
  }
);

// ================= EXPORT ENTRY REPORT =================
export const exportEntryReport = createAsyncThunk(
  "entryReport/exportEntryReport",
  async (params, thunkAPI) => {
    try {
      return await exportEntryReportApi(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to export entry report"
      );
    }
  }
);