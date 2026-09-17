import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

// Optional `permission` prop gates a route beyond plain authentication —
// e.g. <ProtectedRoute permission="Entry Report" />. Admin always passes
// (matches backend authorize behavior). A Checker/User must have the
// named permission in their `permissions` array.
//
// Optional `adminOnly` prop gates a route to Admin exclusively, regardless
// of any permission a Checker/User might hold — e.g.
// <Route element={<ProtectedRoute adminOnly />}><Route path="/dashboard" ... />
// This is separate from `permission` because Dashboard-style routes have
// no corresponding entry in the Checker `permissions` enum at all; it's
// not "missing a permission", it's "not for this role, ever".
// A non-admin hitting an adminOnly route is sent to /entry-report (the
// only page Checker currently has access to) rather than /dashboard,
// since redirecting an already-blocked role back to /dashboard would loop.
//
// Current-user source: prefer the live `profile` (fetched via
// getProfile() from the backend on app load — always up to date), and
// fall back to the `user` object cached at login time in localStorage
// (available immediately, before getProfile() resolves, so there's no
// flash of "no access" right after a refresh).
//
// role/permissions are resolved field-by-field below (profile's value if
// present, else authUser's) rather than picking one object wholesale —
// see the matching comment in Sidebar.jsx/Header.jsx for why: an
// all-or-nothing pick can silently lose a correct value from authUser
// the moment profile populates, if /auth/profile ever omits that field.
// NOTE: Login now lives at "/login" (Home moved to "/" for the public
// marketing site), so the unauthenticated redirect below points there
// instead of "/". This is the only change made here.
const ProtectedRoute = ({ permission = null, adminOnly = false }) => {
  const token = localStorage.getItem("token");

  const profile = useSelector((state) => state.auth.profile);
  const authUser = useSelector((state) => state.auth.user);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const role = profile?.role ?? authUser?.role;

  if (adminOnly && role !== "admin") {
    return <Navigate to="/entry-report" replace />;
  }

  if (permission) {
    const permissions = Array.isArray(profile?.permissions)
      ? profile.permissions
      : Array.isArray(authUser?.permissions)
      ? authUser.permissions
      : [];

    const hasAccess = role === "admin" || permissions.includes(permission);

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;