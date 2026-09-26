import { createSlice } from "@reduxjs/toolkit";
import {
  createNomination,
  getAllNominations,
  getNominationById,
} from "./nominationThunk";

const initialState = {
  nomination: null,
  nominations: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  loading: false,
  error: null,
  success: false,
  message: "",
};

const nominationSlice = createSlice({
  name: "nomination",

  initialState,

  reducers: {
    clearNominationState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE NOMINATION =================
    builder
      .addCase(createNomination.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNomination.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.nomination = action.payload.data;
      })
      .addCase(createNomination.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL NOMINATIONS =================
    builder
      .addCase(getAllNominations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllNominations.fulfilled, (state, action) => {
        state.loading = false;
        state.nominations = action.payload.data;
        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(getAllNominations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET NOMINATION BY ID =================
    builder
      .addCase(getNominationById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getNominationById.fulfilled, (state, action) => {
        state.loading = false;
        state.nomination = action.payload.data;
      })
      .addCase(getNominationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearNominationState } = nominationSlice.actions;

export default nominationSlice.reducer;
