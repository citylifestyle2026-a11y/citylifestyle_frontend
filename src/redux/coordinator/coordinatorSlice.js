import { createSlice } from "@reduxjs/toolkit";
import {
  createCoordinator,
  getAllCoordinators,
  getCoordinatorById,
  updateCoordinator,
  deleteCoordinator,
} from "./coordinatorThunk";

const initialState = {
  coordinator: null,
  coordinators: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  loading: false,
  error: null,
  success: false,
  message: "",
};

const coordinatorSlice = createSlice({
  name: "coordinator",

  initialState,

  reducers: {
    clearCoordinatorState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE COORDINATOR =================
    builder
      .addCase(createCoordinator.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCoordinator.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.coordinator = action.payload.data;
      })
      .addCase(createCoordinator.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL COORDINATORS =================
    // NOTE: coordinator.controller.js (backend) returns
    // { success, data: { coordinators, pagination } } — nested, unlike
    // guest/edition's flat { success, data: [...], pagination }. Read
    // accordingly.
    builder
      .addCase(getAllCoordinators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllCoordinators.fulfilled, (state, action) => {
        state.loading = false;
        state.coordinators = action.payload.data.coordinators;
        state.total = action.payload.data.pagination.total;
        state.page = action.payload.data.pagination.page;
        state.limit = action.payload.data.pagination.limit;
        state.totalPages = action.payload.data.pagination.totalPages;
      })
      .addCase(getAllCoordinators.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET COORDINATOR BY ID =================
    builder
      .addCase(getCoordinatorById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCoordinatorById.fulfilled, (state, action) => {
        state.loading = false;
        state.coordinator = action.payload.data;
      })
      .addCase(getCoordinatorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE COORDINATOR =================
    builder
      .addCase(updateCoordinator.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCoordinator.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.coordinator = action.payload.data;

        // Keep the list in sync without a refetch, same as guestSlice.
        state.coordinators = state.coordinators.map((coordinator) =>
          coordinator._id === action.payload.data._id
            ? action.payload.data
            : coordinator
        );
      })
      .addCase(updateCoordinator.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE COORDINATOR =================
    builder
      .addCase(deleteCoordinator.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCoordinator.fulfilled, (state, action) => {
        state.loading = false;

        const deletedId = action.meta.arg;

        state.coordinators = state.coordinators.filter(
          (coordinator) => coordinator._id !== deletedId
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteCoordinator.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCoordinatorState } = coordinatorSlice.actions;

export default coordinatorSlice.reducer;
