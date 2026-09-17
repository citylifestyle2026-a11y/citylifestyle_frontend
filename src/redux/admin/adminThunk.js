import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createAdminApi,
  getAllAdminsApi,
  updateOwnAdminApi,
  updateAdminByIdApi,
  deleteAdminApi,
} from "../../services/adminService";

// ==================== CREATE ADMIN ====================
// `data` is always just { name, email, mobile, password } — no
// role/adminType field exists on this call, matching the backend
// contract (POST /api/admin only ever accepts those four fields).
export const createAdmin = createAsyncThunk(
  "admin/createAdmin",
  async (data, thunkAPI) => {
    try {
      const response = await createAdminApi(data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to create admin"
      );
    }
  }
);

// ==================== GET ALL ADMINS ====================
export const getAllAdmins = createAsyncThunk(
  "admin/getAllAdmins",
  async (_, thunkAPI) => {
    try {
      const response = await getAllAdminsApi();
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch admins"
      );
    }
  }
);

// ==================== UPDATE OWN ADMIN ====================
// `data` is always just { name, email, mobile } — there is no admin id
// involved anywhere on the frontend for this call either, matching the
// backend's /admin/me (self-only, no :id).
export const updateOwnAdmin = createAsyncThunk(
  "admin/updateOwnAdmin",
  async (data, thunkAPI) => {
    try {
      const response = await updateOwnAdminApi(data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to update admin"
      );
    }
  }
);

// ==================== UPDATE ANY ADMIN BY ID (SUPER ADMIN ONLY) ====================
// `id` is the target Admin's id, `data` is { name, email, mobile }. Only
// ever dispatched when the logged-in admin is a Super Admin editing
// another admin's row (see EditAdminModal) — the backend independently
// enforces this via authorize.requireSuperAdmin on PUT /api/admin/:id.
export const updateAdminById = createAsyncThunk(
  "admin/updateAdminById",
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await updateAdminByIdApi(id, data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to update admin"
      );
    }
  }
);

// ==================== DELETE ADMIN (SUPER ADMIN ONLY) ====================
// `id` is the target Admin's id. Only ever dispatched when the logged-in
// admin is a Super Admin deleting a DIFFERENT admin's row (see
// Pages/Admin.jsx) — the backend independently enforces both the
// Super-Admin-only rule and the self-delete guard on
// DELETE /api/admin/:id.
export const deleteAdmin = createAsyncThunk(
  "admin/deleteAdmin",
  async (id, thunkAPI) => {
    try {
      const response = await deleteAdminApi(id);
      return { id, ...response.data };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to delete admin"
      );
    }
  }
);