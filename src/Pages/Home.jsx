import "../assets/CSS/Home.css";

const IMG = "/assets/images/city-lifestyle";

/**
 * Home page — converted from the standalone city-lifestyle/index.html.
 * Tailwind CDN is no longer needed: the same styles live in Home.css
 * (scoped under .cl-home so nothing leaks into the admin pages).
 */
export default function Home() {
  return (
    <div className="cl-home">
      {/* ============ HEADER ============ */}
      <header className="cl-header cl-grid-bg">
        <div className="cl-header-inner">
          <a href="/" className="cl-logo cl-reveal" style={{ "--delay": "0s" }}>
            <img src={`${IMG}/logo.png`} alt="City Lifestyle Logo" />
          </a>

          <a target="_blank" rel="noreferrer" href="https://wa.me/919173351269">
            <button className="cl-cta cl-reveal" style={{ "--delay": ".1s" }}>
              Contact Us
            </button>
          </a>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="cl-hero">
        <div className="cl-hero-bg">
          <img src={`${IMG}/hero.png`} alt="Crowd dancing at a nightclub event" loading="lazy" />
          <div className="cl-hero-shade-1"></div>
          <div className="cl-hero-shade-2"></div>
        </div>

        <div className="cl-hero-grid cl-grid-bg"></div>

        <div className="cl-hero-content">
          <div className="cl-hero-cols">
            {/* Left: Headline */}
            <div className="cl-reveal" style={{ "--delay": ".15s" }}>
              <h1 className="cl-title">
                What's<br />
                Happening<br />
                In Your City?
              </h1>
              <p className="cl-subtitle">We've got it all covered.</p>
            </div>

            {/* Right: Eyebrow + follow + socials */}
            <div className="cl-right cl-reveal" style={{ "--delay": ".3s" }}>
              <p className="cl-eyebrow">The nightlife guide you actually need.</p>
              <p className="cl-tags">
                Events <span>|</span> Lifestyle <span>|</span> Culture <span>|</span> Nightlife
              </p>

              <div className="cl-follow">
                <span>Follow us on</span>
                <a href="https://www.instagram.com/citylifestylesurat" target="_blank" rel="noreferrer" aria-label="Instagram" className="cl-insta-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2c2.7 0 3.05.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.22.6 1.77 1.15.55.55.9 1.11 1.15 1.77.25.64.42 1.37.47 2.43.05 1.07.06 1.42.06 4.12s-.01 3.05-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47-1.07.05-1.42.06-4.12.06s-3.05-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.05 2 14.7 2 12s.01-3.05.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.22 1.15-1.77A4.9 4.9 0 0 1 5.45.53C6.09.28 6.82.11 7.88.06 8.95.01 9.3 0 12 0zm0 1.8c-2.65 0-2.97.01-4.01.06-.92.04-1.42.19-1.75.32-.44.17-.75.37-1.08.7-.33.33-.53.64-.7 1.08-.13.33-.28.83-.32 1.75-.05 1.04-.06 1.36-.06 4.01s.01 2.97.06 4.01c.04.92.19 1.42.32 1.75.17.44.37.75.7 1.08.33.33.64.53 1.08.7.33.13.83.28 1.75.32 1.04.05 1.36.06 4.01.06s2.97-.01 4.01-.06c.92-.04 1.42-.19 1.75-.32.44-.17.75-.37 1.08-.7.33-.33.53-.64.7-1.08.13-.33.28-.83.32-1.75.05-1.04.06-1.36.06-4.01s-.01-2.97-.06-4.01c-.04-.92-.19-1.42-.32-1.75a2.9 2.9 0 0 0-.7-1.08 2.9 2.9 0 0 0-1.08-.7c-.33-.13-.83-.28-1.75-.32-1.04-.05-1.36-.06-4.01-.06zm0 4.86a5.34 5.34 0 1 1 0 10.68 5.34 5.34 0 0 1 0-10.68zm0 1.8a3.54 3.54 0 1 0 0 7.08 3.54 3.54 0 0 0 0-7.08zm6.8-2a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0z" />
                  </svg>
                </a>
              </div>

              <div className="cl-pills">
                <a target="_blank" rel="noreferrer" href="https://www.instagram.com/citylifestylesurat">citylifestylesurat</a>
                <a target="_blank" rel="noreferrer" href="https://www.instagram.com/citylifestylepune/">citylifestylepune</a>
                <a target="_blank" rel="noreferrer" href="https://www.instagram.com/citylifestyleahmedabad/">citylifestyleahemdabad</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="cl-footer">
        <p>© 2026 City Lifestyle India. All rights reserved.</p>
      </footer>
    </div>
  );
}
