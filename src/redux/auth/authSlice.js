import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginApi } from "../../services/authService";
import { getProfileApi } from "../../services/authService";
import { updateProfileApi } from "../../services/authService";
import { resetPasswordApi } from "../../services/authService";
import {
  forgotPasswordApi,
  resetPasswordWithOtpApi,
} from "../../services/authService";
import { getApiErrorMessage, UPLOAD_NETWORK_MESSAGE } from "../../utilits/apiError";

// post api login
export const login = createAsyncThunk(
  "auth/login",
  async (data, thunkAPI) => {
    try {
      return await loginApi(data);
    } catch (error) {
      // Always trust the backend's actual message when present. The
      // backend intentionally returns the SAME generic message
      // ("Invalid email/mobile or password") whether the username or
      // the password was wrong — that's a deliberate security choice
      // to avoid leaking which credential was incorrect. The frontend
      // must never relabel that as something more specific (e.g.
      // "Invalid username") and must never guess based on its own logic.
      // getApiErrorMessage returns that backend message untouched when there
      // is one; only when there is none does it fall back to the texts below.
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(
          error,
          "Something went wrong while signing in. Please try again.",
          {
            networkMessage:
              "Network error. Please check your connection and try again.",
          }
        )
      );
    }
  }
);

//get api login
export const getProfile = createAsyncThunk(
  "auth/profile",

  async (_, thunkAPI) => {
    try {
      return await getProfileApi();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to load profile")
      );
    }
  }
);

// put api update profile — accepts ONLY { name, email, mobile }
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (data, thunkAPI) => {
    try {
      return await updateProfileApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to update profile", { networkMessage: UPLOAD_NETWORK_MESSAGE })
      );
    }
  }
);

// post api reset password — accepts ONLY
// { currentPassword, newPassword, confirmPassword }
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (data, thunkAPI) => {
    try {
      return await resetPasswordApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to reset password")
      );
    }
  }
);

// ===== Forgot Password (OTP, via email) — public, used from the Login
// page for someone who is NOT logged in and doesn't remember their
// password. Three-step flow: request OTP -> verify OTP -> set new
// password. Kept entirely separate from the authenticated
// `resetPassword` thunk above (that one requires currentPassword and a
// valid session token; this one requires neither).

// post api forgot password — accepts ONLY { email }
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (data, thunkAPI) => {
    try {
      return await forgotPasswordApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to send reset OTP")
      );
    }
  }
);

// post api reset password with otp — accepts ONLY
// { email, otp, newPassword, confirmPassword }
export const resetPasswordWithOtp = createAsyncThunk(
  "auth/resetPasswordWithOtp",
  async (data, thunkAPI) => {
    try {
      return await resetPasswordWithOtpApi(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getApiErrorMessage(error, "Failed to reset password")
      );
    }
  }
);

