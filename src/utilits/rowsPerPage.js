// "All" choice for the rows-per-page selects of every list page.
// It is sent to the backend as a very large limit (larger than any real list),
// so every matching row comes back on ONE page and the page buttons hide.
export const ALL_ROWS = 100000;

export const ALL_ROWS_OPTION = { value: ALL_ROWS, label: "All" };
