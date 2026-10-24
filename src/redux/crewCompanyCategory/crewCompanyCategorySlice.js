import { createSlice } from "@reduxjs/toolkit";
import {
  createCrewCompanyCategory,
  getCrewCompanyCategoryById,
  getAllCrewCompanyCategories,
  updateCrewCompanyCategory,
  deleteCrewCompanyCategory,
} from "./crewCompanyCategoryThunk";

const initialState = {
  crewCompanyCategory: null,
  crewCompanyCategories: [],

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

const crewCompanyCategorySlice = createSlice({
  name: "crewCompanyCategory",

  initialState,

  reducers: {
    clearCrewCompanyCategoryState: (state) => {
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
      .addCase(createCrewCompanyCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCrewCompanyCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.crewCompanyCategory = action.payload.data;
      })
      .addCase(createCrewCompanyCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET COMPANY CATEGORY BY ID =================
    builder
      .addCase(getCrewCompanyCategoryById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCrewCompanyCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.crewCompanyCategory = action.payload.data;
      })
      .addCase(getCrewCompanyCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL COMPANY CATEGORIES =================
    builder
      .addCase(getAllCrewCompanyCategories.pending, (state) => {
        state.loading = true;
        state.listError = null;
      })
      .addCase(getAllCrewCompanyCategories.fulfilled, (state, action) => {
        state.loading = false;

        state.crewCompanyCategories = action.payload.data;

        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(getAllCrewCompanyCategories.rejected, (state, action) => {
        state.loading = false;
        state.listError = action.payload;
      });

    // ================= UPDATE COMPANY CATEGORY =================
    builder
      .addCase(updateCrewCompanyCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCrewCompanyCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.crewCompanyCategory = action.payload.data;

        // Keep the list in sync without a refetch, same as
        // eventSlice.updateEvent / contactSlice.updateContact.
        state.crewCompanyCategories = state.crewCompanyCategories.map((category) =>
          category._id === action.payload.data._id
            ? action.payload.data
            : category
        );
      })
      .addCase(updateCrewCompanyCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE COMPANY CATEGORY =================
    builder
      .addCase(deleteCrewCompanyCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCrewCompanyCategory.fulfilled, (state, action) => {
        state.loading = false;

        // action.meta.arg is the bare category id passed into the thunk.
        const deletedId = action.meta.arg;

        state.crewCompanyCategories = state.crewCompanyCategories.filter(
          (category) => category._id !== deletedId
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteCrewCompanyCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCrewCompanyCategoryState } = crewCompanyCategorySlice.actions;

export default crewCompanyCategorySlice.reducer;