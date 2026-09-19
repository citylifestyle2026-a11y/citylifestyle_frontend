import { createSlice } from "@reduxjs/toolkit";

import {
  getActiveEvents,
  getAllEntryReport,
  exportEntryReport,
} from "./entryReportThunk";

const initialState = {
  entryReports: [],
  pagination: null,
  event: null,

  // IST "YYYY-MM-DD" list of every date the selected event scope's ticket
  // types allow — the only dates the Pass Date picker offers. The scope
  // (eventId, "" = All Events) it was loaded for is remembered so a stale
  // list from a previously selected event is never reused.
  allowedPassDates: [],
  allowedPassDatesScope: "",

  activeEvents: [],
  activeEventsLoading: false,
  activeEventsError: null,

  loading: false,
  exportLoading: false,

  success: false,
  error: null,
  message: "",
};

const entryReportSlice = createSlice({
  name: "entryReport",

  initialState,

  reducers: {
    clearEntryReportState: (state) => {
      state.loading = false;
      state.exportLoading = false;
      state.success = false;
      state.error = null;
      state.message = "";

      // Previously this action only cleared transient loading/error flags.
      // It was not dispatched anywhere in the codebase, so widening it to
      // also reset the fetched report data is safe. EntryReport.jsx now
      // dispatches this when the active event disappears (goes
      // Inactive/Expired) while the user is on the page, so the old
      // event's rows/pagination don't linger on screen looking valid.
      state.entryReports = [];
      state.pagination = null;
      state.event = null;
      state.allowedPassDates = [];
      state.allowedPassDatesScope = "";
    },
  },

  extraReducers: (builder) => {
    // ================= GET ACTIVE EVENTS =================
    // Intentionally kept on its own loading/error flags (not `loading`/
    // `error`), which drive the main table's loading/error state — a
    // failure fetching the dropdown's event list shouldn't flip the table
    // into its error view.
    builder
      .addCase(getActiveEvents.pending, (state) => {
        state.activeEventsLoading = true;
        state.activeEventsError = null;
      })
      .addCase(getActiveEvents.fulfilled, (state, action) => {
        state.activeEventsLoading = false;
        state.activeEvents = action.payload?.data ?? [];
      })
      .addCase(getActiveEvents.rejected, (state, action) => {
        state.activeEventsLoading = false;
        state.activeEventsError = action.payload;
      });

    // ================= GET ENTRY REPORT =================

    builder
      .addCase(getAllEntryReport.pending, (state, action) => {
        state.loading = true;
        state.error = null;

        // Different event scope than the one the allowed dates were
        // loaded for -> drop them until the new response arrives, so the
        // picker can't offer another event's dates in the meantime.
        if ((action.meta?.arg?.eventId || "") !== state.allowedPassDatesScope) {
          state.allowedPassDates = [];
        }
      })
      .addCase(getAllEntryReport.fulfilled, (state, action) => {
        state.loading = false;

        state.entryReports = action.payload?.data?.rows ?? [];
        state.pagination = action.payload?.data?.pagination ?? null;
        state.event = action.payload?.data?.event ?? null;

        state.allowedPassDates = action.payload?.data?.allowedPassDates ?? [];
        state.allowedPassDatesScope = action.meta?.arg?.eventId || "";

        state.success = action.payload?.success ?? false;
        state.message = action.payload?.message ?? "";
      })
      .addCase(getAllEntryReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= EXPORT ENTRY REPORT =================

    // NOTE: export pending/rejected intentionally do NOT touch `state.error`.
    // That field drives the main table's API-error state (see EntryReport.jsx
    // errorMessage). It previously was shared with export, so triggering an
    // export failure while a valid list was already loaded made the whole
    // table flip to the error view even though the list fetch itself never
    // failed. Export success/failure is now surfaced via toast in the page
    // component instead, using the thunk's own fulfilled/rejected result.
    builder
      .addCase(exportEntryReport.pending, (state) => {
        state.exportLoading = true;
      })
      .addCase(exportEntryReport.fulfilled, (state) => {
        state.exportLoading = false;
      })
      .addCase(exportEntryReport.rejected, (state) => {
        state.exportLoading = false;
      });
  },
});

export const { clearEntryReportState } = entryReportSlice.actions;

export default entryReportSlice.reducer;