import { useEffect, useState } from "react";
import "../assets/CSS/TopProgressLoader.css";

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

  if (!loading) return null;

  return <div className="topProgressLoader" />;
};

export default TopProgressLoader;