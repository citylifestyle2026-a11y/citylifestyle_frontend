import "../assets/CSS/ContactAvatar.css";
import { getInstagramUrl } from "../utilits/instagram";

// Round profile photo, or the person's first letter when no photo was
// uploaded. Shared by the Contact List table and the Contact Details modal.
export function ContactAvatar({ src, name, size = 36 }) {
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className="contactAvatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {src ? <img src={src} alt={name || "Profile"} /> : initial}
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
