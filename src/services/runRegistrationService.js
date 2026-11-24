import api from "../api/axios";
import publicApi from "../api/publicApi";
import { normalizeBlobError } from "../utilits/apiError";
import * as mock from "./runRegistrationMock";

// "Run Registration" module (sidebar) - 5 KM / 10 KM registration.
//
// FLOW
//   1. Admin: "Add Data" -> name + mobile.  The backend sends the person a
//      WhatsApp message with a registration link  <site>/run/<token>.
//   2. Person opens the link: picks 5 KM / 10 KM, confirms name, enters email.
//      The backend creates the QR and sends it on WhatsApp + email.
//   3. At the gate the existing QR scanner scans the QR -> "scanned".
//   4. Dashboard + this page show Registered / Scanned / Not scanned.
//
// While the backend is not built yet, set VITE_RUN_MOCK=true in .env to use
// the demo data in ./runRegistrationMock.js instead of the server.
export const RUN_MOCK = import.meta.env.VITE_RUN_MOCK === "true";

export const RUN_DISTANCES = [
  { value: "5", label: "5 KM" },
  { value: "10", label: "10 KM" },
];

// The link the person opens from WhatsApp.
export const buildRunLink = (token) => `${window.location.origin}/run/${token}`;

/* =========================================================
   ADMIN (login needed)
   ========================================================= */

// params: { page, limit, search, status, distance }
//   status: "all" | "registered" | "scanned" | "notScanned" | "notRegistered"
//   distance: "" | "5" | "10"
// -> { success, data: { items, total, totalPages, page, summary } }
export const getRunRegistrationsApi = async (params) => {
  if (RUN_MOCK) return mock.listRuns(params);
  const response = await api.get("/run-registrations", { params });
  return response.data;
};

// -> { success, data: { total, notRegistered, registered, scanned, notScanned,
//                       distance: { 5: { registered, scanned }, 10: {...} } } }
export const getRunSummaryApi = async () => {
  if (RUN_MOCK) return mock.getRunSummary();
  const response = await api.get("/run-registrations/summary");
  return response.data;
};

// data: { name, mobile }  -> { success, message, whatsappSent, data: item }
export const createRunRegistrationApi = async (data) => {
  if (RUN_MOCK) return mock.createRun(data);
  const response = await api.post("/run-registrations", data);
  return response.data;
};

// Not registered yet -> sends the registration link again.
// Already registered -> sends the QR again.
export const resendRunRegistrationApi = async (id) => {
  if (RUN_MOCK) return mock.resendRun(id);
  const response = await api.post(`/run-registrations/${id}/resend`);
  return response.data;
};

export const deleteRunRegistrationApi = async (id) => {
  if (RUN_MOCK) return mock.deleteRun(id);
  const response = await api.delete(`/run-registrations/${id}`);
  return response.data;
};

// Demo only (mock mode): pretend the QR was scanned at the gate.
export const markRunScannedApi = async (id) => mock.markScanned(id);

// Excel of the current filter. Resolves to { blob, fileName }.
export const exportRunRegistrationsApi = async (params) => {
  if (RUN_MOCK) return mock.exportRuns(params);
  try {
    const response = await api.get("/run-registrations/export", {
      params,
      responseType: "blob",
    });
    return { blob: response.data, fileName: "Run_Registrations.xlsx" };
  } catch (error) {
    // With responseType "blob" the server's JSON error arrives as a Blob.
    throw await normalizeBlobError(error);
  }
};

/* =========================================================
   PUBLIC (no login) - the /run/:token page
   Uses publicApi so a 401/404 shows as an in-page message
   instead of sending the person to the staff login.
   ========================================================= */

// -> { data: { name, mobileNumber, email, distance, status: "invited" | "registered",
//              registrationNumber, qrImage, registeredAt } }
export const getPublicRunApi = async (token) => {
  if (RUN_MOCK) return mock.getPublicRun(token);
  const response = await publicApi.get(`/public/run-registration/${encodeURIComponent(token)}`);
  return response.data;
};

// data: { distance: 5 | 10, name, email }  (the mobile number is NOT taken from
// the request - the backend uses the number the link was sent to.)
// -> { message, data: same shape as getPublicRunApi (now with registrationNumber + qrImage) }
export const submitPublicRunApi = async (token, data) => {
  if (RUN_MOCK) return mock.submitPublicRun(token, data);
  const response = await publicApi.post(
    `/public/run-registration/${encodeURIComponent(token)}`,
    data
  );
  return response.data;
};
