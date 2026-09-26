import { createSlice } from "@reduxjs/toolkit";
import {
  createEdition,
  getAllEditions,
  getEditionById,
  updateEdition,
  deleteEdition,
} from "./editionThunk";

const initialState = {
  edition: null,
  editions: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  loading: false,
  error: null,
  success: false,
  message: "",
};

const editionSlice = createSlice({
  name: "edition",

  initialState,

  reducers: {
    clearEditionState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE EDITION =================
    builder
      .addCase(createEdition.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEdition.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.edition = action.payload.data;
      })
      .addCase(createEdition.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL EDITIONS =================
    builder
      .addCase(getAllEditions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllEditions.fulfilled, (state, action) => {
        state.loading = false;
        state.editions = action.payload.data;
        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(getAllEditions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET EDITION BY ID =================
    builder
      .addCase(getEditionById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getEditionById.fulfilled, (state, action) => {
        state.loading = false;
        state.edition = action.payload.data;
      })
      .addCase(getEditionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE EDITION =================
    builder
      .addCase(updateEdition.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEdition.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.edition = action.payload.data;

        state.editions = state.editions.map((edition) =>
          edition._id === action.payload.data._id ? action.payload.data : edition
        );
      })
      .addCase(updateEdition.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE EDITION =================
    builder
      .addCase(deleteEdition.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEdition.fulfilled, (state, action) => {
        state.loading = false;

        const deletedId = action.meta.arg;

        state.editions = state.editions.filter(
          (edition) => edition._id !== deletedId
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteEdition.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearEditionState } = editionSlice.actions;

export default editionSlice.reducer;
