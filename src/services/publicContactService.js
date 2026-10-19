import publicApi from "../api/publicApi";

// Public (no login) contact form at /city-lifestyle.
// Uses publicApi (no auth header, no "401 -> go to login" redirect).

// Category dropdown: [{ _id, name }]
export const getPublicCategoriesApi = async () => {
  const response = await publicApi.get("/public/contact/categories");
  return response.data;
};

// `formData` is the same multipart FormData the admin form builds.
// `linkToken` = the token of a "Share Form Link" (counts one place on it).
export const submitPublicContactApi = async (formData, linkToken = "") => {
  const response = await publicApi.post("/public/contact", formData, {
    params: linkToken ? { link: linkToken } : undefined,
  });
  return response.data;
};

// Info for a shared form link: { name, quantity, usedCount, remaining,
// available, message }
export const getPublicFormLinkApi = async (token) => {
  const response = await publicApi.get(`/public/contact/link/${token}`);
  return response.data;
};
