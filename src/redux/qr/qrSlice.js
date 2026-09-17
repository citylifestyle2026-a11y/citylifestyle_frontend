import { createSlice } from "@reduxjs/toolkit";

import {
  verifyQr,
  checkInQr,
} from "./qrThunk";

/**
 * Each async operation (verify / checkIn) gets its OWN
 * loading / success / error state. This avoids race conditions
 * where a fast double-scan or a verify+checkIn overlap would
 * otherwise stomp on a single shared flag.
 */
const initialOperationState = {
  loading: false,
  success: false,
  error: null,
};

const initialState = {
  ticket: null,
  message: "",
  verify: { ...initialOperationState },
  checkIn: { ...initialOperationState },
};

const qrSlice = createSlice({
  name: "qr",

  initialState,

  reducers: {
    // Full reset — use when leaving the scanner screen entirely
    resetQrState: () => initialState,

    // Clear only the ticket + messages, keep operation flags untouched
    clearQrTicket: (state) => {
      state.ticket = null;
      state.message = "";
    },

    // Clear error for a specific operation ("verify" | "checkIn" | "all")
    clearQrError: (state, action) => {
      const target = action.payload ?? "all";

      if (target === "verify" || target === "all") {
        state.verify.error = null;
      }
      if (target === "checkIn" || target === "all") {
        state.checkIn.error = null;
      }
    },

    // Reset just the success flags (e.g. after showing a toast)
    clearQrSuccess: (state, action) => {
      const target = action.payload ?? "all";

      if (target === "verify" || target === "all") {
        state.verify.success = false;
      }
      if (target === "checkIn" || target === "all") {
        state.checkIn.success = false;
      }
    },
  },

  extraReducers: (builder) => {
    // ================= VERIFY =================
    builder
      .addCase(verifyQr.pending, (state) => {
        state.verify.loading = true;
        state.verify.success = false;
        state.verify.error = null;
      })

      .addCase(verifyQr.fulfilled, (state, action) => {
        state.verify.loading = false;
        state.verify.success = true;
        state.ticket = action.payload.data;
        state.message = action.payload.message ?? "";
      })

      .addCase(verifyQr.rejected, (state, action) => {
        // Ignore aborted/duplicate requests — don't surface a false error
        if (action.meta.aborted) return;

        state.verify.loading = false;
        state.verify.success = false;
        state.verify.error = action.payload || {
          type: "SERVER",
          message: "Failed to verify QR",
        };
      });

    // ================= CHECK-IN =================
    builder
      .addCase(checkInQr.pending, (state) => {
        state.checkIn.loading = true;
        state.checkIn.success = false;
        state.checkIn.error = null;
      })

      .addCase(checkInQr.fulfilled, (state, action) => {
        state.checkIn.loading = false;
        state.checkIn.success = true;
        state.message = action.payload.message ?? "";

        // Guard: only mutate ticket if it matches the checked-in ticket
        if (state.ticket && action.payload?.data?.id) {
          if (state.ticket.id === action.payload.data.id) {
            state.ticket.status = "Used";
          }
        } else if (state.ticket) {
          // Fallback when API doesn't echo back an id
          state.ticket.status = "Used";
        }
      })

      .addCase(checkInQr.rejected, (state, action) => {
        if (action.meta.aborted) return;

        state.checkIn.loading = false;
        state.checkIn.success = false;
        state.checkIn.error = action.payload || {
          type: "SERVER",
          message: "Failed to check-in QR",
        };
      });
  },
});

export const {
  resetQrState,
  clearQrTicket,
  clearQrError,
  clearQrSuccess,
} = qrSlice.actions;

// ================= SELECTORS =================
export const selectQrTicket = (state) => state.qr.ticket;
export const selectQrMessage = (state) => state.qr.message;

export const selectVerifyLoading = (state) => state.qr.verify.loading;
export const selectVerifySuccess = (state) => state.qr.verify.success;
export const selectVerifyError = (state) => state.qr.verify.error;

export const selectCheckInLoading = (state) => state.qr.checkIn.loading;
export const selectCheckInSuccess = (state) => state.qr.checkIn.success;
export const selectCheckInError = (state) => state.qr.checkIn.error;

export default qrSlice.reducer;
