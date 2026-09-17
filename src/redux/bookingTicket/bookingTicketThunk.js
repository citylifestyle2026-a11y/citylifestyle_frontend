import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  getRegisterUserApi,
  updateRegisterUserApi,
  resendTicketApi,
} from "../../services/bookingTicketService";

// ================= GET REGISTER USER =================
export const getRegisterUser = createAsyncThunk(
  "bookingTicket/getRegisterUser",
  async (ticketId, thunkAPI) => {
    try {
      return await getRegisterUserApi(ticketId);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch register user"
      );
    }
  }
);

// ================= UPDATE REGISTER USER =================
export const updateRegisterUser = createAsyncThunk(
  "bookingTicket/updateRegisterUser",
  async ({ ticketId, formData }, thunkAPI) => {
    try {
      return await updateRegisterUserApi(
        ticketId,
        formData
      );
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          "Failed to update register user"
      );
    }
  }
);

// ================= RESEND TICKET (WHATSAPP) =================
export const resendTicket = createAsyncThunk(
  "bookingTicket/resendTicket",
  async (ticketId, thunkAPI) => {
    try {
      return await resendTicketApi(ticketId);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          "Failed to resend ticket"
      );
    }
  }
);