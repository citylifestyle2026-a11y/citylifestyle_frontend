// Single place that saves a Blob as a file (hidden <a download> click).
// Every export / "download sample" button used to carry its own copy of this.

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const saveBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const saveCsvText = (text, fileName, { bom = false } = {}) =>
  saveBlob(
    new Blob([bom ? "\uFEFF" + text : text], { type: "text/csv;charset=utf-8;" }),
    fileName
  );
