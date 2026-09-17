import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Dedicated axios instance for the public (no-login) registration flow.
// Deliberately NOT the same `api` instance exported from `./axios.js`,
// because that instance's interceptors are built for the authenticated
// staff app and would misbehave here:
//   - it attaches `Authorization: Bearer <staff token>` from
//     localStorage on every request, which has no meaning for an
//     unauthenticated customer and should never be sent to a public
//     endpoint
//   - on any 401 response it clears localStorage and hard-redirects to
//     "/" (the staff login page) — but for this page a 401 just means
//     "this registration link is invalid/expired", which must render as
//     an in-page error state, not bounce the customer to a login screen
//     they were never meant to see
// This instance intentionally has no request/response interceptors, so
// none of the above applies. The existing `api` instance in `./axios.js`
// is left completely unchanged.
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export default publicApi;