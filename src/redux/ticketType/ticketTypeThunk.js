import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createTicketTypeApi,
  getAllTicketTypesApi,
  updateTicketTypeApi,
  deleteTicketTypeApi,
} from "../../services/ticketTypeService";
import { getApiErrorMessage } from "../../utilits/apiError";

// ================= CREATE TICKET TYPE =================
export const createTicketType = createAsyncThunk(
  "ticketType/createTicketType",
  async (data, thunkAPI) => {
    try {
      const response = await createTicketTypeApi(data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to create ticket type")
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
        getApiErrorMessage(error, "Failed to fetch ticket types")
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
        getApiErrorMessage(error, "Failed to update ticket type")
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
        getApiErrorMessage(error, "Failed to delete ticket type")
      );
    }
  }
);