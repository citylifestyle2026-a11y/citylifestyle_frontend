import { createSlice } from "@reduxjs/toolkit";
import {
  createCrewCategory,
  getCrewCategoryById,
  getAllCrewCategories,
  updateCrewCategory,
  deleteCrewCategory,
} from "./crewCategoryThunk";

const initialState = {
  crewCategory: null,
  crewCategories: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  loading: false,
  // `error` = failure of a create / update / delete (shown INSIDE the modal).
  // `listError` = failure of loading the list (the only thing the table may
  // show). They were one field before, so a failed "Create" (e.g. "Category
  // name already exists") replaced the whole table with that message.
  error: null,
  listError: null,
  success: false,
  message: "",
};

const crewCategorySlice = createSlice({
  name: "crewCategory",

  initialState,

  reducers: {
    clearCrewCategoryState: (state) => {
      state.loading = false;
      state.error = null;
      state.listError = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE COMPANY CATEGORY =================
    builder
      .addCase(createCrewCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCrewCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.crewCategory = action.payload.data;
      })
      .addCase(createCrewCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET COMPANY CATEGORY BY ID =================
    builder
      .addCase(getCrewCategoryById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCrewCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.crewCategory = action.payload.data;
      })
      .addCase(getCrewCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL COMPANY CATEGORIES =================
    builder
      .addCase(getAllCrewCategories.pending, (state) => {
        state.loading = true;
        state.listError = null;
      })
      .addCase(getAllCrewCategories.fulfilled, (state, action) => {
        state.loading = false;

        state.crewCategories = action.payload.data;

        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(getAllCrewCategories.rejected, (state, action) => {
        state.loading = false;
        state.listError = action.payload;
      });

    // ================= UPDATE COMPANY CATEGORY =================
    builder
      .addCase(updateCrewCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCrewCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.crewCategory = action.payload.data;

        // Keep the list in sync without a refetch, same as
        // eventSlice.updateEvent / contactSlice.updateContact.
        state.crewCategories = state.crewCategories.map((category) =>
          category._id === action.payload.data._id
            ? action.payload.data
            : category
        );
      })
      .addCase(updateCrewCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE COMPANY CATEGORY =================
    builder
      .addCase(deleteCrewCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCrewCategory.fulfilled, (state, action) => {
        state.loading = false;

        // action.meta.arg is the bare category id passed into the thunk.
        const deletedId = action.meta.arg;

        state.crewCategories = state.crewCategories.filter(
          (category) => category._id !== deletedId
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteCrewCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCrewCategoryState } = crewCategorySlice.actions;

export default crewCategorySlice.reducer;