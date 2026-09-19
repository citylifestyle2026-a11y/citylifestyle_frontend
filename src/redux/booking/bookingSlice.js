import { createSlice } from "@reduxjs/toolkit";
import {
  createBooking,
  importBookingsCsv,
  getAllBookings,
  getBookingById,
  deleteBooking,
  exportBookingReport,
} from "./bookingThunk";

const initialState = {
  booking: null,
  bookings: [],
  event: null,

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  exportLoading: false,
  createLoading: false,
  listLoading: false,
  deleteLoading: false,
  detailsLoading: false,
  importLoading: false,
  importResult: null,
  // Kept separate per action so a failure in one flow (e.g. delete) can
  // never be picked up and re-shown by a different UI surface (e.g. the
  // Create Booking modal) that happens to read a shared `error` field.
  createError: null,
  listError: null,
  detailsError: null,
  deleteError: null,
  exportError: null,
  importError: null,
  success: false,
  message: "",
};

const bookingSlice = createSlice({
  name: "booking",

  initialState,

  reducers: {
    // Only used around the create-booking flow.
    clearBookingState: (state) => {
      state.loading = false;
      state.createError = null;
      state.success = false;
      state.message = "";
    },

    clearBookingDetails: (state) => {
      state.booking = null;
    },

    // Reset the CSV import result/error — used when BulkImportBookingModal
    // is closed/reopened so a previous run's results/errors don't flash
    // before the next file is chosen.
    clearImportResult: (state) => {
      state.importResult = null;
      state.importError = null;
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE =================
    builder
      .addCase(createBooking.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.createLoading = false;
        state.success = true;
        state.message = action.payload.message;
        state.booking = action.payload.data;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload;
      });
      // ============= Export ==============
     builder
     .addCase(exportBookingReport.pending, (state) => {
      state.exportLoading = true;
    })

    .addCase(exportBookingReport.fulfilled, (state) => {
      state.exportLoading = false;
    })

    .addCase(exportBookingReport.rejected, (state, action) => {
      state.exportLoading = false;
      state.exportError = action.payload;
    });
    // ================= BULK IMPORT (CSV) =================
    builder
      .addCase(importBookingsCsv.pending, (state) => {
        state.importLoading = true;
        state.importError = null;
        state.importResult = null;
      })
      .addCase(importBookingsCsv.fulfilled, (state, action) => {
        state.importLoading = false;
        state.importResult = action.payload.data;
      })
      .addCase(importBookingsCsv.rejected, (state, action) => {
        state.importLoading = false;
        state.importError = action.payload;
      });
    // ================= GET ALL =================
    builder
      .addCase(getAllBookings.pending, (state) => {
        state.listLoading = true;
        state.listError = null;
        // Reset the pagination summary so it doesn't keep showing the
        // previous filter/search's stale "Show X - Y of Z" total while
        // the table itself is showing "Loading bookings...". Both are
        // now in sync until the new result arrives.
        state.total = 0;
        state.totalPages = 1;
      })
      .addCase(getAllBookings.fulfilled, (state, action) => {
        state.listLoading = false;

        state.bookings = action.payload.data;

        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;

        state.listError = null;
      })
      .addCase(getAllBookings.rejected, (state, action) => {
        state.listLoading = false;
        state.listError = action.payload;
      });
      // ============= export booking -=============

    // ================= GET BY ID =================
    builder
      .addCase(getBookingById.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(getBookingById.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.booking = action.payload.data;
      })
      .addCase(getBookingById.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = action.payload;
      });

    // ================= DELETE =================
    builder
      .addCase(deleteBooking.pending, (state) => {
        state.deleteLoading = true;
        state.deleteError = null;
      })
      .addCase(deleteBooking.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.success = true;
        state.message = action.payload.message;

        state.bookings = state.bookings.filter(
          (booking) => booking._id !== action.meta.arg.id
        );
      })
      .addCase(deleteBooking.rejected, (state, action) => {
        state.deleteLoading = false;
        state.deleteError = action.payload;
      });
  },
});

export const { clearBookingState, clearBookingDetails, clearImportResult } =
  bookingSlice.actions;

export default bookingSlice.reducer;