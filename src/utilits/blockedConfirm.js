import { confirmDialog } from "./appSwal";

// Used before approving / resending a pass / booking for contacts.
// If none of the given contacts is on the Block List -> { ok: true, confirmBlocked: false }
// (nothing is asked). If some are, show who + the reason and ask once more:
//   confirmed -> { ok: true,  confirmBlocked: true }  (send confirmBlocked to the API)
//   cancelled -> { ok: false, confirmBlocked: false } (caller stops)
export const confirmBlockedContacts = async (
  contacts = [],
  { action = "continue", confirmText = "Yes, continue anyway" } = {}
) => {
  const blockedOnes = (contacts || []).filter((c) => c && c.blocked);

  if (blockedOnes.length === 0) {
    return { ok: true, confirmBlocked: false };
  }

  const shown = blockedOnes.slice(0, 5).map((c) => ({
    icon: "🚫",
    text: `${c.fullName || c.name || c.mobileNumber || "Contact"} - ${
      c.blocked?.reason || "No reason given"
    }`,
  }));

  if (blockedOnes.length > shown.length) {
    shown.push({ icon: "•", text: `and ${blockedOnes.length - shown.length} more` });
  }

  const confirmed = await confirmDialog({
    title:
      blockedOnes.length === 1
        ? "This person is on the Block List"
        : `${blockedOnes.length} people are on the Block List`,
    text: `Do you still want to ${action}?`,
    points: shown,
    confirmText,
    tone: "danger",
  });

  return { ok: confirmed, confirmBlocked: confirmed };
};
