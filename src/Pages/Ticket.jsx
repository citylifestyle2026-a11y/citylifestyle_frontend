import { useSearchParams } from "react-router-dom";

import GuestPass from "../Components/GuestPass";

// Public pass page opened from the WhatsApp "Your Digital Invite" link:
//   /ticket?qr=<8-digit invitationId>
export default function Ticket() {
  const [searchParams] = useSearchParams();

  return <GuestPass invitationId={searchParams.get("qr") || ""} />;
}