import { useState } from "react";
import { Link } from "react-router-dom";
import "../../assets/CSS/site/citytoppers.css";
import SiteHeader from "../../Components/Site/SiteHeader";
import SiteFooter from "../../Components/Site/SiteFooter";
import EventGalleryModal from "../../Components/Site/EventGalleryModal";
import useSiteAOS from "../../hooks/useSiteAOS";
import useCardCarousel from "../../hooks/useCardCarousel";

const IMG = "/assets/images/site";

// Converted verbatim from the `eventData` object + image lists in sparkle.html's inline <script>.
const eventData = {
  sparkle14: {
    title: "14TH CITY SPARKLE AT CHPTR OLDAY",
    images: Array.from({ length: 14 }, (_, i) => `${IMG}/spaekle14_${i + 1}.jpg`),
  },
  sparkle13: {
    title: "13TH CITY SPARKLE AT BEYOND HEMP",
    images: Array.from({ length: 4 }, (_, i) => `${IMG}/spaekle13_${i + 1}.jpeg`),
  },
  sparkle12: {
    title: "12TH CITY SPARKLE AT THE TERRACE",
    images: Array.from({ length: 18 }, (_, i) => `${IMG}/spaekle12_${i + 1}.jpg`),
  },
  sparkle11: {
    title: "11TH CITY SPARKLE AT URBAN CAFE",
    images: Array.from({ length: 11 }, (_, i) => `${IMG}/spaekle11_${i + 1}.jpg`),
  },
};

// Converted from the 4 hard-coded .comm-card meet-card blocks in the "Recent Meets" section.
const recentMeets = [
  {
    key: "sparkle14",
    img: `${IMG}/meets_1.png`,
    alt: "14th City Sparkle",
    subLabel: "Networking | Surat",
    title: "14TH CITY SPARKLE AT CHPTR OLDAY",
    date: "MAY 15, 2026",
  },
  {
    key: "sparkle13",
    img: `${IMG}/meets_2.png`,
    alt: "13th City Sparkle",
    subLabel: "Networking | Surat",
    title: "13TH CITY SPARKLE AT BEYOND HEMP",
    date: "FEB 12, 2026",
  },
  {
    key: "sparkle12",
    img: `${IMG}/meets_3.png`,
    alt: "12th City Sparkle",
    subLabel: "Networking | Surat",
    title: "12TH CITY SPARKLE AT THE TERRACE",
    date: "NOV 08, 2025",
  },
  {
    key: "sparkle11",
    img: `${IMG}/meets_4.png`,
    alt: "11th City Sparkle",
    subLabel: "Networking | Surat",
    title: "11TH CITY SPARKLE AT URBAN CAFE",
    date: "AUG 20, 2025",
  },
];

/**
 * Converted from sparkle.html. The "Recent Meets" slider (useCardCarousel)
 * and the event-photo lightbox (EventGalleryModal) reuse the same shared
 * logic that also powers parv.html's "Evenings To Remember" section.
 */
