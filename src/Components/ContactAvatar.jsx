import { useEffect, useMemo, useState } from "react";
import "../assets/CSS/ContactAvatar.css";
import { getInstagramUrl } from "../utilits/instagram";
import { imageUrlCandidates } from "../utilits/imageUrl";

// Round profile photo, or the person's first letter when no photo was
// uploaded. Shared by the Contact List table and the Contact Details modal.
export function ContactAvatar({ src, name, size = 36 }) {
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";

  // Tries the corrected URL first, then the saved one. If none loads (file
  // missing / wrong host) the first letter is shown instead of a broken image.
  const candidates = useMemo(() => imageUrlCandidates(src), [src]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [candidates]);
  const current = candidates[attempt];

  return (
    <span
      className="contactAvatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {current ? (
        <img
          src={current}
          alt={name || "Profile"}
          onError={() => setAttempt((n) => n + 1)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

// "@username" linking to the Instagram profile, or "-" when empty.
export function InstagramLink({ id }) {
  if (!id) return "-";

  return (
    <a
      className="contactInstagramLink"
      href={getInstagramUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      @{id}
    </a>
  );
}

// Avatar + name side by side (table cells).
export function ContactPerson({ name, image, size = 34 }) {
  if (!name) return "-";

  return (
    <span className="contactPerson">
      <ContactAvatar src={image} name={name} size={size} />
      <span className="contactPersonName">{name}</span>
    </span>
  );
}