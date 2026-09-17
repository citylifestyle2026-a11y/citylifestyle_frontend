const PUBLIC_FAVICON = "/favicon - 1.png";
const PRIVATE_FAVICON = "/favicon.png";

const PUBLIC_TITLE = "City Toppers";
const PRIVATE_TITLE = "City Lifestyle";

export const updateSiteMeta = (isPrivate) => {
  document.title = isPrivate ? PRIVATE_TITLE : PUBLIC_TITLE;

  let favicon = document.querySelector('link[rel="icon"]');

  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }

  favicon.type = "image/png";
  favicon.href = isPrivate ? PRIVATE_FAVICON : PUBLIC_FAVICON;
};