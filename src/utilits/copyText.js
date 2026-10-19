// Copies text to the clipboard. Falls back to a hidden textarea for browsers /
// pages where navigator.clipboard is not available (e.g. plain http).
export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } finally {
      document.body.removeChild(area);
    }
    return ok;
  }
};
