import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to top after route changes — or to the element matching the URL
 * hash, if one's present (e.g. the nav's "Get updates" link goes to
 * `/#mailing` rather than a separate route, since the actual signup form
 * lives in the landing page's CTA section). Both cases are handled here,
 * not as two competing effects, so they can't race on the same navigation.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}
