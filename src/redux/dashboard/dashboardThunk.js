import { createAsyncThunk } from "@reduxjs/toolkit";
import { getDashboardSummaryApi } from "../../services/dashboardService";

// ================= GET DASHBOARD SUMMARY =================
export const getDashboardSummary = createAsyncThunk(
  "dashboard/getDashboardSummary",
  async (eventId, thunkAPI) => {
    try {
      return await getDashboardSummaryApi(eventId);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch dashboard summary"
      );
    }
  }
);