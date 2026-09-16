import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { EVENT } from "../lib/event";

export function WebsitePreview({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "slow" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const cleanupFrame = useRef<(() => void) | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => () => cleanupFrame.current?.(), []);
  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(() => setStatus("slow"), 12000);
    return () => window.clearTimeout(timer);
  }, [status, attempt]);

  return <div className="website-preview">
    <iframe key={attempt} className="website-preview__frame" src="/" title="The Drillmaster website" aria-hidden={status !== "ready"} tabIndex={status === "ready" ? 0 : -1} onError={() => setStatus("error")} onLoad={event => {
      cleanupFrame.current?.();
      cleanupFrame.current = null;
      try {
        const frameDocument = event.currentTarget.contentDocument;
        if (!frameDocument?.getElementById("site-nav")) throw new Error("Website unavailable");
        const onKeyDown = (key: KeyboardEvent) => {
          // A bio dialog owns its first Escape; the next Escape can close this drawer.
          if (key.key !== "Escape" || key.defaultPrevented || frameDocument.querySelector('[role="dialog"]:not([hidden]), dialog[open]')) return;
          key.preventDefault();
          closeRef.current();
        };
        frameDocument.addEventListener("keydown", onKeyDown, true);
        cleanupFrame.current = () => frameDocument.removeEventListener("keydown", onKeyDown, true);
        setStatus("ready");
      } catch { setStatus("error"); }
    }} />
    {status !== "ready" && <div className="website-preview__status">
      <p role="status">{status === "loading" ? "Loading The Drillmaster…" : status === "slow" ? "The website is taking a little longer to load." : "The website couldn’t load just now."}</p>
      {status !== "loading" && <div className="website-preview__recovery">
        <button type="button" onClick={() => { setStatus("loading"); setAttempt(previous => previous + 1); }}><RefreshCw size={17} aria-hidden="true" />Try again</button>
        <a href={EVENT.website} target="_blank" rel="noopener noreferrer">Open website in a new tab<ExternalLink size={16} aria-hidden="true" /></a>
      </div>}
    </div>}
  </div>;
}
