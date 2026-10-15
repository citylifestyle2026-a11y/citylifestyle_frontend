import publicApi from "../api/publicApi";

// Public (no login) contact form at /city-lifestyle.
// Uses publicApi (no auth header, no "401 -> go to login" redirect).

// Category dropdown: [{ _id, name }]
export const getPublicCategoriesApi = async () => {
  const response = await publicApi.get("/public/contact/categories");
  return response.data;
};

// `formData` is the same multipart FormData the admin form builds.
export const submitPublicContactApi = async (formData) => {
  const response = await publicApi.post("/public/contact", formData);
  return response.data;
};
