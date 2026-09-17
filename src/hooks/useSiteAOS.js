import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

/**
 * Converted from the inline <script> block repeated on every old marketing
 * page:
 *   AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 80 });
 *
 * Requires the "aos" package (same version/CDN behavior as before, now as an
 * npm dependency): `npm install aos`
 */
export default function useSiteAOS() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-out-cubic",
      once: true,
      offset: 80,
    });
    AOS.refresh();
  }, []);
}
