import { useState } from "react";
import { Link } from "react-router-dom";
import "../../assets/CSS/site/citytoppers.css";
import SiteHeader from "../../Components/Site/SiteHeader";
import SiteFooter from "../../Components/Site/SiteFooter";
import EventGalleryModal from "../../Components/Site/EventGalleryModal";
import InviteRequestModal from "../../Components/Site/InviteRequestModal";
import useSiteAOS from "../../hooks/useSiteAOS";
import useCardCarousel from "../../hooks/useCardCarousel";

const IMG = "/assets/images/site";

// Converted verbatim from the `eventData` object + image lists in parv.html's inline <script>.
const eventData = {
  parv5: {
    title: "PARV 5.0 BASANT KA",
    images: Array.from({ length: 13 }, (_, i) => `${IMG}/parv5_${i + 1}.jpg`),
  },
  parv4: {
    title: "पर्व 4.0 रोशनी का...",
    images: Array.from({ length: 9 }, (_, i) => `${IMG}/parv4_${i + 1}.jpg`),
  },
  parv3: {
    title: "पर्व 3.0 बारिशों का....",
    images: Array.from({ length: 12 }, (_, i) => `${IMG}/parv3_${i + 1}.jpg`),
  },
  parv2: {
    title: "पर्व 2.O  नई उम्मीदों का...",
    images: Array.from({ length: 15 }, (_, i) => `${IMG}/parv2_${i + 1}.jpg`),
  },
  parv1: {
    title: "पर्व 1 खुशियों का...",
    images: Array.from({ length: 12 }, (_, i) => `${IMG}/parv1_${i + 1}.jpg`),
  },
};

// Converted from the 5 hard-coded .comm-card meet-card blocks in "Evenings To Remember".
const rememberEvents = [
  {
    key: "parv5",
    img: `${IMG}/remember_1.png`,
    alt: "Parv 5.0 Basant Ka",
    subLabel: "Surat",
    title: "PARV 5.0 BASANT KA...",
    date: "APRIL 18, 2026 · RAINBOW CLUB, SURAT",
  },
  {
    key: "parv4",
    img: `${IMG}/remember_2.png`,
    alt: "Parv 4.0 Roshni Ka",
    subLabel: "Surat",
    title: "पर्व 4.0 रोशनी का...",
    date: "OCT 12, 2025 · RAINBOW CLUB, SURAT",
  },
  {
    key: "parv3",
    img: `${IMG}/remember_3.png`,
    alt: "Parv 3.0 Barishon Ka",
    subLabel: "Surat",
    title: "पर्व 3.0 बारिशों का...",
    date: "JUN 28, 2025 · WHITESSAND SURAT",
  },
  {
    key: "parv2",
    img: `${IMG}/parv2.png`,
    alt: "Parv 3.0 Barishon Ka",
    subLabel: "Surat",
    title: "पर्व 2.O  नई उम्मीदों का...",
    date: "JAN 10, 2025 • RAINBOW CLUB, SURAT",
  },
  {
    key: "parv1",
    img: `${IMG}/parv1.png`,
    alt: "Parv 3.0 Barishon Ka",
    subLabel: "Surat",
    title: "पर्व 1 खुशियों का...",
    date: "OCT 25, 2025 • DERO by ZERO",
  },
];

/**
 * Converted from parv.html. The "Evenings To Remember" slider and event
 * lightbox reuse the same shared carousel hook / modal component as
 * Sparkle.jsx (both pages had identical JS for this behavior).
 */
