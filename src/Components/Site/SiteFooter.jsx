import { Link } from "react-router-dom";

/**
 * Shared marketing-site footer, converted from the repeated <footer> markup
 * duplicated across index.html, sparkle.html and parv.html.
 *
 * NOTE: in the original index.html and sparkle.html, the "पर्व · PARV" footer
 * link under "OUR BRANDS" was left as a dead href="#" (only parv.html itself
 * had it wired up correctly to parv.html). Now that one footer is shared by
 * every page, both brand links are pointed at their real routes everywhere.
 */
export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-col footer-brand">
          <Link to="/">
            <img src="/assets/images/site/logo.svg" alt="City Topper's Logo" className="footer-logo" />
          </Link>
          <p className="footer-about">
            MEET, GREET &amp; REPEAT. BUILDING GUJARAT'S MOST AUTHENTIC COMMUNITY OF AMBITIOUS
            PROFESSIONALS, ENTREPRENEURS, AND DREAMERS.
          </p>
        </div>
        <div className="footer-col">
          <h4 className="footer-heading">OUR BRANDS</h4>
          <ul className="footer-links">
            <li><Link to="/city-sparkle">CITY SPARKLE</Link></li>
            <li><Link to="/parv">पर्व · PARV</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4 className="footer-heading">CONNECT</h4>
          <ul className="footer-links">
            <li>
              <a target="_blank" rel="noreferrer" href="https://www.instagram.com/citytoppers/?hl=en">
                INSTAGRAM
              </a>
            </li>
            <li>
              <a
                target="_blank"
                rel="noreferrer"
                href="https://in.linkedin.com/company/citytoppers?trk=public_post_feed-actor-name"
              >
                LINKEDIN
              </a>
            </li>
            <li><Link to="/contact">CONTACT US</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 CITY TOPPERS. ALL RIGHTS RESERVED.</p>
        <p>MEET · GREET · REPEAT</p>
      </div>
    </footer>
  );
}
