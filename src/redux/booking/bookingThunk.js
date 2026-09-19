import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createBookingApi,
  importBookingsCsvApi,
  getAllBookingsApi,
  getBookingByIdApi,
  deleteBookingApi,
  exportBookings,
} from "../../services/bookingService";

// ================= CREATE BOOKING =================
export const createBooking = createAsyncThunk(
  "booking/createBooking",
  async (data, thunkAPI) => {
    try {
      return await createBookingApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to create booking"
      );
    }
  }
);

// ================= BULK IMPORT BOOKINGS (CSV) =================
// `file` is the raw browser File selected in BulkImportBookingModal.
// Resolves with the backend's { totalRows, successCount, failureCount,
// results } summary on both a fully- and a partially-successful import
// (the API itself always responds 200 as long as the file/rows were
// processed at all — a per-row failure is reported inside `results`,
// not as an HTTP error), so the modal can render success/failure per row.
export const importBookingsCsv = createAsyncThunk(
  "booking/importBookingsCsv",
  async (file, thunkAPI) => {
    try {
      return await importBookingsCsvApi(file);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to import bookings"
      );
    }
  }
);

// ================= GET ALL BOOKINGS =================
export const getAllBookings = createAsyncThunk(
  "booking/getAllBookings",
  async (
    {
      page = 1,
      limit = 10,
      bookingId = "",
      mobileNumber = "",
      name = "",
      eventId = "",
      createdBy = "",
      status = "",
      fromDate = "",
      toDate = "",
      search = "",
    } = {},
    thunkAPI
  ) => {
    try {
      const response = await getAllBookingsApi({
        page,
        limit,
        bookingId,
        mobileNumber,
        name,
        eventId,
        createdBy,
        status,
        fromDate,
        toDate,
        search,
      });

      return response;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to load bookings"
      );
    }
  }
);

// ================= GET BOOKING BY ID =================
export const getBookingById = createAsyncThunk(
  "booking/getBookingById",
  async (id, thunkAPI) => {
    try {
      return await getBookingByIdApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch booking"
      );
    }
  }
);

// ================= EXPORT BOOKINGS =================
export const exportBookingReport = createAsyncThunk(
  "booking/exportBookingReport",
  async (params, { rejectWithValue }) => {
    try {
      const response = await exportBookings(params);

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `BookingReport_${Date.now()}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to export bookings"
      );
    }
  }
);

// ================= DELETE BOOKING =================
export const deleteBooking = createAsyncThunk(
  "booking/deleteBooking",
  async ({ id, remark }, thunkAPI) => {
    try {
      return await deleteBookingApi(id, { remark });
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to delete booking"
      );
    }
  }
);