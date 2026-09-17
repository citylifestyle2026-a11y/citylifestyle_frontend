import { useCallback, useEffect, useState } from "react";

/**
 * Converted from the identical "Event Gallery Modal" markup + <script> block
 * duplicated in sparkle.html and parv.html (view-event-btn click -> open
 * modal with that event's image list; prev/next/close by click, overlay
 * click, Escape, and ArrowLeft/ArrowRight). Same behavior, now driven by
 * React state instead of getElementById/classList.
 *
 * Props:
 *  - eventData: { [eventKey]: { title, images: string[] } }
 *  - activeEventKey: string | null  (null/undefined => modal closed)
 *  - onClose: () => void
 */
export default function EventGalleryModal({ eventData, activeEventKey, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const event = activeEventKey ? eventData[activeEventKey] : null;

  useEffect(() => {
    setCurrentIndex(0);
  }, [activeEventKey]);

  useEffect(() => {
    if (!event) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [event]);

  const next = useCallback(() => {
    if (!event) return;
    setCurrentIndex((i) => (i + 1 >= event.images.length ? 0 : i + 1));
  }, [event]);

  const prev = useCallback(() => {
    if (!event) return;
    setCurrentIndex((i) => (i - 1 < 0 ? event.images.length - 1 : i - 1));
  }, [event]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
      if (event) {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [event, next, prev, onClose]);

  if (!event) return null;

  return (
    <div className="event-modal active" id="eventModal">
      <div className="event-modal-overlay" onClick={onClose}></div>

      <div className="event-modal-content">
        <button className="event-close" id="eventClose" onClick={onClose}>&times;</button>

        <button className="gallery-btn gallery-prev" id="galleryPrev" onClick={prev}>&#10094;</button>

        <div className="event-gallery">
          <img id="galleryImage" src={event.images[currentIndex]} alt="Event" />
        </div>

        <button className="gallery-btn gallery-next" id="galleryNext" onClick={next}>&#10095;</button>

        <div className="gallery-info">
          <h2 id="galleryTitle">{event.title}</h2>
          <p id="galleryCounter">{`${currentIndex + 1} / ${event.images.length}`}</p>
        </div>
      </div>
    </div>
  );
}
