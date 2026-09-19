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

  // Field errors come as [{ field, message }] from validate.middleware.js
  // and as express-validator's raw [{ path, msg }] from
  // validators/event.validator.js — accept both.
  const firstFieldError = Array.isArray(data.errors)
    ? (typeof data.errors[0]?.message === "string" && data.errors[0].message) ||
      (typeof data.errors[0]?.msg === "string" && data.errors[0].msg) ||
      ""
    : "";

  // Some endpoints answer { message: "Internal Server Error", error: "<real
  // reason>" } — the real reason is the useful part.
  if (
    typeof data.message === "string" &&
    /^internal server error\.?$/i.test(data.message.trim()) &&
    typeof data.error === "string" &&
    data.error.trim()
  ) {
    return data.error;
  }

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

// Messages for responses that carry NO JSON message (e.g. an nginx / proxy /
// hosting error page, or a crashed server). Without these the caller's
// generic fallback ("Failed to create event") hid the real reason.
const STATUS_MESSAGES = {
  413: "The file you are uploading is too large for the server. Please use a smaller file.",
  429: "Too many requests. Please wait a moment and try again.",
  502: "The server is temporarily unavailable (502 Bad Gateway). Please try again in a moment.",
  503: "The server is temporarily unavailable (503). Please try again in a moment.",
  504: "The server took too long to respond (504 Gateway Timeout). Please try again.",
};

// Shared "Network Error" text for requests that upload a file/image.
export const UPLOAD_NETWORK_MESSAGE =
  "Unable to reach the server. Please check your internet connection. If you are uploading an image or file, it may also be too large for the server.";

// `options.networkMessage` lets a caller (e.g. an image upload) replace the
// generic "unable to reach the server" text with something more specific,
// because a proxy that rejects an oversized upload often answers without
// CORS headers, which the browser reports as a bare "Network Error".
export const getApiErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
  options = {}
) => {
  const fromServer = pickMessageFromBody(error?.response?.data);
  if (fromServer) return fromServer;

  // Request never got an answer.
  if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
    return "The request timed out. Please try again.";
  }

  if (error && !error.response && (error.request || error.message === "Network Error")) {
    return (
      options.networkMessage ||
      "Unable to reach the server. Please check your internet connection and try again."
    );
  }

  const status = error?.response?.status;

  if (status === 403) {
    return "You do not have permission to do this.";
  }

  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  // The server answered, but with no readable message — say so, and include
  // the HTTP status so the real problem can be traced in the server logs.
  if (status) {
    return `${fallback} (server error ${status})`;
  }

  return fallback;
};

// Turns WHATEVER a caller caught into one readable string. Use this in
// component `catch` blocks and on `result.payload` after dispatching a thunk.
// The thunks reject with a plain string (see getApiErrorMessage above), and
// `dispatch(...).unwrap()` re-throws that same string — so reading
// `err.message` on it is `undefined` and used to end in a generic
// "Something went wrong". This accepts every shape safely:
//   - a string (thunk payload)         -> the string itself
//   - an axios error                   -> getApiErrorMessage(...)
//   - an object with message/errors    -> that message
//   - a plain Error                    -> error.message
//   - anything else (null, undefined)  -> the fallback
export const getErrorText = (
  err,
  fallback = "Something went wrong. Please try again."
) => {
  if (!err) return fallback;

  if (typeof err === "string") return err.trim() || fallback;

  if (err.isAxiosError || err.response || err.request) {
    return getApiErrorMessage(err, fallback);
  }

  if (typeof err === "object") {
    const fromBody = pickMessageFromBody(err);
    if (fromBody) return fromBody;

    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }
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
