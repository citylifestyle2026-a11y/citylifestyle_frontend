// Central place for turning an axios/API failure into ONE readable string
// for the UI (toast / inline error). Every thunk used to do its own
// `error.response?.data?.message || "Failed to ..."`, which lost the real
// reason in several cases:
//   - request validation failures (422) where only a generic message
//     was read;
//   - network errors / timeouts (there is no `response` at all);
//   - failed downloads (responseType: "blob"), where the server's JSON
//     error arrives as a Blob and `data.message` is simply undefined.

const GENERIC_VALIDATION_MESSAGE = "Validation failed";

// Pulls the most specific message out of a response body, or "" if none.
const pickMessageFromBody = (data) => {
  if (!data) return "";

  // Plain string bodies are only useful if they aren't an HTML error page.
  if (typeof data === "string") {
    const text = data.trim();
    return text && !text.startsWith("<") ? text : "";
  }

  const firstFieldError =
    Array.isArray(data.errors) && typeof data.errors[0]?.message === "string"
      ? data.errors[0].message
      : "";

  if (typeof data.message === "string" && data.message.trim()) {
    // Older backend builds only sent the generic text and put the real
    // reason in `errors`; prefer the real reason when it is available.
    if (data.message === GENERIC_VALIDATION_MESSAGE && firstFieldError) {
      return firstFieldError;
    }
    return data.message;
  }

  if (firstFieldError) return firstFieldError;

  if (typeof data.error === "string" && data.error.trim()) return data.error;

  return "";
};

export const getApiErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again."
) => {
  const fromServer = pickMessageFromBody(error?.response?.data);
  if (fromServer) return fromServer;

  // Request never got an answer.
  if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
    return "The request timed out. Please try again.";
  }

  if (error && !error.response && (error.request || error.message === "Network Error")) {
    return "Unable to reach the server. Please check your internet connection and try again.";
  }

  if (error?.response?.status === 403) {
    return "You do not have permission to do this.";
  }

  return fallback;
};

// For requests made with `responseType: "blob"` (file downloads): when the
// server answers with an error status, axios still hands the JSON error
// body back as a Blob. This reads it and replaces `error.response.data`
// with the parsed object, so getApiErrorMessage / `data.message` work the
// same as for every other request. Always resolves to the same error, so
// callers can simply `throw await normalizeBlobError(error)`.
export const normalizeBlobError = async (error) => {
  const data = error?.response?.data;

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      error.response.data = JSON.parse(await data.text());
    } catch {
      error.response.data = null;
    }
  }

  return error;
};
