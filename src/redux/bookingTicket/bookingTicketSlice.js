import { createSlice } from "@reduxjs/toolkit";
import {
  getRegisterUser,
  updateRegisterUser,
  resendTicket,
} from "./bookingTicketThunk";

const initialState = {
  registerUser: null,

  loading: false,
  success: false,
  error: null,
  message: "",

  // Kept separate from the register-user state above so a resend
  // failure/loading state can never be picked up by a different UI
  // surface (e.g. the register-user modal) that happens to read the
  // shared loading/error/message fields.
  resendLoading: false,
  resendError: null,
};

const bookingTicketSlice = createSlice({
  name: "bookingTicket",

  initialState,

  reducers: {
    clearBookingTicketState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.message = "";
    },

    clearRegisterUser: (state) => {
      state.registerUser = null;
    },
  },

  extraReducers: (builder) => {
    // ================= GET REGISTER USER =================
    builder
      .addCase(getRegisterUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRegisterUser.fulfilled, (state, action) => {
        state.loading = false;
        state.registerUser = action.payload.data;
      })
      .addCase(getRegisterUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE REGISTER USER =================
    builder
      .addCase(updateRegisterUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRegisterUser.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.registerUser = action.payload.data;
      })
      .addCase(updateRegisterUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    // ================= RESEND TICKET (WHATSAPP) =================
    builder
      .addCase(resendTicket.pending, (state) => {
        state.resendLoading = true;
        state.resendError = null;
      })
      .addCase(resendTicket.fulfilled, (state) => {
        state.resendLoading = false;
      })
      .addCase(resendTicket.rejected, (state, action) => {
        state.resendLoading = false;
        state.resendError = action.payload;
      });
  },
});

export const {
  clearBookingTicketState,
  clearRegisterUser,
} = bookingTicketSlice.actions;

export default bookingTicketSlice.reducer;