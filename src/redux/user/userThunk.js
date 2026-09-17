import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createUserApi,
  getUsersApi,
  updateUserApi,
  deleteUserApi,
} from "../../services/userService";

// ==================== CREATE USER ====================
export const createUser = createAsyncThunk(
  "user/createUser",
  async (data, thunkAPI) => {
    try {
      const response = await createUserApi(data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data || {
          message: "Failed to create user",
        }
      );
    }
  }
);

// ==================== GET USERS ====================
export const getUsers = createAsyncThunk(
  "user/getUsers",
  async (params, thunkAPI) => {
    try {
      const response = await getUsersApi(params);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch users"
      );
    }
  }
);

// ==================== UPDATE USER ====================
export const updateUser = createAsyncThunk(
  "user/updateUser",
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await updateUserApi(id, data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to update user"
      );
    }
  }
);

// ==================== DELETE USER ====================
export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (id, thunkAPI) => {
    try {
      const response = await deleteUserApi(id);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to delete user"
      );
    }
  }
);