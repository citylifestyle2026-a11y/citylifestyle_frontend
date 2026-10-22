import publicApi from "../api/publicApi";

// GET /api/public/rsvp/:token  (no login)
export const getPublicRsvpApi = async (token) => {
  const response = await publicApi.get(`/public/rsvp/${token}`);
  return response.data;
};

// POST /api/public/rsvp/:token { response: "yes" | "no" }
export const submitPublicRsvpApi = async (token, answer) => {
  const response = await publicApi.post(`/public/rsvp/${token}`, {
    response: answer,
  });
  return response.data;
};
