import { FaBan } from "react-icons/fa";
import "../assets/CSS/BlockList.css";

/**
 * Red "Blocked" flag with the reason and who blocked the person.
 * `blocked` is the object the API puts on a row (null when not blocked):
 *   { name, reason, blockedByName, ... }
 * Renders nothing for a row that is not on the Block List.
 */
export default function BlockedBadge({ blocked }) {
  if (!blocked) return null;

  return (
    <div
      className="blockedFlag"
      title={`Blocked: ${blocked.reason}${blocked.blockedByName ? ` (by ${blocked.blockedByName})` : ""}`}
    >
      <span className="blockedFlag__badge">
        <FaBan /> BLOCKED
      </span>
      {blocked.name && <span className="blockedFlag__by">Listed as: {blocked.name}</span>}
      <span className="blockedFlag__reason">Reason: {blocked.reason}</span>
      {blocked.blockedByName && (
        <span className="blockedFlag__by">Blocked by: {blocked.blockedByName}</span>
      )}
    </div>
  );
}
