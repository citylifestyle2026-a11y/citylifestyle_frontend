import { createSlice } from "@reduxjs/toolkit";
import {
  createCompanyCategory,
  getCompanyCategoryById,
  getAllCompanyCategories,
  updateCompanyCategory,
  deleteCompanyCategory,
} from "./companyCategoryThunk";

const initialState = {
  companyCategory: null,
  companyCategories: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  loading: false,
  error: null,
  success: false,
  message: "",
};

const companyCategorySlice = createSlice({
  name: "companyCategory",

  initialState,

  reducers: {
    clearCompanyCategoryState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE COMPANY CATEGORY =================
    builder
      .addCase(createCompanyCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCompanyCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.companyCategory = action.payload.data;
      })
      .addCase(createCompanyCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET COMPANY CATEGORY BY ID =================
    builder
      .addCase(getCompanyCategoryById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCompanyCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.companyCategory = action.payload.data;
      })
      .addCase(getCompanyCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL COMPANY CATEGORIES =================
    builder
      .addCase(getAllCompanyCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllCompanyCategories.fulfilled, (state, action) => {
        state.loading = false;

        state.companyCategories = action.payload.data;

        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(getAllCompanyCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= UPDATE COMPANY CATEGORY =================
    builder
      .addCase(updateCompanyCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompanyCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.companyCategory = action.payload.data;

        // Keep the list in sync without a refetch, same as
        // eventSlice.updateEvent / contactSlice.updateContact.
        state.companyCategories = state.companyCategories.map((category) =>
          category._id === action.payload.data._id
            ? action.payload.data
            : category
        );
      })
      .addCase(updateCompanyCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE COMPANY CATEGORY =================
    builder
      .addCase(deleteCompanyCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCompanyCategory.fulfilled, (state, action) => {
        state.loading = false;

        // action.meta.arg is the bare category id passed into the thunk.
        const deletedId = action.meta.arg;

        state.companyCategories = state.companyCategories.filter(
          (category) => category._id !== deletedId
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteCompanyCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCompanyCategoryState } = companyCategorySlice.actions;

export default companyCategorySlice.reducer;