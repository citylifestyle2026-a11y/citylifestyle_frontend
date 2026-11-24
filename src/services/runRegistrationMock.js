// DEMO / MOCK layer for the "Run Registration" module.
//
// Purpose: the frontend is built FIRST, the backend comes later. While the
// backend does not exist yet, set  VITE_RUN_MOCK=true  in the frontend .env
// and every call in runRegistrationService.js is answered from this file
// (data is kept in the browser's localStorage, nothing is sent to a server).
//
// When the backend is ready: remove VITE_RUN_MOCK (or set it to false).
// This file is then never used and can be deleted.
import { normalizeMobileNumber } from "../utilits/mobileNumber";

const KEY = "runMock:items";

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};
const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));
const wait = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 250));

// Same shape an axios error has, so getErrorText() shows the message.
const fail = (message, status = 400) => {
  const error = new Error(message);
  error.response = { status, data: { success: false, message } };
  return error;
};

const randomId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const randomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// notRegistered | notScanned (registered, not yet scanned) | scanned
const stateOf = (item) =>
  item.status !== "registered" ? "notRegistered" : item.scannedAt ? "scanned" : "notScanned";

const withState = (item) => ({ ...item, state: stateOf(item) });

const buildSummary = (items) => {
  const registered = items.filter((i) => i.status === "registered");
  const scanned = registered.filter((i) => i.scannedAt);
  const byDistance = (km) => {
    const list = registered.filter((i) => Number(i.distance) === km);
    return { registered: list.length, scanned: list.filter((i) => i.scannedAt).length };
  };
  return {
    total: items.length,
    notRegistered: items.length - registered.length,
    registered: registered.length,
    scanned: scanned.length,
    notScanned: registered.length - scanned.length,
    distance: { 5: byDistance(5), 10: byDistance(10) },
  };
};

const matchesStatus = (item, status) => {
  if (!status || status === "all") return true;
  if (status === "registered") return item.status === "registered";
  return stateOf(item) === status;
};

// ---------------- admin ----------------
export const listRuns = async ({ page = 1, limit = 10, search = "", status = "all", distance = "" } = {}) => {
  const items = load();
  const term = String(search).trim().toLowerCase();

  const filtered = items
    .filter((i) => matchesStatus(i, status))
    .filter((i) => !distance || String(i.distance) === String(distance))
    .filter(
      (i) =>
        !term ||
        i.name.toLowerCase().includes(term) ||
        i.mobileNumber.includes(term.replace(/\D/g, "") || "__none__") ||
        (i.email || "").toLowerCase().includes(term) ||
        (i.registrationNumber || "").toLowerCase().includes(term)
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const perPage = Number(limit) > 0 ? Number(limit) : filtered.length || 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (Number(page) - 1) * perPage;

  return wait({
    success: true,
    data: {
      items: filtered.slice(start, start + perPage).map(withState),
      total: filtered.length,
      totalPages,
      page: Number(page),
      summary: buildSummary(items),
    },
  });
};

export const getRunSummary = async () => wait({ success: true, data: buildSummary(load()) });

export const createRun = async ({ name, mobile }) => {
  const cleanName = String(name || "").replace(/\s+/g, " ").trim();
  if (!cleanName) throw fail("Name is required.");

  const mobileNumber = normalizeMobileNumber(mobile);
  if (!mobileNumber) throw fail("Enter a valid 10-digit mobile number (with or without 91).");

  const items = load();
  if (items.some((i) => i.mobileNumber === mobileNumber)) {
    throw fail("This mobile number is already added.", 409);
  }

  const item = {
    _id: randomId(),
    name: cleanName,
    mobileNumber,
    email: "",
    distance: null,
    status: "invited",
    registrationNumber: "",
    token: randomId() + randomId(),
    qrImage: "",
    qrValue: "",
    registeredAt: null,
    scannedAt: null,
    createdAt: new Date().toISOString(),
  };
  save([item, ...items]);

  return wait({
    success: true,
    message: "Added.",
    whatsappSent: true, // the real backend sends the registration link here
    data: withState(item),
  });
};

export const resendRun = async (id) => {
  const item = load().find((i) => i._id === id);
  if (!item) throw fail("Entry not found.", 404);
  return wait({ success: true, message: "Sent on WhatsApp.", data: withState(item) });
};

export const deleteRun = async (id) => {
  save(load().filter((i) => i._id !== id));
  return wait({ success: true, message: "Deleted." });
};

// Demo only: pretend the QR was scanned at the entry gate.
export const markScanned = async (id) => {
  const items = load();
  const item = items.find((i) => i._id === id);
  if (!item) throw fail("Entry not found.", 404);
  if (item.status !== "registered") throw fail("This person has not registered yet.");
  if (item.scannedAt) throw fail("This ticket has already been checked in.");
  item.scannedAt = new Date().toISOString();
  save(items);
  return wait({ success: true, data: withState(item) });
};

export const exportRuns = async ({ status = "all", distance = "" } = {}) => {
  const rows = load()
    .filter((i) => matchesStatus(i, status))
    .filter((i) => !distance || String(i.distance) === String(distance));

  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Name", "Mobile", "Email", "Distance", "Registration No", "Status", "Registered At", "Scanned At"];
  const lines = rows.map((i) =>
    [
      i.name,
      i.mobileNumber,
      i.email,
      i.distance ? `${i.distance} KM` : "",
      i.registrationNumber,
      stateOf(i),
      i.registeredAt || "",
      i.scannedAt || "",
    ]
      .map(esc)
      .join(",")
  );

  return wait({
    blob: new Blob(["\uFEFF" + [head.map(esc).join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    }),
    fileName: "Run_Registrations_DEMO.csv",
  });
};

// ---------------- public (the /run/:token page) ----------------
const findByToken = (token) => {
  const item = load().find((i) => i.token === token);
  if (!item) throw fail("This registration link is not valid.", 404);
  return item;
};

const publicView = (item) => ({
  name: item.name,
  mobileNumber: item.mobileNumber,
  email: item.email,
  distance: item.distance,
  status: item.status,
  registrationNumber: item.registrationNumber,
  qrImage: item.qrImage,
  registeredAt: item.registeredAt,
});

export const getPublicRun = async (token) => wait({ success: true, data: publicView(findByToken(token)) });

export const submitPublicRun = async (token, { distance, name, email }) => {
  const items = load();
  const item = items.find((i) => i.token === token);
  if (!item) throw fail("This registration link is not valid.", 404);
  if (item.status === "registered") throw fail("You are already registered.", 409);

  if (![5, 10].includes(Number(distance))) throw fail("Please select 5 KM or 10 KM.");
  const cleanName = String(name || "").replace(/\s+/g, " ").trim();
  if (!cleanName) throw fail("Name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim())) {
    throw fail("Enter a valid email address.");
  }

  item.name = cleanName;
  item.email = String(email).trim().toLowerCase();
  item.distance = Number(distance);
  item.status = "registered";
  item.registeredAt = new Date().toISOString();
  item.qrValue = `RUN-${randomCode()}`;
  item.registrationNumber = item.qrValue.replace("RUN-", "RUN");
  item.qrImage = ""; // the real backend returns the URL of the generated QR image
  save(items);

  return wait({ success: true, message: "Registration successful.", data: publicView(item) });
};
