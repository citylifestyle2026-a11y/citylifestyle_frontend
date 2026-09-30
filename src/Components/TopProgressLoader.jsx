import { useEffect, useState } from "react";
import "../assets/CSS/TopProgressLoader.css";

// Safety net: whatever happens to a request, the bar is never shown longer
// than this (the axios timeout is 30s, a bar spinning that long looks stuck).
const MAX_VISIBLE_MS = 12000;

const TopProgressLoader = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleStop = () => setLoading(false);

    window.addEventListener("api-loading-start", handleStart);
    window.addEventListener("api-loading-stop", handleStop);

    return () => {
      window.removeEventListener("api-loading-start", handleStart);
      window.removeEventListener("api-loading-stop", handleStop);
    };
  }, []);

  useEffect(() => {
    if (!loading) return undefined;
    const timerId = setTimeout(() => setLoading(false), MAX_VISIBLE_MS);
    return () => clearTimeout(timerId);
  }, [loading]);

  if (!loading) return null;

  return <div className="topProgressLoader" />;
};

export default TopProgressLoader;