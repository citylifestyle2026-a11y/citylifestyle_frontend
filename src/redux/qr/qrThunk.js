import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  verifyQrApi,
  checkInQrApi,
} from "../../services/qrService";

/**
 * Builds a structured error object instead of a bare string, so the UI
 * can tell apart two fundamentally different failure modes:
 *
 *  - SERVER:  the request reached the backend and it responded (even
 *             with an error status) — e.g. "Invalid QR", "Ticket already
 *             used". `error.response` is present.
 *  - NETWORK: the request never completed a round trip at all — CORS
 *             rejection, mixed-content block, DNS failure, dropped
 *             connection, or timeout. `error.response` is absent.
 *
 * Collapsing both into one string previously made a pure connectivity
 * failure indistinguishable from a real "this ticket is invalid" result.
 */
const buildQrError = (error, fallback) => {
  if (error.response) {
    return {
      type: "SERVER",
      message: error.response.data?.message || fallback,
    };
  }

  return {
    type: "NETWORK",
    message: error.message || fallback,
  };
};

// ================= VERIFY QR =================
export const verifyQr = createAsyncThunk(
  "qr/verifyQr",
  async (data, thunkAPI) => {
    try {
      return await verifyQrApi(data, { signal: thunkAPI.signal });
    } catch (error) {
      if (thunkAPI.signal.aborted) {
        return thunkAPI.rejectWithValue(null);
      }
      return thunkAPI.rejectWithValue(
        buildQrError(error, "Failed to verify QR")
      );
    }
  },
  {
    // Prevent firing a second verify request while one is already in-flight
    condition: (_data, { getState }) => {
      const { qr } = getState();
      if (qr?.verify?.loading) return false;
      return true;
    },
  }
);

// ================= CHECK-IN QR =================
export const checkInQr = createAsyncThunk(
  "qr/checkInQr",
  async (data, thunkAPI) => {
    try {
      return await checkInQrApi(data, { signal: thunkAPI.signal });
    } catch (error) {
      if (thunkAPI.signal.aborted) {
        return thunkAPI.rejectWithValue(null);
      }
      return thunkAPI.rejectWithValue(
        buildQrError(error, "Failed to check-in QR")
      );
    }
  },
  {
    // Prevent double check-in taps from firing duplicate requests
    condition: (_data, { getState }) => {
      const { qr } = getState();
      if (qr?.checkIn?.loading) return false;
      return true;
    },
  }
);
