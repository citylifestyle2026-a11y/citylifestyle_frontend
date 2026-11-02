import publicApi from "../api/publicApi";

// GET /api/public/invite-card/info  (no login) -> { hasDesign, ... }
export const getGuestCardInfoApi = async () =>
  (await publicApi.get("/public/invite-card/info")).data;

// POST /api/public/invite-card/generate (no login) -> the finished card (JPG Blob)
export const generateGuestCardApi = async ({ photo, name }) => {
  const formData = new FormData();
  formData.append("photo", photo);
  formData.append("name", name);
  const res = await publicApi.post("/public/invite-card/generate", formData, {
    responseType: "blob",
  });
  return res.data;
};

// The blank card picture used for the live preview (no photo / name on it).
// `version` busts the browser cache when the admin uploads a new design.
export const guestCardDesignUrl = (version = 0) => {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  return `${base}/public/invite-card/design-image?v=${version}`;
};