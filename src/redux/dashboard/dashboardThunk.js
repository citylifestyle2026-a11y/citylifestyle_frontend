import { createAsyncThunk } from "@reduxjs/toolkit";
import { getDashboardSummaryApi } from "../../services/dashboardService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= GET DASHBOARD SUMMARY =================
export const getDashboardSummary = createAsyncThunk(
  "dashboard/getDashboardSummary",
  async (eventId, thunkAPI) => {
    try {
      return await getDashboardSummaryApi(eventId);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to fetch dashboard summary")
      );
    }
  }
);