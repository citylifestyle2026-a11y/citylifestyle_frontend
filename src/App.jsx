import "./App.css";
import "./assets/CSS/PageShell.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useDispatch } from "react-redux";

import { getProfile } from "./redux/auth/authSlice";
import { updateSiteMeta } from "./utilits/updateSiteMeta";
import useIdleLogout from "./hooks/useIdleLogout";

import ProtectedRoute from "./routes/ProtectedRoute";

const Login = lazy(() => import("./Pages/Login"));
const DashboardPage = lazy(() => import("./Pages/DashboardPage"));
const User = lazy(() => import("./Pages/User"));
const Role = lazy(() => import("./Pages/Role"));
const Event = lazy(() => import("./Pages/Event"));
const Booking = lazy(() => import("./Pages/Booking"));
const ViewBooking = lazy(() => import("./Pages/ViewBooking"));
const RegisterUsers = lazy(() => import("./Components/RegisterUsers"));
const PublicRegisterUser = lazy(() => import("./Components/PublicRegisterUser"));
const PublicContactForm = lazy(() => import("./Pages/PublicContactForm"));
const Ticket = lazy(() => import("./Pages/Ticket"));
const EntryReport = lazy(() => import("./Pages/EntryReport"));
const CreateEvent = lazy(() => import("./Pages/CreateEvent"));
const ViewEvent = lazy(() => import("./Pages/ViewEvent"));
const TicketType = lazy(() => import("./Components/TicketType"));
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const Profile = lazy(() => import("./Pages/Profile"));
const Admin = lazy(() => import("./Pages/Admin"));
const ContactList = lazy(() => import("./Pages/ContactList"));
const InviteCards = lazy(() => import("./Pages/InviteCards"));
const MemberList = lazy(() => import("./Pages/MemberList"));
const FormLinks = lazy(() => import("./Pages/FormLinks"));
const EventHistory = lazy(() => import("./Pages/EventHistory"));
const CompanyCategory = lazy(() => import("./Pages/CompanyCategory"));
import TopProgressLoader from "./Components/TopProgressLoader";

// Public home page (City Lifestyle)
import Home from "./Pages/Home";

const privateRoutes = [
  "/dashboard",
  "/user",
  "/role",
  "/event",
  "/create-event",
  "/view-event",
  "/ticket-type",
  "/booking",
  "/view-booking",
  "/register-users",
  "/profile",
  "/entry-report",
  "/admin",
  "/gust-list",
  "/invite-cards",
  "/contact-book",
  "/form-links",
  "/event-history",
  "/company-categories",
  // Staff login page — City Lifestyle branding too.
  "/login",
  // Public ticket-registration link opened from WhatsApp (/r/:token).
  // It is a public page, but it belongs to City Lifestyle (the event
  // tickets), not City Toppers — so it gets the City Lifestyle favicon
  // and title. The trailing slash keeps it from matching other routes.
  "/r/",
  // NEW single-QR invitation page (/ticket?qr=<invitationId>) — same City Lifestyle branding.
  "/ticket",
  // Public contact form (type /city-lifestyle in the URL) — City Lifestyle branding.
  "/city-lifestyle",
];

function SiteMetaHandler() {
  const location = useLocation();

  useEffect(() => {
    // Home page ("/") now is City Lifestyle too, so it gets the same
    // City Lifestyle favicon and title as the rest of the app.
    const isPrivate =
      location.pathname === "/" ||
      privateRoutes.some((route) => location.pathname.startsWith(route));

    updateSiteMeta(isPrivate);
  }, [location.pathname]);

  return null;
}

// Logs the person out after 20 minutes without any activity (see
// hooks/useIdleLogout.js). Lives inside <BrowserRouter> because it navigates.
function IdleLogoutHandler() {
  useIdleLogout();
  return null;
}

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Public pages don't need the admin profile — skipping it there means
    // a slow / cold server can never keep a loader running on the Home page.
    // Every private page still loads the profile as before.
    const path = window.location.pathname;
    const isPublicSitePage = path === "/" || path === "/city-lifestyle";

    if (localStorage.getItem("token") && !isPublicSitePage) {
      dispatch(getProfile());
    }
  }, [dispatch]);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />

      <BrowserRouter>
        <SiteMetaHandler />
        <IdleLogoutHandler />

        <TopProgressLoader />

        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/home" element={<Navigate to="/" replace />} />

          <Route path="/login" element={<Login />} />

          <Route path="/r/:token" element={<PublicRegisterUser />} />
          {/* NEW: single-QR invitation page opened from the WhatsApp link */}
          <Route path="/ticket" element={<Ticket />} />
          {/* NEW: public contact form (no login, no button - open by URL) */}
          <Route path="/form" element={<PublicContactForm />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/user" element={<User />} />
            <Route path="/role" element={<Role />} />
            <Route path="/event" element={<Event />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/view-event/:id" element={<ViewEvent />} />
            <Route path="/ticket-type/:eventId" element={<TicketType />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/view-booking/:id" element={<ViewBooking />} />
            <Route path="/register-users/:id" element={<RegisterUsers />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/gust-list" element={<ContactList />} />
            <Route path="/contact-book" element={<MemberList />} />
            <Route path="/form-links" element={<FormLinks />} />
            <Route path="/event-history" element={<EventHistory />} />
            <Route path="/company-categories" element={<CompanyCategory />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/invite-cards" element={<InviteCards />} />
          </Route>

          <Route element={<ProtectedRoute permission="Entry Report" />}>
            <Route path="/entry-report" element={<EntryReport />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

export default App;