export default function Sparkle() {
  useSiteAOS();
  const [activeEvent, setActiveEvent] = useState(null);
  const carousel = useCardCarousel(recentMeets.length);

  return (
    <div className="ct-site">
      <SiteHeader />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="hero">
        <img src={`${IMG}/sparkleHero.png`} alt="City Sparkle gathering" className="hero-bg-img" />
        <div className="hero-overlay"></div>
        <div className="hero-content" data-aos="fade-up">
          <p className="hero-tagline">SUB BRAND BY CITY TOPPERS</p>
          <h1 className="hero-title">CITY<br />SPARKLE</h1>
          <p className="hero-subtitle">YOUTH · POWER · GROWTH</p>
          <p className="hero-desc">
            A YOUTH-DRIVEN ENTREPRENEUR COMMUNITY BUILT FOR AMBITIOUS MINDS WHO WANT TO CONNECT, LEARN,
            AND GROW TOGETHER.<br />CITY SPARKLE CREATES A SPACE WHERE YOUNG ENTREPRENEURS, CREATORS, AND FUTURE LEADERS TURN
            CONVERSATIONS INTO OPPORTUNITIES.
          </p>
          <div className="hero-buttons">
            <Link className="btn btn-sparkle" to="/contact">Join Sparkle</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════ STATS ═══════════════════ */}
      <section className="stats">
        <div className="stat-card" data-aos="fade-up" data-aos-delay="0">
          <div className="stat-num stat-num--blue">18–35</div>
          <div className="stat-label">TARGET AGE GROUP</div>
        </div>
        <div className="stat-card" data-aos="fade-up" data-aos-delay="100">
          <div className="stat-num stat-num--blue">200+</div>
          <div className="stat-label">YOUTH MEMBERS</div>
        </div>
        <div className="stat-card" data-aos="fade-up" data-aos-delay="200">
          <div className="stat-num stat-num--blue">24+</div>
          <div className="stat-label">SPARKLE MEETS</div>
        </div>
        <div className="stat-card" data-aos="fade-up" data-aos-delay="300">
          <div className="stat-num stat-num--blue">92%</div>
          <div className="stat-label">RETURN RATE</div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section className="features">
        <div className="features-header" data-aos="fade-up">
          <p className="features-tag">WHAT WE OFFER</p>
          <h2 className="features-title">BUILT FOR THE AMBITIOUS</h2>
        </div>

        <div className="features-grid">
          <div className="feature" data-aos="fade-up" data-aos-delay="0">
            <div className="feature-icon"><img src={`${IMG}/energy.svg`} alt="" /></div>
            <h3 className="feature-name">YOUTH ENERGY</h3>
            <p className="feature-desc">A COMMUNITY FILLED WITH FRESH IDEAS, AMBITION, AND GROWTH MINDSET.</p>
          </div>
          <div className="feature" data-aos="fade-up" data-aos-delay="100">
            <div className="feature-icon"><img src={`${IMG}/star.svg`} alt="" /></div>
            <h3 className="feature-name">POWER NETWORK</h3>
            <p className="feature-desc">CONNECT WITH YOUNG ENTREPRENEURS, CREATORS, AND FUTURE BUSINESS LEADERS.</p>
          </div>
          <div className="feature" data-aos="fade-up" data-aos-delay="200">
            <div className="feature-icon"><img src={`${IMG}/people.svg`} alt="" /></div>
            <h3 className="feature-name">RAPID GROWTH</h3>
            <p className="feature-desc">LEARN THROUGH REAL EXPERIENCES, MENTORSHIP, AND NETWORKING OPPORTUNITIES.</p>
          </div>
          <div className="feature" data-aos="fade-up" data-aos-delay="300">
            <div className="feature-icon"><img src={`${IMG}/coffee_white.svg`} alt="" /></div>
            <h3 className="feature-name">CAFÉ FORMAT</h3>
            <p className="feature-desc">
              INTERACTIVE MEETUPS DESIGNED FOR MEANINGFUL CONVERSATIONS, NETWORKING, AND REAL GROWTH OPPORTUNITIES.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════ RECENT MEETS ═══════════════════ */}
      <section className="meets">
        <div className="meets-header" data-aos="fade-up">
          <h2 className="meets-title">RECENT MEETS</h2>
          <div className="meets-header-right">
            <p className="meets-desc">
              MEET PASSIONATE YOUNG ENTREPRENEURS, EXCHANGE IDEAS, AND BUILD POWERFUL CONNECTIONS IN AN
              ENERGETIC ENVIRONMENT.
            </p>
            <div className="meets-arrows">
              <button
                className={`meets-arrow${carousel.canPrev ? " meets-arrow--active" : ""}`}
                aria-label="Previous"
                onClick={carousel.goPrev}
              >
                &#8249;
              </button>
              <button
                className={`meets-arrow${carousel.canNext ? " meets-arrow--active" : ""}`}
                aria-label="Next"
                onClick={carousel.goNext}
              >
                &#8250;
              </button>
            </div>
          </div>
        </div>

        <div className="meets-viewport" {...carousel.hoverProps}>
          <div className="meets-cards" style={carousel.trackStyle}>
            {recentMeets.map((meet) => (
              <div className="comm-card meet-card" key={meet.key}>
                <img src={meet.img} alt={meet.alt} className="comm-card-img" />
                <div className="comm-card-body">
                  <p className="comm-sub-label comm-sub-label--blue">{meet.subLabel}</p>
                  <h3 className="comm-card-title">{meet.title}</h3>
                  <p className="meet-date">{meet.date}</p>
                  <a
                    className="btn-comm view-event-btn"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveEvent(meet.key);
                    }}
                  >
                    View Event
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <EventGalleryModal
          eventData={eventData}
          activeEventKey={activeEvent}
          onClose={() => setActiveEvent(null)}
        />
      </section>

      {/* ═══════════════════ GALLERY ═══════════════════ */}
      <section className="gallery">
        <div className="gallery-header" data-aos="fade-up">
          <p className="gallery-tag">FROM OUR MEETS</p>
          <h2 className="gallery-title">MOMENTS THAT MATTER</h2>
        </div>

        <div className="gallery-grid">
          <div className="gallery-row gallery-row--top">
            <img src={`${IMG}/moments_1.png`} alt="" className="gallery-img gallery-img--sm" data-aos="zoom-in" data-aos-delay="0" />
            <img src={`${IMG}/moments_2.png`} alt="" className="gallery-img gallery-img--lg" data-aos="zoom-in" data-aos-delay="100" />
            <img src={`${IMG}/moments_3.png`} alt="" className="gallery-img gallery-img--lg" data-aos="zoom-in" data-aos-delay="200" />
          </div>
          <div className="gallery-row gallery-row--bottom">
            <img src={`${IMG}/moments_4.png`} alt="" className="gallery-img gallery-img--sm" data-aos="zoom-in" data-aos-delay="0" />
            <img src={`${IMG}/moments_5.png`} alt="" className="gallery-img gallery-img--xl" data-aos="zoom-in" data-aos-delay="100" />
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="cta">
        <div className="cta-card" data-aos="zoom-in">
          <h2 className="cta-title">YOUR TIME IS<br /><span className="cta-highlight cta-highlight--blue">NOW</span></h2>
          <p className="cta-desc">DON'T WAIT FOR THE PERFECT MOMENT. THE PERFECT MOMENT IS THE NEXT SPARKLE MEET.</p>
          <Link className="btn-join cta-btn cta-btn--blue" to="/contact">Claim Your Seat →</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}