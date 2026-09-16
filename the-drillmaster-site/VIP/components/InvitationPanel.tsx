import { useRef, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { ArrowLeft, Globe, Info, Ticket, Users, X } from "lucide-react";

type InvitationPanelProps = {
  open: boolean;
  section: "details" | "cast" | "website";
  introPlaying: boolean;
  hasReceipt: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  onRsvp: () => void;
  children: ReactNode;
};

export function InvitationPanel({ open, section, introPlaying, hasReceipt, onOpenChange, onCloseAutoFocus, onRsvp, children }: InvitationPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="info-panel-overlay" />
      <Dialog.Content className={`info-panel${section === "website" ? " info-panel--website" : ""}`} id="invitation-info-panel" onOpenAutoFocus={event => {
        event.preventDefault();
        titleRef.current?.focus({ preventScroll: true });
      }} onCloseAutoFocus={onCloseAutoFocus}>
        <header className="info-panel__header">
          <div>
            <Dialog.Title className="info-panel__title" ref={titleRef} tabIndex={-1}>
              {section === "website" ? <Globe size={21} aria-hidden="true" /> : section === "cast" ? <Users size={21} aria-hidden="true" /> : <Info size={21} aria-hidden="true" />}
              {section === "website" ? "The Drillmaster" : section === "cast" ? "Cast" : "Details"}
            </Dialog.Title>
            <Dialog.Description className="info-panel__description">{introPlaying ? "Chat paused. Pick up where you left off." : "Your invitation to The Drillmaster."}</Dialog.Description>
          </div>
          <Dialog.Close className="info-panel__close" aria-label="Close panel"><X size={22} aria-hidden="true" /></Dialog.Close>
        </header>
        <div className={`info-panel__body${section === "website" ? " info-panel__body--website" : ""}`} tabIndex={section === "website" ? undefined : 0} aria-label={section === "website" ? undefined : section === "cast" ? "Cast and roles" : "Event details"}>{children}</div>
        <footer className="info-panel__footer">
          <Dialog.Close className="info-panel__back"><ArrowLeft size={18} aria-hidden="true" />Back to chat</Dialog.Close>
          <button type="button" className="toolbar-rsvp" onClick={onRsvp}><Ticket size={20} aria-hidden="true" />{hasReceipt ? "My RSVP" : "RSVP"}</button>
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