// Shared local cleanup used by the synchronous clearAuth reducer.
const clearAuthState = (state) => {
  state.user = null;
  state.token = null;
  state.loading = false;
  state.error = null;

  state.profile = null;
  state.profileLoading = false;
  state.profileError = null;

  state.updateLoading = false;
  state.updateError = null;

  state.resetPasswordLoading = false;
  state.resetPasswordError = null;
  state.resetPasswordSuccess = null;

  state.forgotPasswordLoading = false;
  state.forgotPasswordError = null;
  state.forgotPasswordSuccess = null;


  state.resetPasswordWithOtpLoading = false;
  state.resetPasswordWithOtpError = null;
  state.resetPasswordWithOtpSuccess = null;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// Keeps the login-derived `state.user` (and its localStorage cache) in
// sync with the latest profileImage/profileImagePublicId whenever a
// fresher copy comes back from getProfile/updateProfile. `currentUser`
// throughout the app is resolved as `profile || authUser` (Header.jsx,
// Sidebar.jsx) — without this, `authUser` (and the localStorage copy
// used to seed it on refresh) could keep serving a stale image in the
// moment before `profile` has loaded.
const syncUserProfileImage = (state, latest) => {
  if (!state.user || !latest) return;

  state.user = {
    ...state.user,
    profileImage: latest.profileImage,
    profileImagePublicId: latest.profileImagePublicId,
  };

  localStorage.setItem("user", JSON.stringify(state.user));
};

const authSlice = createSlice({
  name: "auth",

  initialState: {
    user: JSON.parse(localStorage.getItem("user")) || null,
    token: localStorage.getItem("token") || null,
    loading: false,
    error: null,

    // Get Profile state — kept separate from login's loading/error so
    // fetching the profile never affects the Login page's spinner/alert.
    profile: null,
    profileLoading: false,
    profileError: null,

    // Update Profile state — kept separate from both of the above so
    // editing the profile never affects the initial page-load spinner
    // or the Login page's loading/error.
    updateLoading: false,
    updateError: null,

    // Reset Password state — passwords themselves are NEVER stored here,
    // only the request status/message.
    resetPasswordLoading: false,
    resetPasswordError: null,
    resetPasswordSuccess: null,

    // Forgot Password (OTP, via email) state — the public, not-logged-in
    // flow used from the Login page. Kept separate from resetPassword*
    // above and from each other so each step's loading/error/success can
    // be shown independently as the user moves through the flow.
    forgotPasswordLoading: false,
    forgotPasswordError: null,
    forgotPasswordSuccess: null,


    resetPasswordWithOtpLoading: false,
    resetPasswordWithOtpError: null,
    resetPasswordWithOtpSuccess: null,

  },

  reducers: {
    // Called when the Edit Profile modal opens, so a stale error from a
    // previous failed attempt doesn't reappear on a fresh open.
    resetProfileUpdateState: (state) => {
      state.updateLoading = false;
      state.updateError = null;
    },

    // Called when the Reset Password form opens/closes, so a stale
    // success/error message from a previous attempt doesn't linger.
    resetPasswordState: (state) => {
      state.resetPasswordLoading = false;
      state.resetPasswordError = null;
      state.resetPasswordSuccess = null;
    },

    // Called when the Login page's Forgot Password flow opens/closes
    // (or moves back to the "Sign In" view), so stale
    // loading/error/success from a previous attempt doesn't linger
    // across the email -> OTP -> new-password steps.
    resetForgotPasswordState: (state) => {
      state.forgotPasswordLoading = false;
      state.forgotPasswordError = null;
      state.forgotPasswordSuccess = null;


      state.resetPasswordWithOtpLoading = false;
      state.resetPasswordWithOtpError = null;
      state.resetPasswordWithOtpSuccess = null;
    },

    // Instant, synchronous local logout. This is what the UI dispatches
    // directly — it does NOT wait on any network request, so the user
    // is logged out and free to navigate immediately.
    clearAuth: (state) => {
      clearAuthState(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;

        state.user = action.payload.user;
        state.token = action.payload.token;

        // Save token
        localStorage.setItem(
          "token",
          action.payload.token
        );

        // Save user
        localStorage.setItem(
          "user",
          JSON.stringify(action.payload.user)
        );
      })

      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getProfile.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })

      .addCase(getProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        // Backend response shape is { success, data }, not { user }.
        // data never includes password (backend excludes it).
        state.profile = action.payload.data;

        syncUserProfileImage(state, action.payload.data);
      })

      .addCase(getProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload;
      })

      .addCase(updateProfile.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.updateLoading = false;
        // Update API already returns the updated Admin in { data },
        // so we use it directly instead of firing another getProfile().
        state.profile = action.payload.data;

        syncUserProfileImage(state, action.payload.data);
      })

      .addCase(updateProfile.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
      })

      .addCase(resetPassword.pending, (state) => {
        state.resetPasswordLoading = true;
        state.resetPasswordError = null;
        state.resetPasswordSuccess = null;
      })

      .addCase(resetPassword.fulfilled, (state, action) => {
        state.resetPasswordLoading = false;
        // Reset Password does not touch name/email/mobile/role/status,
        // so state.profile is intentionally left untouched here.
        state.resetPasswordSuccess =
          action.payload?.message || "Password reset successfully";
      })

      .addCase(resetPassword.rejected, (state, action) => {
        state.resetPasswordLoading = false;
        state.resetPasswordError = action.payload;
      })

      .addCase(forgotPassword.pending, (state) => {
        state.forgotPasswordLoading = true;
        state.forgotPasswordError = null;
        state.forgotPasswordSuccess = null;
      })

      .addCase(forgotPassword.fulfilled, (state) => {
        state.forgotPasswordLoading = false;
        // Fixed wording per requirement — intentionally not using
        // action.payload?.message here (that's the backend's generic
        // account-exists-or-not message; the actual API/OTP logic behind
        // it is unchanged, this only controls what text this alert shows).
        state.forgotPasswordSuccess =
          "OTP has been sent to your registered email address. Please check your Inbox. If you don't see the email, please check your Spam/Junk folder as well.";
      })

      .addCase(forgotPassword.rejected, (state, action) => {
        state.forgotPasswordLoading = false;
        state.forgotPasswordError = action.payload;
      })

      .addCase(resetPasswordWithOtp.pending, (state) => {
        state.resetPasswordWithOtpLoading = true;
        state.resetPasswordWithOtpError = null;
        state.resetPasswordWithOtpSuccess = null;
      })

      .addCase(resetPasswordWithOtp.fulfilled, (state, action) => {
        state.resetPasswordWithOtpLoading = false;
        state.resetPasswordWithOtpSuccess =
          action.payload?.message || "Password reset successfully";
      })

      .addCase(resetPasswordWithOtp.rejected, (state, action) => {
        state.resetPasswordWithOtpLoading = false;
        state.resetPasswordWithOtpError = action.payload;
      });
  },

});

export const {
  resetProfileUpdateState,
  resetPasswordState,
  resetForgotPasswordState,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;