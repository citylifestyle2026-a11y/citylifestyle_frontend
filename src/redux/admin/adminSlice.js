import { createSlice } from "@reduxjs/toolkit";
import {
  createAdmin,
  getAllAdmins,
  updateOwnAdmin,
  updateAdminById,
  deleteAdmin,
} from "./adminThunk";

const initialState = {
  admins: [],

  loading: false,
  error: null,
  success: false,
  message: "",
};

const adminSlice = createSlice({
  name: "admin",
  initialState,

  reducers: {
    clearAdminState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE ADMIN =================
    // Super-Admin-only from the caller's side of the flow; the component
    // (Pages/Admin.jsx) is responsible for re-fetching the list via
    // getAllAdmins() on success, same as updateOwnAdmin's usage pattern
    // in EditAdminModal — this slice only tracks request status/message
    // here, it does not itself insert the new admin into `state.admins`.
    builder
      .addCase(createAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
      })
      .addCase(createAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL ADMINS =================
    builder
      .addCase(getAllAdmins.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllAdmins.fulfilled, (state, action) => {
        state.loading = false;
        state.admins = action.payload.data;
      })
      .addCase(getAllAdmins.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE OWN ADMIN =================
    builder
      .addCase(updateOwnAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOwnAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;

        // Patch the edited admin in place, same pattern as
        // userSlice.updateUser — the row updates immediately without
        // waiting for a full list refetch.
        state.admins = state.admins.map((admin) =>
          admin._id === action.payload.data._id
            ? action.payload.data
            : admin
        );
      })
      .addCase(updateOwnAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE ANY ADMIN BY ID (SUPER ADMIN ONLY) =================
    // Same patch-in-place pattern as updateOwnAdmin above.
    builder
      .addCase(updateAdminById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAdminById.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;

        state.admins = state.admins.map((admin) =>
          admin._id === action.payload.data._id
            ? action.payload.data
            : admin
        );
      })
      .addCase(updateAdminById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE ADMIN (SUPER ADMIN ONLY) =================
    // Removes the deleted admin from `state.admins` immediately —
    // matches userSlice.deleteUser's pattern of not requiring a full
    // list refetch, though Pages/Admin.jsx still refetches too (same
    // belt-and-suspenders approach already used for delete in User.jsx).
    builder
      .addCase(deleteAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.admins = state.admins.filter(
          (admin) => admin._id !== action.payload.id
        );
      })
      .addCase(deleteAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAdminState } = adminSlice.actions;

export default adminSlice.reducer;