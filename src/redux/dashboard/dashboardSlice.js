import { createSlice } from "@reduxjs/toolkit";
import { getDashboardSummary } from "./dashboardThunk";

const initialState = {
  dashboardData: null,
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",

  initialState,

  reducers: {
    clearDashboardState: (state) => {
      state.loading = false;
      state.error = null;
      state.dashboardData = null;
    },
  },

  extraReducers: (builder) => {
    // ================= GET DASHBOARD SUMMARY =================
    builder
      .addCase(getDashboardSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDashboardSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload.data;
      })
      .addCase(getDashboardSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearDashboardState } = dashboardSlice.actions;

export default dashboardSlice.reducer;