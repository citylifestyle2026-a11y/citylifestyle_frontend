import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch } from "react-redux";

import { faceMatchApi } from "../../services/qrService";
import { faceCheckInQr } from "../../redux/qr/qrThunk";

/**
 * FaceScanPanel - Face Scan tab of the QR scanner modal.
 *
 *  1. The camera finds a face and makes its 128-number "fingerprint" in the
 *     browser (the picture itself is never sent to the server).
 *  2. The server compares it with the photos people uploaded when they
 *     registered and answers with the best match.
 *  3. The staff see the registered photo next to the live face and press
 *     "Allow entry". Only then is that ticket checked in.
 */

const MODEL_URL = `${import.meta.env.BASE_URL}models`;
const RESET_DELAY_MS = 2500;

// Loaded once, only when the Face tab is opened (the library is large).
let faceapiPromise = null;
const loadFaceApi = () => {
  if (!faceapiPromise) {
    faceapiPromise = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      await faceapi.tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      return faceapi;
    })().catch((error) => {
      faceapiPromise = null; // allow a retry
      throw error;
    });
  }
  return faceapiPromise;
};

const LEVEL_TEXT = {
  high: "Strong match",
  good: "Good match",
  check: "Please compare carefully",
};

// Uploaded images are also reachable under /api/uploads (see backend app.js);
// used as a fallback if the plain /uploads address does not load.
const toApiUploadsUrl = (url) =>
  url ? url.replace(/^(https?:\/\/[^/]+)\/uploads\//, "$1/api/uploads/") : "";

const FaceScanPanel = ({ onCheckedIn, onSound }) => {
  const dispatch = useDispatch();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const statusRef = useRef("loading");
  const faceapiRef = useRef(null);
  const resetTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // loading | scanning | checking | confirm | success | notice
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Loading face scanner...");
  const [facing, setFacing] = useState("user");
  const [cameraError, setCameraError] = useState("");
  const [match, setMatch] = useState(null); // { ...server match, snapshot }
  const [notice, setNotice] = useState(null); // { tone: "error" | "warning", title, text }
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const go = useCallback((next, text) => {
    statusRef.current = next;
    setStatus(next);
    if (text) setMessage(text);
  }, []);

  const resume = useCallback(() => {
    clearTimeout(resetTimeoutRef.current);
    if (!isMountedRef.current) return;
    setMatch(null);
    setNotice(null);
    setConfirming(false);
    setConfirmError("");
    go("scanning", "Show the guest's face to the camera");
  }, [go]);

  // ---------- camera ----------
  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startCamera = useCallback(async () => {
    stopStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported on this browser.");
      return;
    }
    // The QR camera may still be shutting down for a moment after switching
    // tabs, so try a few times before giving up.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!isMountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraError("");
        return;
      } catch (error) {
        if (attempt === 3) {
          setCameraError(
            error?.name === "NotAllowedError"
              ? "Camera permission denied. Please allow camera permission from browser settings."
              : error?.name === "NotReadableError"
              ? "Camera is already in use by another application."
              : "Unable to start camera."
          );
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }, [facing]);

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();
    return () => {
      isMountedRef.current = false;
      clearTimeout(resetTimeoutRef.current);
      stopStream();
    };
  }, [startCamera]);

  // ---------- load models ----------
  useEffect(() => {
    let cancelled = false;
    loadFaceApi()
      .then((faceapi) => {
        if (cancelled) return;
        faceapiRef.current = faceapi;
        go("scanning", "Show the guest's face to the camera");
      })
      .catch(() => {
        if (cancelled) return;
        setNotice({
          tone: "error",
          title: "Face Scanner Not Available",
          text: "The face scanner could not load. Refresh the page and try again.",
        });
        go("notice", "Face scanner could not load.");
      });
    return () => {
      cancelled = true;
    };
  }, [go]);

  // ---------- one recognition round ----------
  const recognise = useCallback(async () => {
    const faceapi = faceapiRef.current;
    const video = videoRef.current;
    if (!faceapi || !video) return;

    go("checking", "Checking face...");

    try {
      const full = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!full) {
        go("scanning", "Face not clear. Hold still and look at the camera");
        return;
      }

      // Small snapshot so the staff can compare it with the registered photo.
      const canvas = document.createElement("canvas");
      const scale = 360 / Math.max(video.videoWidth, 1);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const snapshot = canvas.toDataURL("image/jpeg", 0.7);

      const res = await faceMatchApi({ descriptor: Array.from(full.descriptor) });
      const data = res?.data || {};

      if (!data.matched) {
        onSound?.(false);
        setNotice({
          tone: "error",
          title: "Face Not Recognised",
          text:
            data.reason === "no_faces_enrolled"
              ? "No registered photos found yet. Please scan the guest's QR instead."
              : data.reason === "no_active_event"
              ? "There is no running event right now."
              : "This face does not match any registered photo. Please scan the guest's QR instead.",
        });
        go("notice", "Face not recognised");
        return;
      }

      if (data.alreadyEntered) {
        setNotice({
          tone: "warning",
          title: "Ticket Already Used",
          text: `${data.attendee?.name || "This guest"} has already entered${
            data.scannedAt ? ` at ${new Date(data.scannedAt).toLocaleTimeString()}` : ""
          }.`,
        });
        go("notice", "Already entered");
        return;
      }

      // Found: staff compare the two faces and confirm.
      setMatch({ ...data, snapshot });
      go("confirm", "Check the photo, then allow entry");
    } catch (err) {
      onSound?.(false);
      const serverMsg = err.response?.data?.message;
      setNotice({
        tone: "error",
        title: err.response ? "Face Check Failed" : "Connection Error",
        text:
          serverMsg ||
          (err.response
            ? "Could not check this face."
            : "Unable to connect to server. Check internet or API."),
      });
      go("notice", "Could not check the face");
    }
  }, [go, onSound]);

  // ---------- detection loop (cheap face finder, runs while "scanning") ----------
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let stable = 0;

    const tick = async () => {
      if (cancelled) return;
      const faceapi = faceapiRef.current;
      const video = videoRef.current;

      const ready =
        faceapi &&
        video &&
        statusRef.current === "scanning" &&
        video.readyState >= 2 &&
        video.videoWidth > 0;

      if (!ready) {
        stable = 0;
        timer = setTimeout(tick, 300);
        return;
      }

      try {
        const det = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
        );

        if (det) {
          const { box } = det;
          const big = box.width / video.videoWidth >= 0.18;
          const cx = (box.x + box.width / 2) / video.videoWidth;
          const cy = (box.y + box.height / 2) / video.videoHeight;
          const centered = cx > 0.2 && cx < 0.8 && cy > 0.1 && cy < 0.9;

          if (big && centered) {
            stable += 1;
          } else {
            stable = 0;
            setMessage(big ? "Move the face to the centre" : "Come closer");
          }

          // Two good frames in a row = the face is steady enough to read.
          if (stable >= 2) {
            stable = 0;
            await recognise();
          }
        } else {
          stable = 0;
          setMessage("Show the guest's face to the camera");
        }
      } catch {
        // A bad frame is not an error; try the next one.
      }

      if (!cancelled) timer = setTimeout(tick, 250);
    };

    timer = setTimeout(tick, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [recognise]);

  // ---------- staff action ----------
  const allowEntry = async () => {
    if (!match || confirming) return;
    setConfirming(true);
    setConfirmError("");
    try {
      const result = await dispatch(faceCheckInQr({ ticketId: match.ticketId })).unwrap();
      const d = result?.data || {};
      const name = d.attendee?.name || match.attendee?.name || "";
      onSound?.(true);
      if (onCheckedIn) onCheckedIn(result);
      setMatch(null);
      go(
        "success",
        `Entry allowed${name ? ` - ${name}` : ""}${
          d.isGroupEntry && d.remaining > 0 ? ` - ${d.remaining} more can enter on this pass` : ""
        }`
      );
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = setTimeout(resume, RESET_DELAY_MS);
    } catch (err) {
      onSound?.(false);
      setConfirmError(
        err?.type === "NETWORK"
          ? "Unable to connect to server. Check internet or API."
          : err?.message || "This ticket could not be checked in."
      );
    } finally {
      if (isMountedRef.current) setConfirming(false);
    }
  };

  const ringClass =
    status === "success"
      ? "crmQrFaceOval crmQrFaceOvalGreen"
      : status === "checking"
      ? "crmQrFaceOval crmQrFaceOvalBlue"
      : status === "confirm" || (status === "notice" && notice?.tone === "warning")
      ? "crmQrFaceOval crmQrFaceOvalAmber"
      : status === "notice"
      ? "crmQrFaceOval crmQrFaceOvalRed"
      : "crmQrFaceOval";

  return (
    <>
      <div className="crmQrFaceWrapper">
        <video
          ref={videoRef}
          className={`crmQrFaceVideo${facing === "user" ? " crmQrFaceVideoMirror" : ""}`}
          playsInline
          muted
          autoPlay
        />
        <div className={ringClass} aria-hidden="true" />
      </div>

      <div className="crmQrFaceTools">
        <button
          type="button"
          className="crmQrFaceFlip"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
        >
          Switch camera
        </button>
      </div>

      <div aria-live="polite">
        {cameraError ? (
          <div className="crmQrErrorBox">
            <p className="crmQrErrorText">{cameraError}</p>
          </div>
        ) : (
          <p className="crmQrStatusText crmQrFaceMessage">{message}</p>
        )}
      </div>

      {/* ---------- confirm: registered photo vs live face ---------- */}
      {status === "confirm" && match && (
        <div className="crmQrFaceConfirm" aria-live="polite">
          <p className="crmQrGuestPickTitle">Is this the same person?</p>

          <div className="crmQrFaceCompare">
            <figure>
              {match.attendee?.profileImage ? (
                <img
                  src={match.attendee.profileImage}
                  alt="Registered"
                  onError={(event) => {
                    const fallback = toApiUploadsUrl(match.attendee.profileImage);
                    if (fallback && event.currentTarget.src !== fallback) {
                      event.currentTarget.src = fallback;
                    }
                  }}
                />
              ) : (
                <div className="crmQrFaceNoPhoto">No photo</div>
              )}
              <figcaption>Registered</figcaption>
            </figure>
            <figure>
              <img src={match.snapshot} alt="Live camera" />
              <figcaption>Camera now</figcaption>
            </figure>
          </div>

          <div className="crmQrCard crmQrFaceCard">
            <div className="crmQrCardRow">
              <span className="crmQrCardLabel">Name</span>
              <span className="crmQrCardValue">{match.attendee?.name || match.booking?.name || "N/A"}</span>
            </div>
            <div className="crmQrCardRow">
              <span className="crmQrCardLabel">Mobile</span>
              <span className="crmQrCardValue">{match.attendee?.mobileNumber || "N/A"}</span>
            </div>
            <div className="crmQrCardRow">
              <span className="crmQrCardLabel">Ticket</span>
              <span className="crmQrCardValue">{match.ticketType?.ticketName || "N/A"}</span>
            </div>
            <div className="crmQrCardRow">
              <span className="crmQrCardLabel">Event</span>
              <span className="crmQrCardValue">{match.event?.title || "N/A"}</span>
            </div>
            <div className="crmQrCardRow">
              <span className="crmQrCardLabel">Match</span>
              <span className={`crmQrFaceLevel crmQrFaceLevel-${match.level}`}>
                {LEVEL_TEXT[match.level] || ""}
              </span>
            </div>
          </div>

          {confirmError && (
            <div className="crmQrErrorBox">
              <p className="crmQrErrorText">{confirmError}</p>
            </div>
          )}

          <div className="crmQrActions">
            <button type="button" className="crmQrBtn crmQrBtnGhost" onClick={resume} disabled={confirming}>
              Not this person
            </button>
            <button type="button" className="crmQrBtn crmQrBtnPrimary" onClick={allowEntry} disabled={confirming}>
              {confirming ? "Checking in..." : "Allow entry"}
            </button>
          </div>
        </div>
      )}

      {/* ---------- notice: not recognised / already used / error ---------- */}
      {status === "notice" && notice && (
        <div aria-live="polite">
          <div className="crmQrResultState">
            <p className="crmQrResultTitle">{notice.title}</p>
            <p className="crmQrResultMessage">{notice.text}</p>
          </div>
          <div className="crmQrActions">
            <button type="button" className="crmQrBtn crmQrBtnPrimary" onClick={resume}>
              Scan Next
            </button>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="crmQrActions">
          <button type="button" className="crmQrBtn crmQrBtnGhost" onClick={resume}>
            Scan Next
          </button>
        </div>
      )}
    </>
  );
};

export default FaceScanPanel;