import "./App.css";
import "./assets/CSS/PageShell.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { getProfile } from "./redux/auth/authSlice";
import { updateSiteMeta } from "./utilits/updateSiteMeta";

import ProtectedRoute from "./routes/ProtectedRoute";

import Login from "./Pages/Login";
import DashboardPage from "./Pages/DashboardPage";
import User from "./Pages/User";
import Role from "./Pages/Role";
import Event from "./Pages/Event";
import Booking from "./Pages/Booking";
import ViewBooking from "./Pages/ViewBooking";
import RegisterUsers from "./Components/RegisterUsers";
import PublicRegisterUser from "./Components/PublicRegisterUser";
import EntryReport from "./Pages/EntryReport";
import CreateEvent from "./Pages/CreateEvent";
import ViewEvent from "./Pages/ViewEvent";
import TicketType from "./Components/TicketType";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Profile from "./Pages/Profile";
import Admin from "./Pages/Admin";
import ContactList from "./Pages/ContactList";
import EventHistory from "./Pages/EventHistory";
import CompanyCategory from "./Pages/CompanyCategory";
import TopProgressLoader from "./Components/TopProgressLoader";

// Public marketing site pages
import Home from "./Pages/Site/Home";
import CitySparkle from "./Pages/Site/Sparkle";
import Parv from "./Pages/Site/Parv";
import Contact from "./Pages/Site/Contact";

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
  "/contact-list",
  "/event-history",
  "/company-categories",
  // Staff login page — City Lifestyle branding too.
  "/login",
  // Public ticket-registration link opened from WhatsApp (/r/:token).
  // It is a public page, but it belongs to City Lifestyle (the event
  // tickets), not City Toppers — so it gets the City Lifestyle favicon
  // and title. The trailing slash keeps it from matching other routes.
  "/r/",
];

function SiteMetaHandler() {
  const location = useLocation();

  useEffect(() => {
    const isPrivate = privateRoutes.some((route) =>
      location.pathname.startsWith(route)
    );

    updateSiteMeta(isPrivate);
  }, [location.pathname]);

  return null;
}

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Public marketing pages don't need the admin profile — skipping it
    // there means a slow / cold server can never keep a loader running on
    // the Home page. Every private page still loads the profile as before.
    const path = window.location.pathname;
    const isPublicSitePage =
      path === "/" || path === "/city-sparkle" || path === "/parv" || path === "/contact";

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

        <TopProgressLoader />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/city-sparkle" element={<CitySparkle />} />
          <Route path="/parv" element={<Parv />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/home" element={<Navigate to="/" replace />} />

          <Route path="/login" element={<Login />} />

          <Route path="/r/:token" element={<PublicRegisterUser />} />

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
            <Route path="/contact-list" element={<ContactList />} />
            <Route path="/event-history" element={<EventHistory />} />
            <Route path="/company-categories" element={<CompanyCategory />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route element={<ProtectedRoute permission="Entry Report" />}>
            <Route path="/entry-report" element={<EntryReport />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;