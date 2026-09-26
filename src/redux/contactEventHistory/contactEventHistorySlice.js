import { createSlice } from "@reduxjs/toolkit";
import {
  createEventHistory,
  getEventHistoryByContact,
  updateEventHistory,
  deleteEventHistory,
} from "./contactEventHistoryThunk";

const initialState = {
  history: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  loading: false,
  error: null,

  // Isolated from the main loading/error pair above, same reasoning as
  // contactSlice's exportLoading/exportError — a failed/in-flight
  // create-or-edit submit must never be picked up by the list's own
  // loading/error UI.
  actionLoading: false,
  actionError: null,
  success: false,
  message: "",
};

const contactEventHistorySlice = createSlice({
  name: "contactEventHistory",

  initialState,

  reducers: {
    clearContactEventHistoryState: (state) => {
      state.actionLoading = false;
      state.actionError = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE EVENT HISTORY =================
    builder
      .addCase(createEventHistory.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createEventHistory.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.success = true;
        state.message = action.payload.message;

        // Newest first, matching the backend's own createdAt: -1 sort —
        // prepending avoids a full refetch after every Add.
        state.history = [action.payload.data, ...state.history];
        state.total += 1;
      })
      .addCase(createEventHistory.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // ================= GET EVENT HISTORY BY CONTACT =================
    builder
      .addCase(getEventHistoryByContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEventHistoryByContact.fulfilled, (state, action) => {
        state.loading = false;

        state.history = action.payload.data;

        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(getEventHistoryByContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE EVENT HISTORY =================
    builder
      .addCase(updateEventHistory.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateEventHistory.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.success = true;
        state.message = action.payload.message;

        state.history = state.history.map((entry) =>
          entry._id === action.payload.data._id ? action.payload.data : entry
        );
      })
      .addCase(updateEventHistory.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // ================= DELETE EVENT HISTORY =================
    builder
      .addCase(deleteEventHistory.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(deleteEventHistory.fulfilled, (state, action) => {
        state.actionLoading = false;

        // action.meta.arg is the bare history id passed into the thunk.
        const deletedId = action.meta.arg;

        state.history = state.history.filter(
          (entry) => entry._id !== deletedId
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteEventHistory.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });
  },
});

export const { clearContactEventHistoryState } = contactEventHistorySlice.actions;

export default contactEventHistorySlice.reducer;