export default function Parv() {
  useSiteAOS();
  const [activeEvent, setActiveEvent] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const carousel = useCardCarousel(rememberEvents.length);

  return (
    <div className="ct-site">
      <SiteHeader />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="hero">
        <img src={`${IMG}/parvHero.png`} alt="Parv gathering" className="hero-bg-img" />
        <div className="hero-overlay"></div>
        <div className="hero-content" data-aos="fade-up">
          <p className="hero-tagline">SUB BRAND BY CITY TOPPERS</p>
          <div className="parv-block">
            <div className="parv-title-group">
              <h1 className="hero-title hero-title--parv">पर्व</h1>
              <p className="hero-subtitle">BY CITY TOPPERS</p>
            </div>
            <div className="parv-tags">
              <p className="hero-tagline hero-tagline--parv">✦ AMBITION · 🎉 FESTIVITY · ✨ INNOVATION</p>
            </div>
          </div>
          <p className="hero-desc">
            THE GATHERING OF THE CITY'S ELITE. WHERE GUJARAT'S MOST ACCOMPLISHED LEADERS COME TOGETHER TO
            CELEBRATE SUCCESS, FORGE ALLIANCES, AND IGNITE THE NEXT CHAPTER OF INNOVATION.
          </p>
          <div className="hero-buttons">
            <button type="button" className="btn btn-parv" onClick={() => setInviteOpen(true)}>
              Request Invitation
            </button>
            <Link className="btn btn-story" to="/contact">View Past Events</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════ QUOTE ═══════════════════ */}
      <section className="parv-quote-section">
        <p className="parv-quote" data-aos="fade-up">
          "SUCCESS IS BEST CELEBRATED IN THE COMPANY OF THE EQUALLY AMBITIOUS."
        </p>
      </section>

      {/* ═══════════════════ STATS ═══════════════════ */}
      <section className="stats">
        <div className="stat-card" data-aos="fade-up" data-aos-delay="0">
          <div className="stat-num stat-num--pink">ELITE</div>
          <div className="stat-label">INVITE-ONLY COMMUNITY</div>
        </div>
        <div className="stat-card" data-aos="fade-up" data-aos-delay="100">
          <div className="stat-num stat-num--pink">5+</div>
          <div className="stat-label">GRAND EVENTS HOSTED</div>
        </div>
        <div className="stat-card" data-aos="fade-up" data-aos-delay="200">
          <div className="stat-num stat-num--pink">150+</div>
          <div className="stat-label">ELITE MEMBERS</div>
        </div>
        <div className="stat-card" data-aos="fade-up" data-aos-delay="300">
          <div className="stat-num stat-num--pink">100%</div>
          <div className="stat-label">UNFORGETTABLE</div>
        </div>
      </section>

      {/* ═══════════════════ EXPERIENCE ═══════════════════ */}
      <section className="parv-exp">
        <p className="about-tag about-tag--pink" data-aos="fade-up">THE PARV EXPERIENCE</p>
        <h2 className="about-title" data-aos="fade-up" data-aos-delay="100">WHERE CELEBRATION MEETS PURPOSE</h2>

        <div className="parv-exp-row">
          {/* LEFT — cards */}
          <ul className="about-bullets">
            <li data-aos="fade-right" data-aos-delay="0">
              <div className="bullet-bg"><img src={`${IMG}/crown.svg`} alt="" /></div>
              <div>
                <p className="bullet-title">ELITE GATHERINGS</p>
                <p className="bullet-text">
                  CURATED EVENTS WHERE ONLY THE CITY'S FINEST LEADERS, VISIONARIES, AND INNOVATORS COME TOGETHER.
                </p>
              </div>
            </li>
            <li data-aos="fade-right" data-aos-delay="100">
              <div className="bullet-bg"><img src={`${IMG}/music.svg`} alt="" /></div>
              <div>
                <p className="bullet-title">FESTIVE FUSION</p>
                <p className="bullet-text">WHERE AMBITION MEETS CELEBRATION. BUSINESS MEETS ART. ACHIEVEMENT MEETS CULTURE.</p>
              </div>
            </li>
            <li data-aos="fade-right" data-aos-delay="200">
              <div className="bullet-bg"><img src={`${IMG}/start_pink.svg`} alt="" /></div>
              <div>
                <p className="bullet-title">CELEBRATE SUCCESS</p>
                <p className="bullet-text">MARK MILESTONES, LAUNCHES, AND VICTORIES THE WAY THEY DESERVE — IN GRAND STYLE.</p>
              </div>
            </li>
            <li data-aos="fade-right" data-aos-delay="300">
              <div className="bullet-bg"><img src={`${IMG}/innovation.svg`} alt="" /></div>
              <div>
                <p className="bullet-title">INNOVATION FORUM</p>
                <p className="bullet-text">
                  CUTTING-EDGE IDEAS EXCHANGED IN AN ATMOSPHERE OF LUXURY, CREATIVITY, AND POSSIBILITY.
                </p>
              </div>
            </li>
          </ul>

          {/* RIGHT — image */}
          <div className="parv-exp-img-wrap" data-aos="fade-left">
            <img src={`${IMG}/meets_purpose.png`} alt="Parv event" className="about-img parv-exp-img" />
            <div className="parv-exp-badge">
              <p className="parv-exp-badge-title">NEXT PARV</p>
              <p className="parv-exp-badge-sub">MONSOON EDITION</p>
              <p className="parv-exp-badge-pink">BY INVITATION ONLY</p>
            </div>
            <div className="about-badge parv-exp-est">
              <img src={`${IMG}/bag.svg`} alt="" className="badge-icon" />
              <span>EST. 2023 · SURAT, GUJARAT</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ GALLERY — EVENINGS TO REMEMBER ═══════════════════ */}
      <section className="meets meets--gallery">
        <div className="gallery-header" data-aos="fade-up">
          <p className="gallery-tag gallery-tag--pink">GALLERY</p>
          <h2 className="gallery-title">EVENINGS TO<br />REMEMBER</h2>
        </div>

        <div className="meets-viewport" {...carousel.hoverProps}>
          <div className="meets-cards" style={carousel.trackStyle}>
            {rememberEvents.map((meet) => (
              <div className="comm-card meet-card" key={meet.key}>
                <img src={meet.img} alt={meet.alt} className="comm-card-img" />
                <div className="comm-card-body">
                  <p className="comm-sub-label">{meet.subLabel}</p>
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

        <div className="meets-arrows meets-arrows--center">
          <button
            className={`meets-arrow${carousel.canPrev ? " meets-arrow--active" : ""}`}
            aria-label="Previous"
            onClick={carousel.goPrev}
          >
            &#8249;
          </button>
          <button
            className={`meets-arrow meets-arrow--pink${carousel.canNext ? " meets-arrow--active" : ""}`}
            aria-label="Next"
            onClick={carousel.goNext}
          >
            &#8250;
          </button>
        </div>

        <EventGalleryModal
          eventData={eventData}
          activeEventKey={activeEvent}
          onClose={() => setActiveEvent(null)}
        />
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="cta">
        <div className="cta-card" data-aos="zoom-in">
          <h2 className="cta-title">
            YOU'RE INVITED<br />TO THE <span className="cta-highlight cta-highlight--pink">NEXT PARV</span>
          </h2>
          <p className="cta-desc">
            SEATS ARE LIMITED AND EXCLUSIVE. IF YOU'VE BUILT SOMETHING WORTH CELEBRATING, WE'D LOVE TO
            CELEBRATE IT WITH YOU.
          </p>
          <button type="button" className="btn-join cta-btn cta-btn--pink" onClick={() => setInviteOpen(true)}>
            Request Your Invitation &rarr;
          </button>
        </div>
      </section>

      <InviteRequestModal open={inviteOpen} onClose={() => setInviteOpen(false)} />

      <SiteFooter />
    </div>
  );
}