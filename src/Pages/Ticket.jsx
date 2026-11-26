import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import GuestPass from "../Components/GuestPass";
import RunTicket from "../Components/RunTicket";
import { getPublicInvitationApi } from "../services/publicInvitationService";

// Public pass page opened from the WhatsApp link:
//   /ticket?qr=<8-digit invitationId>
//
// A Let's Run registration gets its own ticket (RunTicket); every other
// invitation is shown by the normal GuestPass, which is NOT changed at all.
// While we check which one it is, a neutral loader is shown.
export default function Ticket() {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("qr") || "";

  const [checking, setChecking] = useState(Boolean(invitationId));
  const [runInvite, setRunInvite] = useState(null);

  useEffect(() => {
    if (!invitationId) {
      setChecking(false);
      return undefined;
    }

    let cancelled = false;
    setChecking(true);
    setRunInvite(null);

    getPublicInvitationApi(invitationId)
      .then((res) => {
        if (!cancelled && res?.data?.isRunRegistration) setRunInvite(res.data);
      })
      .catch(() => {
        /* not found / network: GuestPass below shows its usual message */
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  if (checking) {
    return (
      <div className="passLoading">
        <span className="passLoading__spinner" aria-hidden="true" />
        <p>Loading your pass…</p>
      </div>
    );
  }

  if (runInvite) return <RunTicket invite={runInvite} />;

  return <GuestPass invitationId={invitationId} />;
}
