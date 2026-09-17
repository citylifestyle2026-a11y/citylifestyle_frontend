import publicApi from "../api/publicApi";

// ================= VALIDATE PUBLIC REGISTRATION TOKEN =================
// GET /api/public/registration/:token
// No auth header, no ticketId — the token in the URL is the only thing
// that identifies which BookingTicket this is for.
export const getPublicRegistrationDetailsApi = async (token) => {
  const response = await publicApi.get(`/public/registration/${token}`);

  return response.data;
};

// ================= PUBLIC REGISTER USER =================
// PUT /api/public/registration/:token
// `formData` must only ever contain name / mobileNumber / email /
// profileImage — never a ticketId. The token is the sole ticket identity.
//
// IMPORTANT: do NOT set a "Content-Type" header here. `formData` is a
// FormData instance, so the browser must compute its own
// "multipart/form-data; boundary=..." value and attach it automatically.
// Explicitly setting "Content-Type": "multipart/form-data" (without a
// boundary) overrides that and gets sent as-is, so the request reaches
// the backend with no boundary marker at all — multer/busboy then can't
// parse the body, req.body.name/mobileNumber/email all come through
// empty, and the submission silently fails validation. This is the same
// pitfall already called out at the top of api/axios.js.
export const submitPublicRegistrationApi = async (token, formData) => {
  const response = await publicApi.put(
    `/public/registration/${token}`,
    formData
  );

  return response.data;
};