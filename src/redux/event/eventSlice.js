import { createSlice } from "@reduxjs/toolkit";
import {
  createEvent,
  getEventById,
  getAllEvents,
  changeEventStatus,
  updateEvent,
  deleteEvent,
} from "./eventThunk";

const initialState = {
  event: null,
  events: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  loading: false,
  error: null,
  success: false,
  message: "",

  // Id of the most recently successfully-deleted event, plus a counter that
  // increments on every delete. Other pages (e.g. Entry Report) that keep
  // data scoped to a specific event but don't own the Event Management
  // slice/thunks read this — via selectDeletedEventId/Version below — the
  // same way
  // EntryReport.jsx already reads qrSlice's checkInSuccess, so they can
  // react to a deletion that happened elsewhere without polling or a
  // browser reload. The counter (not just the id) is what's watched, so a
  // second delete of an id that was already seen once is still detected.
  deletedEventId: null,
  deletedEventVersion: 0,
};

const eventSlice = createSlice({
  name: "event",

  initialState,

  reducers: {
    clearEventState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE EVENT =================
    builder
      .addCase(createEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.event = action.payload.data;
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET EVENT =================
    builder
      .addCase(getEventById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getEventById.fulfilled, (state, action) => {
        state.loading = false;
        state.event = action.payload.data;
      })
      .addCase(getEventById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    // ================= GET ALL EVENTS =================
    builder
      .addCase(getAllEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllEvents.fulfilled, (state, action) => {
        state.loading = false;

        state.events = action.payload.data;

        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(getAllEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE EVENT =================
    builder
      .addCase(updateEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.event = action.payload.data;

        // Keep the list in sync without a refetch, same as changeEventStatus.
        state.events = state.events.map((event) =>
          event._id === action.payload.data._id
            ? action.payload.data
            : event
        );
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE EVENT =================
    builder
      .addCase(deleteEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.loading = false;

        // action.meta.arg is now { id, email, password } (Step 4) rather
        // than a bare id — read .id specifically. password/email are
        // never read back out of the store anywhere.
        const deletedId = action.meta.arg.id;

        state.events = state.events.filter(
          (event) => event._id !== deletedId
        );
        state.total = Math.max(0, state.total - 1);

        // Broadcast the deletion to any other page watching this slice
        // (see initialState comment above).
        state.deletedEventId = deletedId;
        state.deletedEventVersion += 1;
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= CHANGE EVENT STATUS =================
    builder
      .addCase(changeEventStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(changeEventStatus.fulfilled, (state, action) => {
        state.loading = false;

        state.events = state.events.map((event) =>
          event._id === action.payload.data._id
            ? action.payload.data
            : event
        );
      })
      .addCase(changeEventStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearEventState } = eventSlice.actions;

// Mirror qrSlice's selectCheckInSuccess: small primitive selectors other
// pages can subscribe to without importing the whole event slice's shape.
// Kept as two primitives (not one object-returning selector) so useSelector
// only re-renders subscribers when the value itself actually changes.
export const selectDeletedEventId = (state) => state.event.deletedEventId;
export const selectDeletedEventVersion = (state) =>
  state.event.deletedEventVersion;

export default eventSlice.reducer;