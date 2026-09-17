import api from "../api/axios";

// Create User
export const createUserApi = (data) => {
  return api.post("/users", data);
};

// Get Users
export const getUsersApi = (params) => {
  return api.get("/users", {
    params,
  });
};

// Update User
export const updateUserApi = (id, data) => {
  return api.put(`/users/${id}`, data);
};

// Delete User
export const deleteUserApi = (id) => {
  return api.delete(`/users/${id}`);
};