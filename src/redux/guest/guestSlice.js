import { createSlice } from "@reduxjs/toolkit";
import {
  createGuest,
  getAllGuests,
  getGuestById,
  updateGuest,
  deleteGuest,
} from "./guestThunk";

const initialState = {
  guest: null,
  guests: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  loading: false,
  error: null,
  success: false,
  message: "",
};

const guestSlice = createSlice({
  name: "guest",

  initialState,

  reducers: {
    clearGuestState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE GUEST =================
    builder
      .addCase(createGuest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGuest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.guest = action.payload.data;
      })
      .addCase(createGuest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL GUESTS =================
    builder
      .addCase(getAllGuests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllGuests.fulfilled, (state, action) => {
        state.loading = false;
        state.guests = action.payload.data;
        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(getAllGuests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET GUEST BY ID =================
    builder
      .addCase(getGuestById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getGuestById.fulfilled, (state, action) => {
        state.loading = false;
        state.guest = action.payload.data;
      })
      .addCase(getGuestById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE GUEST =================
    builder
      .addCase(updateGuest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGuest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.guest = action.payload.data;

        // Keep the list in sync without a refetch, same as
        // contactSlice.updateContact.
        state.guests = state.guests.map((guest) =>
          guest._id === action.payload.data._id ? action.payload.data : guest
        );
      })
      .addCase(updateGuest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE GUEST =================
    builder
      .addCase(deleteGuest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGuest.fulfilled, (state, action) => {
        state.loading = false;

        const deletedId = action.meta.arg;

        state.guests = state.guests.filter((guest) => guest._id !== deletedId);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteGuest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearGuestState } = guestSlice.actions;

export default guestSlice.reducer;
