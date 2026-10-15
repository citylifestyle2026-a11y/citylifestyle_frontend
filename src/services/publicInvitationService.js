import publicApi from "../api/publicApi";

// GET /api/public/invitation/:invitationId  (no login)
// NEW single-QR invitation flow: the "Your Digital Invite" link in the
// WhatsApp message opens /ticket?qr=<invitationId>, which calls this.
export const getPublicInvitationApi = async (invitationId) => {
  const response = await publicApi.get(`/public/invitation/${invitationId}`);

  return response.data;
};
