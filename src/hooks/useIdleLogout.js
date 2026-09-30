import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { clearAuth } from "../redux/auth/authSlice";
import { showInfo } from "../utilits/toast";

// ================= AUTO LOGOUT AFTER INACTIVITY =================
// If a logged-in person does nothing for IDLE_LIMIT (default 20 minutes),
// they are logged out automatically and sent to the Login page.
//
// "Doing something" = mouse move / click / key press / scroll / touch on ANY
// open tab of the site, OR the app making a (non-silent) API request — that
// second part keeps the QR-scanner screen alive, because scanning uses the
// camera and makes API calls but no mouse/keyboard input.
//
// The last-activity time is kept in localStorage, so several open tabs share
// one clock (activity in one tab keeps the others alive), and re-opening the
// site after the limit has already passed logs out straight away.
//
// Optional: set VITE_IDLE_LOGOUT_MINUTES in .env to change the 20 minutes.

const ACTIVITY_KEY = "lastActivityAt";
const CHECK_EVERY_MS = 30 * 1000; // how often the clock is checked
const WRITE_THROTTLE_MS = 5 * 1000; // don't touch localStorage on every mouse move

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
  "click",
];

const parsedMinutes = Number(import.meta.env?.VITE_IDLE_LOGOUT_MINUTES);
export const IDLE_LIMIT_MS =
  (Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : 20) *
  60 *
  1000;

// Plain (non-React) core so it can be tested on its own.
export function startIdleWatcher({
  onIdle,
  limitMs = IDLE_LIMIT_MS,
  storage = window.localStorage,
  win = window,
  doc = document,
  now = () => Date.now(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  let lastWrite = 0;
  let lastSeenToken = storage.getItem("token");

  const readLast = () => {
    const value = Number(storage.getItem(ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const markActive = (force = false) => {
    const t = now();
    if (!force && t - lastWrite < WRITE_THROTTLE_MS) return;
    lastWrite = t;
    try {
      storage.setItem(ACTIVITY_KEY, String(t));
    } catch {
      /* storage full / blocked — the in-memory check below still works */
    }
  };

  const check = () => {
    const token = storage.getItem("token");

    // Logged out: nothing to time out.
    if (!token) {
      lastSeenToken = null;
      return;
    }

    // A new login (token changed): the clock starts fresh, so an old
    // timestamp from a previous session can never log the new one out.
    if (token !== lastSeenToken) {
      lastSeenToken = token;
      markActive(true);
      return;
    }

    const last = readLast();
    if (!last) {
      markActive(true);
      return;
    }

    if (now() - last >= limitMs) {
      try {
        storage.removeItem(ACTIVITY_KEY);
      } catch {
        /* ignore */
      }
      lastSeenToken = null;
      onIdle();
    }
  };

  const onActivity = () => markActive();
  const onVisible = () => {
    // Background tabs get their timers throttled — check the moment the
    // tab is visible / focused again.
    if (!doc.hidden) check();
  };

  ACTIVITY_EVENTS.forEach((name) =>
    win.addEventListener(name, onActivity, { passive: true, capture: true })
  );
  // Fired by api/axios.js for every non-silent request.
  win.addEventListener("api-loading-start", onActivity);
  win.addEventListener("focus", onVisible);
  doc.addEventListener("visibilitychange", onVisible);

  // Opening the site with an already-old timestamp logs out at once;
  // otherwise this just starts the clock.
  check();
  const timer = setIntervalFn(check, CHECK_EVERY_MS);

  return () => {
    clearIntervalFn(timer);
    ACTIVITY_EVENTS.forEach((name) =>
      win.removeEventListener(name, onActivity, { capture: true })
    );
    win.removeEventListener("api-loading-start", onActivity);
    win.removeEventListener("focus", onVisible);
    doc.removeEventListener("visibilitychange", onVisible);
  };
}

const PUBLIC_PATHS = ["/", "/login", "/city-sparkle", "/parv", "/contact"];

export default function useIdleLogout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    return startIdleWatcher({
      onIdle: () => {
        // Same local logout the Header's Logout button uses.
        dispatch(clearAuth());

        const path = window.location.pathname;
        const isPublic =
          PUBLIC_PATHS.includes(path) || path.startsWith("/r/");

        // On the public site / registration link just drop the session;
        // on a private page tell the person why and go to Login.
        if (!isPublic) {
          showInfo(
            `You were logged out because of ${Math.round(
              IDLE_LIMIT_MS / 60000
            )} minutes of inactivity.`
          );
          navigate("/login", { replace: true });
        }
      },
    });
  }, [dispatch, navigate]);
}
