import api from "../api/axios";

// ================= CREATE TICKET TYPE =================
export const createTicketTypeApi = (data) => {
  return api.post("/ticket-type/create", data);
};

// ================= GET ALL TICKET TYPES =================
export const getAllTicketTypesApi = async (eventId, params) => {
  const response = await api.get(
    `/ticket-type/get-all-ticket-types/${eventId}`,
    {
      params,
    }
  );

  return response.data;
};

// ================= UPDATE TICKET TYPE =================
export const updateTicketTypeApi = async (id, data) => {
  const response = await api.put(`/ticket-type/update/${id}`, data);

  return response.data;
};

// ================= DELETE TICKET TYPE =================
export const deleteTicketTypeApi = async (id) => {
  const response = await api.delete(`/ticket-type/delete/${id}`);

  return response.data;
};