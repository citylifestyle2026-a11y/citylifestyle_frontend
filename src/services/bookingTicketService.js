import api from "../api/axios";

// ================= GET REGISTER USER =================
export const getRegisterUserApi = async (ticketId) => {
  const response = await api.get(
    `/booking-ticket/register-user/${ticketId}`
  );

  return response.data;
};

// ================= UPDATE REGISTER USER =================
export const updateRegisterUserApi = async (
  ticketId,
  formData
) => {
  const response = await api.put(
    `/booking-ticket/register-user/${ticketId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

// ================= RESEND TICKET (WHATSAPP) =================
export const resendTicketApi = async (ticketId) => {
  const response = await api.post(
    `/booking-ticket/resend/${ticketId}`
  );

  return response.data;
};