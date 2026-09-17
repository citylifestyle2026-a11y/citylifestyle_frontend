import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../assets/CSS/site/citytoppers.css";
import SiteHeader from "../../Components/Site/SiteHeader";
import SiteFooter from "../../Components/Site/SiteFooter";
import useSiteAOS from "../../hooks/useSiteAOS";

const IMG = "/assets/images/site";

/**
 * Converted from index.html.
 * Hero is a 3-slide auto-advancing carousel (was a setInterval over
 * .hero-slide elements toggling the "active" class every 4s) — same timing
 * and behavior, now driven by React state.
 */
export default function Home() {
  useSiteAOS();

  const [activeSlide, setActiveSlide] = useState(0);
  const slideCount = 3;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((s) => (s + 1) % slideCount);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ct-site">
      <SiteHeader />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="hero">
        {/* Slide 1 */}
        <div className={`hero-slide${activeSlide === 0 ? " active" : ""}`}>
          <img src={`${IMG}/hero.png`} alt="City Topper's community gathering" className="hero-bg-img" />
          <div className="hero-overlay"></div>

          <div className="hero-content">
            <p className="hero-tagline">GUJARAT'S FIRST CAFE MEET SOCIAL COMMUNITY</p>
            <h1 className="hero-title">CITY<br />TOPPER'S</h1>
            <p className="hero-subtitle">MEET, GREET &amp; REPEAT</p>
          </div>
        </div>

        {/* Slide 2 */}
        <div className={`hero-slide${activeSlide === 1 ? " active" : ""}`}>
          <img src={`${IMG}/hero2.png`} alt="Cafe meet event" className="hero-bg-img" />
          <div className="hero-overlay"></div>

          <div className="hero-content">
            <p className="hero-tagline">SUB BRAND BY CITY TOPPERS</p>
            <h1 className="hero-title">CITY<br />SPARKLE</h1>
            <p className="hero-subtitle">YOUTH · POWER · GROWTH</p>
          </div>
        </div>

        {/* Slide 3 */}
        <div className={`hero-slide${activeSlide === 2 ? " active" : ""}`}>
          <img src={`${IMG}/hero3.png`} alt="City Topper's event" className="hero-bg-img" />
          <div className="hero-overlay"></div>

          <div className="hero-content">
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
          </div>
        </div>
      </section>

      {/* ═══════════════════ STATS ═══════════════════ */}
      <section className="stats">
        <div className="stat-card" data-aos="fade-up" data-aos-delay="0">
          <div className="stat-num">500+</div>
          <div className="stat-label">ACTIVE MEMBERS</div>
        </div>
        <div className="stat-card" data-aos="fade-up" data-aos-delay="100">
          <div className="stat-num">48+</div>
          <div className="stat-label">MEET SESSIONS</div>
        </div>
        <div className="stat-card" data-aos="fade-up" data-aos-delay="200">
          <div className="stat-num">3</div>
          <div className="stat-label">BRAND VERTICALS</div>
        </div>
        <div className="stat-card" data-aos="fade-up" data-aos-delay="300">
          <div className="stat-num">1ST</div>
          <div className="stat-label">IN GUJARAT</div>
        </div>
      </section>

      {/* ═══════════════════ ABOUT ═══════════════════ */}
      <section className="about">
        {/* LEFT */}
        <div className="about-left" data-aos="fade-right">
          <p className="about-tag">WHAT WE ARE</p>
          <h2 className="about-title">WHERE REAL CONVERSATIONS BUILD REAL NETWORKS</h2>
          <p className="about-desc">
            CITY TOPPERS IS NOT A TYPICAL NETWORKING EVENT. WE SIT ACROSS CAFÉ TABLES, SHARE OUR
            UNFILTERED STORIES — THE WINS, THE LOSSES, THE LESSONS — AND BUILD TRUST THAT LASTS BEYOND THE HANDSHAKE.
          </p>
          <ul className="about-bullets">
            <li>
              <div className="bullet-bg"><img src={`${IMG}/coffee_white.svg`} alt="" className="bullet-icon" /></div>
              <span>INTIMATE CAFÉ-FORMAT MEETS, MAX 30 PER SESSION</span>
            </li>
            <li>
              <div className="bullet-bg"><img src={`${IMG}/star.svg`} alt="" className="bullet-icon" /></div>
              <span>CURATED SPEAKERS FROM BUSINESS, ART &amp; LEADERSHIP</span>
            </li>
            <li>
              <div className="bullet-bg"><img src={`${IMG}/people.svg`} alt="" className="bullet-icon" /></div>
              <span>PEER-TO-PEER LEARNING OVER FORMAL PRESENTATIONS</span>
            </li>
          </ul>
        </div>

        {/* RIGHT */}
        <div className="about-right" data-aos="fade-left">
          <img src={`${IMG}/group_top.png`} alt="Group photo" className="about-img about-img--top" />
          <div className="about-img-bottom-wrap">
            <img src={`${IMG}/group_bottom.png`} alt="Cafe gathering left" className="about-img about-img--bl" />
            <div className="about-img-br-wrap">
              <img src={`${IMG}/group_bottom.png`} alt="Cafe gathering right" className="about-img about-img--br" />
            </div>
            <div className="about-badge">
              <img src={`${IMG}/bag.svg`} alt="" className="badge-icon" />
              <span>EST. 2023 · SURAT</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ COMMUNITY ═══════════════════ */}
      <section className="community">
        <div className="community-header" data-aos="fade-up">
          <p className="community-tag">OUR UNIVERSE</p>
          <h2 className="community-title">THREE WORLDS, ONE COMMUNITY</h2>
        </div>

        <div className="community-cards">
          <div className="comm-card" data-aos="fade-up" data-aos-delay="0">
            <img src={`${IMG}/communityLeft.png`} alt="City Sparkle" className="comm-card-img" />
            <div className="comm-card-body">
              <p className="comm-sub-label">SUB BRAND</p>
              <h3 className="comm-card-title">CITY SPARKLE</h3>
              <p className="comm-card-desc">
                YOUTH, POWER &amp; GROWTH — GUJARAT'S 1ST CAFÉ MEET SOCIAL COMMUNITY FOR THE NEXT GENERATION.
              </p>
              <Link className="btn-comm" to="/city-sparkle">Explore Sparkle</Link>
            </div>
          </div>
          <div className="comm-card" data-aos="fade-up" data-aos-delay="150">
            <img src={`${IMG}/community_right.png`} alt="Parv" className="comm-card-img" />
            <div className="comm-card-body">
              <p className="comm-sub-label">SUB BRAND</p>
              <h3 className="comm-card-title">पर्व</h3>
              <p className="comm-card-desc">THE GATHERING OF THE CITY'S ELITE — A FUSION OF AMBITION &amp; FESTIVITY.</p>
              <Link className="btn-comm" to="/parv">Explore PARV</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ PHILOSOPHY ═══════════════════ */}
      <section className="philosophy">
        <div className="philosophy-left" data-aos="fade-right">
          <img src={`${IMG}/communityBottomLeft.png`} alt="Our Philosophy" className="philosophy-img" />
        </div>
        <div className="philosophy-right" data-aos="fade-left">
          <h2 className="philosophy-title">OUR<br />PHILOSOPHY</h2>
          <p className="philosophy-desc">
            SUCCESS AND FAILURE ARE BOTH PART OF EVERY BUSINESS JOURNEY. CITY TOPPERS BELIEVES IN
            LEARNING FROM EXPERIENCES, SUPPORTING EACH OTHER, AND GROWING TOGETHER AS A COMMUNITY.
          </p>
          <div className="philosophy-quote">
            <p className="quote-text">"MEET · CONNECT · GROW"</p>
            <p className="quote-sub">BUILDING MEANINGFUL RELATIONSHIPS BEYOND BUSINESS.</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="cta">
        <div className="cta-card" data-aos="zoom-in">
          <h2 className="cta-title">READY TO BECOME A<br /><span className="cta-highlight">CITY TOPPER?</span></h2>
          <p className="cta-desc">
            BE PART OF A POWERFUL COMMUNITY OF ENTREPRENEURS, PROFESSIONALS, AND GROWTH-DRIVEN INDIVIDUALS.
          </p>
          <Link className="btn-join cta-btn" to="/contact">Get Started</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}