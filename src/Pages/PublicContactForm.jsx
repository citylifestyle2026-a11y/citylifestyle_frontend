import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CreateContactModal from "../Components/CreateContactModal";
import { getPublicFormLinkApi } from "../services/publicContactService";
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
//
// "Share Form Link": /form?link=<token> opens the same form, but limited to
// the quantity the admin chose. The link's name is filled in as the Reference
// (locked) and the form closes after the last place is taken.
export default function PublicContactForm() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("link") || "").trim();

  const [linkInfo, setLinkInfo] = useState(null);
  const [linkLoading, setLinkLoading] = useState(Boolean(token));
  const [linkError, setLinkError] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  const loadLink = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getPublicFormLinkApi(token);
      setLinkInfo(res?.data || null);
      setLinkError("");
    } catch (err) {
      setLinkError(err?.response?.data?.message || "This form link is not valid.");
    } finally {
      setLinkLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  const renderBody = () => {
    if (!token) return <CreateContactModal publicMode onClose={() => {}} />;

    if (linkLoading) {
      return <p className="cityFormLinkNote">Loading...</p>;
    }

    if (linkError) {
      return (
        <div className="cityFormLinkNote cityFormLinkNote--blocked">
          <h2>Link not available</h2>
          <p>{linkError}</p>
        </div>
      );
    }

    if (!linkInfo?.available) {
      if (justSubmitted) {
        return (
          <div className="cityFormLinkNote cityFormLinkNote--blocked">
            <h2>Thank you!</h2>
            <p>Your details have been received successfully.</p>
            <p>
              Our team will review your submission and get back to you shortly to let you know
              whether your participation in Parv is confirmed (Yes / No). We will contact you on
              the WhatsApp number you have provided.
            </p>
          </div>
        );
      }

      return (
        <div className="cityFormLinkNote cityFormLinkNote--blocked">
          <h2>Form closed</h2>
          <p>{linkInfo?.message || "This form link is closed."}</p>
        </div>
      );
    }

    return (
      <>
        <p className="cityFormLinkNote">
          {linkInfo.remaining} of {linkInfo.quantity} places left
        </p>
        <CreateContactModal
          publicMode
          onClose={() => {}}
          formLink={{ token, name: linkInfo.name }}
          onLinkSubmitted={() => {
            setJustSubmitted(true);
            loadLink();
          }}
        />
      </>
    );
  };

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
        {renderBody()}
      </main>
    </div>
  );
}
