import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch } from "react-redux";

import { faceMatchApi } from "../../services/qrService";
import { faceCheckInQr } from "../../redux/qr/qrThunk";
import { speak } from "../../utilits/speak";

/**
 * FaceScanPanel - Face Scan tab of the QR scanner modal.
 *
 *  1. The camera finds a face and makes its 128-number "fingerprint" in the
 *     browser (the picture itself is never sent to the server).
 *  2. The server compares it with the photos people uploaded when they
 *     registered and answers with the best match.
 *  3. A clear match is let in AUTOMATICALLY (no "Allow entry" button): the
 *     screen shows "Thank you" and the voice says "Thank you". A face that
 *     does not match shows "Not recognised" (and says it).
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


const FaceScanPanel = ({ onCheckedIn, onSound }) => {
  const dispatch = useDispatch();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const statusRef = useRef("loading");
  const faceapiRef = useRef(null);
  const resetTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // loading | scanning | checking | success | notice
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Loading face scanner...");
  const [facing, setFacing] = useState("user");
  const [cameraError, setCameraError] = useState("");
  const [notice, setNotice] = useState(null); // { tone: "error" | "warning", title, text }

  const go = useCallback((next, text) => {
    statusRef.current = next;
    setStatus(next);
    if (text) setMessage(text);
  }, []);

  const resume = useCallback(() => {
    clearTimeout(resetTimeoutRef.current);
    if (!isMountedRef.current) return;
    setNotice(null);
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

  // ---------- matched face -> let the person in by itself ----------
  const checkInMatched = useCallback(
    async (data) => {
      try {
        const result = await dispatch(faceCheckInQr({ ticketId: data.ticketId })).unwrap();
        const d = result?.data || {};
        const name = d.attendee?.name || data.attendee?.name || "";
        speak("Thank you");
        if (onCheckedIn) onCheckedIn(result);
        go(
          "success",
          `Thank you${name ? `, ${name}` : ""}!${
            d.isGroupEntry && d.remaining > 0 ? ` ${d.remaining} more can enter on this pass.` : ""
          }`
        );
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = setTimeout(resume, RESET_DELAY_MS);
      } catch (err) {
        speak("Entry not allowed");
        setNotice({
          tone: "error",
          title: "Entry Not Allowed",
          text:
            err?.type === "NETWORK"
              ? "Unable to connect to server. Check internet or API."
              : err?.message || "This ticket could not be checked in.",
        });
        go("notice", "Entry not allowed");
      }
    },
    [dispatch, go, onCheckedIn, onSound, resume]
  );

  // ---------- one recognition round ----------
  const recognise = useCallback(async () => {
    const faceapi = faceapiRef.current;
    const video = videoRef.current;
    if (!faceapi || !video) return;

    go("checking", "Checking face...");

    try {
      // Read up to 3 frames and average them: glasses / masks / blinking make a
      // single frame noisy, the average is much more stable.
      const descriptors = [];
      for (let i = 0; i < 3; i += 1) {
        const f = await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (f) descriptors.push(f.descriptor);
        if (i < 2) await new Promise((r) => setTimeout(r, 120));
      }

      if (descriptors.length === 0) {
        go("scanning", "Face not clear. Hold still and look at the camera");
        return;
      }

      const avg = new Array(128).fill(0);
      descriptors.forEach((d) => d.forEach((v, idx) => { avg[idx] += v / descriptors.length; }));
      const full = { descriptor: avg };

      const res = await faceMatchApi({ descriptor: full.descriptor });
      const data = res?.data || {};

      // Only a clear match (strong / good) is let in. A weak "please compare
      // carefully" match is treated as NOT recognised - there is no button
      // for staff to confirm any more.
      if (!data.matched || data.level === "check") {
        speak(data.reason === "no_active_event" ? "No running event" : "Not recognised");
        setNotice({
          tone: "error",
          title: "Not Recognised",
          text:
            data.reason === "no_faces_enrolled"
              ? `No registered photos found yet. Please scan the guest's QR instead.${
                data.debug
                  ? ` [events ${data.debug.activeEvents}, tickets ${data.debug.tickets}, photos ${data.debug.withPhoto}, face data ${data.debug.withFaceData}, engine ${data.debug.faceEngine}]`
                  : ""
              }`
              : data.reason === "no_active_event"
              ? "There is no running event right now."
              : "This face does not match any registered photo. Please scan the guest's QR instead.",
        });
        go("notice", "Face not recognised");
        return;
      }

      if (data.alreadyEntered) {
        speak("Already entered");
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

      // Clear match -> check in right away ("Thank you").
      await checkInMatched(data);
    } catch (err) {
      speak("Not recognised");
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
  }, [go, onSound, checkInMatched]);

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

  // Oval colour = what is happening: white = waiting for a face, blue =
  // checking, green = let in, amber = already entered, red = not recognised.
  const ringClass =
    status === "success"
      ? "crmQrFaceOval crmQrFaceOvalGreen"
      : status === "checking"
      ? "crmQrFaceOval crmQrFaceOvalBlue"
      : status === "notice" && notice?.tone === "warning"
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
        <div aria-live="polite">
          <div className="crmQrResultState">
            <p className="crmQrResultTitle">Thank you</p>
          </div>
          <div className="crmQrActions">
            <button type="button" className="crmQrBtn crmQrBtnGhost" onClick={resume}>
              Scan Next
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FaceScanPanel;