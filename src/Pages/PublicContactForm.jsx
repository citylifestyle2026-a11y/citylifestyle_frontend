import CreateContactModal from "../Components/CreateContactModal";
import "../assets/CSS/PublicContactForm.css";

// Images live in /public/assets/images/site (same folder the marketing site uses).
const IMG = "/assets/images/site";
const cityToppersLogo = `${IMG}/logo__1_-removebg-preview.png`;
const parvHero = `${IMG}/parav_image.png`;

// Public contact form, opened by typing /city-lifestyle in the address bar
// (no login, no button). The form itself is the same one as Contact List ->
// Create Contact (CreateContactModal in publicMode); this page only wraps it
// in the "पर्व by City Toppers" design: logo header, event banner, tagline
// strip, then the form below.
export default function PublicContactForm() {
  return (
    <div className="cityForm">
      <header className="cityFormHeader">
        <img
          src={cityToppersLogo}
          alt="City Toppers - Meet Greet Repeat"
          className="cityFormLogo"
        />
        <div className="cityFormParv">
          <span className="cityFormParvHindi">पर्व</span>
          <span className="cityFormParvBy">BY CITY TOPPERS</span>
        </div>
      </header>

      <section className="cityFormHero">
        <img src={parvHero} alt="Parv by City Toppers gathering" />
        <span className="cityFormHeroShade" aria-hidden="true" />
      </section>

      <section className="cityFormTagline">
        <ul className="cityFormTags">
          <li>🎶 AMBITION·</li>
          <li>🎊 FESTIVITY·</li>
          <li>✨ INNOVATION</li>
        </ul>
        <p className="cityFormAbout">
          The gathering of the city&apos;s elite. Where Gujarat&apos;s most
          accomplished leaders come together to celebrate success, forge
          alliances, and ignite the next chapter of innovation.
        </p>
      </section>

      <main className="cityFormBody">
        <CreateContactModal publicMode onClose={() => {}} />
      </main>
    </div>
  );
}