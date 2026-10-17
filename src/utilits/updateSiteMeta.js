// One brand for the whole site: every route - the public pages (home, parv,
// contact, login ...) and the admin pages after login - shows the City
// Lifestyle tab title and favicon.
const FAVICON = "/favicon.png";
const TITLE = "City Lifestyle";

// The argument is ignored; kept so existing callers
// (updateSiteMeta(isPrivate) in App.jsx) keep working unchanged.
export const updateSiteMeta = () => {
  document.title = TITLE;

  let favicon = document.querySelector('link[rel="icon"]');

  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }

  favicon.type = "image/png";
  favicon.href = FAVICON;
};
