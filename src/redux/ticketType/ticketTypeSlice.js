import { createSlice } from "@reduxjs/toolkit";
import {
  createTicketType,
  getAllTicketTypes,
  updateTicketType,
  deleteTicketType,
} from "./ticketTypeThunk";

const initialState = {
  ticketType: null,
  ticketTypes: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  loading: false,
  error: null,
  success: false,
  message: "",
};

const ticketTypeSlice = createSlice({
  name: "ticketType",

  initialState,

  reducers: {
    clearTicketTypeState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE =================
    builder
      .addCase(createTicketType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTicketType.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.ticketType = action.payload.data;
      })
      .addCase(createTicketType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL =================
    builder
      .addCase(getAllTicketTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllTicketTypes.fulfilled, (state, action) => {
        state.loading = false;

        state.ticketTypes = action.payload.ticketTypes;

        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(getAllTicketTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE =================
    builder
      .addCase(updateTicketType.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTicketType.fulfilled, (state, action) => {
        state.loading = false;
          state.success = true;
        state.ticketTypes = state.ticketTypes.map((ticket) =>
          ticket._id === action.payload.data._id
            ? action.payload.data
            : ticket
        );
      })
      .addCase(updateTicketType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE =================
    builder
      .addCase(deleteTicketType.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteTicketType.fulfilled, (state, action) => {
        state.loading = false;
            state.success = true;
        state.ticketTypes = state.ticketTypes.filter(
          (ticket) => ticket._id !== action.meta.arg
        );
      })
      .addCase(deleteTicketType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearTicketTypeState } = ticketTypeSlice.actions;

export default ticketTypeSlice.reducer;