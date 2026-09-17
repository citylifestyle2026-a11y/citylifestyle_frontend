import { createSlice } from "@reduxjs/toolkit";
import {
  createContact,
  getContactById,
  getAllContacts,
  exportContacts,
  updateContact,
  deleteContact,
  getUniqueReferences,
  getReferenceSummary,
} from "./contactThunk";

const initialState = {
  contact: null,
  contacts: [],

  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  // Kept separate from the main loading/error pair below (same
  // reasoning as bookingSlice's per-action error fields) so a failed
  // unique-references fetch can never be picked up and re-shown by a
  // different UI surface (e.g. the Contact list/table) that reads the
  // shared `error` field instead.
  uniqueReferences: [],
  uniqueReferencesLoading: false,
  uniqueReferencesError: null,

  // Same isolation as uniqueReferences above, but for the grouped
  // "Reference Summary" section shown below the Contact List table —
  // each entry is { reference, contactNames: string[] }.
  referenceSummary: [],
  referenceSummaryLoading: false,
  referenceSummaryError: null,

  // Isolated from the main loading/error pair, same reasoning as
  // uniqueReferences/referenceSummary above — an in-flight or failed
  // export must never be picked up by the table's own loading/error UI.
  exportLoading: false,
  exportError: null,

  loading: false,
  error: null,
  success: false,
  message: "",
};

const contactSlice = createSlice({
  name: "contact",

  initialState,

  reducers: {
    clearContactState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
  },

  extraReducers: (builder) => {
    // ================= CREATE CONTACT =================
    builder
      .addCase(createContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.contact = action.payload.data;
      })
      .addCase(createContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET CONTACT BY ID =================
    builder
      .addCase(getContactById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getContactById.fulfilled, (state, action) => {
        state.loading = false;
        state.contact = action.payload.data;
      })
      .addCase(getContactById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET ALL CONTACTS =================
    builder
      .addCase(getAllContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllContacts.fulfilled, (state, action) => {
        state.loading = false;

        state.contacts = action.payload.data;

        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(getAllContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= EXPORT CONTACTS =================
    builder
      .addCase(exportContacts.pending, (state) => {
        state.exportLoading = true;
        state.exportError = null;
      })
      .addCase(exportContacts.fulfilled, (state) => {
        state.exportLoading = false;
      })
      .addCase(exportContacts.rejected, (state, action) => {
        state.exportLoading = false;
        state.exportError = action.payload;
      });

    // ================= UPDATE CONTACT =================
    builder
      .addCase(updateContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
        state.contact = action.payload.data;

        // Keep the list in sync without a refetch, same as
        // eventSlice.updateEvent.
        state.contacts = state.contacts.map((contact) =>
          contact._id === action.payload.data._id
            ? action.payload.data
            : contact
        );
      })
      .addCase(updateContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= DELETE CONTACT =================
    builder
      .addCase(deleteContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.loading = false;

        // action.meta.arg is the bare contact id passed into the thunk.
        const deletedId = action.meta.arg;

        state.contacts = state.contacts.filter(
          (contact) => contact._id !== deletedId
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ================= GET UNIQUE REFERENCES =================
    builder
      .addCase(getUniqueReferences.pending, (state) => {
        state.uniqueReferencesLoading = true;
        state.uniqueReferencesError = null;
      })
      .addCase(getUniqueReferences.fulfilled, (state, action) => {
        state.uniqueReferencesLoading = false;
        state.uniqueReferences = action.payload.data;
      })
      .addCase(getUniqueReferences.rejected, (state, action) => {
        state.uniqueReferencesLoading = false;
        state.uniqueReferencesError = action.payload;
      });

    // ================= GET REFERENCE SUMMARY (GROUPED) =================
    builder
      .addCase(getReferenceSummary.pending, (state) => {
        state.referenceSummaryLoading = true;
        state.referenceSummaryError = null;
      })
      .addCase(getReferenceSummary.fulfilled, (state, action) => {
        state.referenceSummaryLoading = false;
        state.referenceSummary = action.payload.data;
      })
      .addCase(getReferenceSummary.rejected, (state, action) => {
        state.referenceSummaryLoading = false;
        state.referenceSummaryError = action.payload;
      });
  },
});

export const { clearContactState } = contactSlice.actions;

export default contactSlice.reducer;