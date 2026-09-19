import { toast } from "react-toastify";

export const showSuccess = (message) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 3000,
  });
};

export const showError = (message) => {
  toast.error(message, {
    position: "top-right",
    // Real server messages are longer than the old fixed texts, so give
    // them a little more time on screen than success toasts.
    autoClose: 6000,
    // The same error text (e.g. two requests failing with "Unable to reach
    // the server") is shown once while it is on screen, instead of
    // stacking identical toasts.
    toastId: typeof message === "string" ? message : undefined,
  });
};

export const showWarning = (message) => {
  toast.warning(message, {
    position: "top-right",
    autoClose: 3000,
  });
};

export const showInfo = (message) => {
  toast.info(message, {
    position: "top-right",
    autoClose: 3000,
  });
};