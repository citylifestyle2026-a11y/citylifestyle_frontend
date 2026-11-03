import { FaBan } from "react-icons/fa";
import "../assets/CSS/BlockList.css";

const sameText = (a, b) =>
  String(a || "").replace(/\s+/g, " ").trim().toLowerCase() ===
  String(b || "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Red "Blocked" flag with the reason and who blocked the person.
 * `blocked` is the object the API puts on a row (null when not blocked):
 *   { name, reason, blockedByName, mobileNumber, matchedBy, ... }
 * `personName` (optional) is the name shown on the row; "Listed as" is hidden
 * when it is the same name, so the flag stays short.
 * Renders nothing for a row that is not on the Block List.
 */
export default function BlockedBadge({ blocked, personName = "" }) {
  if (!blocked) return null;

  const byName = blocked.matchedBy === "name";
  const showListedAs = blocked.name && !sameText(blocked.name, personName);
  const blockedNumber = String(blocked.mobileNumber || "").replace(/^91(?=\d{10}$)/, "");

  return (
    <div
      className="blockedFlag"
      title={`Blocked: ${blocked.reason}${blocked.blockedByName ? ` (by ${blocked.blockedByName})` : ""}`}
    >
      <span className="blockedFlag__badge">
        <FaBan /> BLOCKED
      </span>

      <div className="blockedFlag__box">
        {byName && (
          <div className="blockedFlag__warn">Same name, different number - please verify</div>
        )}
        {showListedAs && (
          <div className="blockedFlag__row">
            <b>Listed as:</b> <span>{blocked.name}</span>
          </div>
        )}
        {byName && blockedNumber && (
          <div className="blockedFlag__row">
            <b>Blocked number:</b> <span>{blockedNumber}</span>
          </div>
        )}
        <div className="blockedFlag__row">
          <b>Reason:</b> <span>{blocked.reason}</span>
        </div>
        {blocked.blockedByName && (
          <div className="blockedFlag__row">
            <b>Blocked by:</b> <span>{blocked.blockedByName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
