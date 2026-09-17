import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createTicketTypeApi,
  getAllTicketTypesApi,
  updateTicketTypeApi,
  deleteTicketTypeApi,
} from "../../services/ticketTypeService";

// ================= CREATE TICKET TYPE =================
export const createTicketType = createAsyncThunk(
  "ticketType/createTicketType",
  async (data, thunkAPI) => {
    try {
      const response = await createTicketTypeApi(data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to create ticket type"
      );
    }
  }
);

// ================= GET ALL TICKET TYPES =================
export const getAllTicketTypes = createAsyncThunk(
  "ticketType/getAllTicketTypes",
  async ({ eventId, page = 1, limit = 10, search = "" }, thunkAPI) => {
    try {
      return await getAllTicketTypesApi(eventId, {
        page,
        limit,
        search,
      });
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || error.message
      );
    }
  }
);

// ================= UPDATE TICKET TYPE =================
export const updateTicketType = createAsyncThunk(
  "ticketType/updateTicketType",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateTicketTypeApi(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to update ticket type"
      );
    }
  }
);

// ================= DELETE TICKET TYPE =================
export const deleteTicketType = createAsyncThunk(
  "ticketType/deleteTicketType",
  async (id, thunkAPI) => {
    try {
      return await deleteTicketTypeApi(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to delete ticket type"
      );
    }
  }
);