import api from "../api/axios";

// Create Admin
// Backend: POST /api/admin — Super-Admin-only (backend independently
// enforces this via authorize.requireSuperAdmin and returns 403 for a
// normal Admin regardless of what the frontend shows/hides). Only
// name/email/mobile/password are ever sent — there is no role/adminType
// field anywhere in this call for a caller to set.
export const createAdminApi = (data) => {
  return api.post("/admin", data);
};

// Get All Admins
// Backend: GET /api/admin — protected, admin-only. No admin-wise
// filtering — every Admin gets every Admin here.
export const getAllAdminsApi = () => {
  return api.get("/admin");
};

// Update Own Admin
// Backend: PUT /api/admin/me — always targets the currently authenticated
// Admin (resolved server-side from the JWT); there is no :id to pass, so
// this can never be pointed at another Admin's record. Only
// name/email/mobile are accepted.
export const updateOwnAdminApi = (data) => {
  return api.put("/admin/me", data);
};

// Update Any Admin By Id (Super Admin only)
// Backend: PUT /api/admin/:id — server-side gated to the Super Admin via
// authorize.requireSuperAdmin (returns 403 for a normal Admin regardless
// of what the frontend shows/hides). Only used when the logged-in admin
// is a Super Admin editing someone else's row; own-row edits still go
// through updateOwnAdminApi above.
export const updateAdminByIdApi = (id, data) => {
  return api.put(`/admin/${id}`, data);
};

// Delete Admin (Super Admin only)
// Backend: DELETE /api/admin/:id — server-side gated to the Super Admin
// via authorize.requireSuperAdmin (returns 403 for a normal Admin
// regardless of what the frontend shows/hides), and additionally blocks
// deleting your own account (self-delete guard lives in the service).
export const deleteAdminApi = (id) => {
  return api.delete(`/admin/${id}`);
};