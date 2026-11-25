import publicApi from "../api/publicApi";

// Public "Let's Run" form  (/lets-run, no login).
// Uses publicApi so a 4xx shows as an in-page message instead of sending the
// person to the staff login.

// -> { data: { eventTitle, date, time, venueName } }   (the current active event)
export const getLetsRunInfoApi = async () => {
  const response = await publicApi.get("/public/lets-run");
  return response.data;
};

// data: { name, mobile }
// -> { message, data: { name, qrNumber, whatsappSent, alreadyRegistered } }
export const submitLetsRunApi = async (data) => {
  const response = await publicApi.post("/public/lets-run", data);
  return response.data;
};
