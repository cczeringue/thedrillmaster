import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, CalendarDays, Check, Info, MapPin, Send, Ticket, Users, Volume2, VolumeX } from "lucide-react";
import { AmericanFlagMark } from "./components/AmericanFlagMark";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { EVENT } from "./lib/event";
import { createMessageQueue } from "./lib/message-queue";
import { INTRO_MESSAGES } from "./lib/intro-messages";
import { useMessageSound } from "./lib/use-message-sound";
import { rsvpSchema } from "./lib/rsvp-validation";
import { clearPendingSubmission, getSubmissionId, submitRsvp } from "./lib/submit-rsvp";

type Message = { id: string; side: "baron" | "guest"; text?: string; invitation?: boolean; rsvp?: boolean; delay?: number; action?: () => void };
type Section = "details" | "cast" | "rsvp";
type RsvpReceipt = { name: string; guests: number; reference: string; emailStatus?: "sent" | "pending" | "failed" };

function Portrait({ header = false }: { header?: boolean }) {
  return <img className={header ? "portrait portrait-header" : "portrait"} src="/VIP/assets/baron.webp" alt={header ? "Portrait of Baron von Steuben" : ""} width={header ? 48 : 32} height={header ? 48 : 32} />;
}

function Bubble({ side = "baron", children, className = "", id }: { side?: "baron" | "guest"; children: ReactNode; className?: string; id?: string }) {
  return <div id={id} tabIndex={id ? -1 : undefined} className={`message-row ${side}`}>
    {side === "baron" && <Portrait />}
    <div className={`bubble ${className}`}><span className="sr-only">{side === "baron" ? "Baron: " : "You: "}</span>{children}</div>
  </div>;
}

const CAST = [
  ["Jenny Zigrino", "The Baron"],
  ["Caleb Zeringue", "Alexander Hamilton"],
  ["Jeffrey Jay", "Pierre DuPonceau"],
  ["Dylan Adler", "William North"],
  ["Guy Branum", "Thomas Conway"],
  ["Jeremy Crittenden", "John Laurens"],
  ["Chad Damiani", "The Narrator"],
  ["Emon Elboudwarej", "Harbottle / Benjamin Franklin"],
  ["Leslie Liao", "Increase / Woman"],
  ["Mary Lynn Rajskub", "George Washington"],
  ["Beth Stelling", "Benjamin Walker"],
] as const;

function InvitationDetails({ section }: { section: "details" | "cast" }) {
  if (section === "cast") return <>
    <span className="eyebrow">The company</span>
    <h2>Quite the ensemble.</h2>
    <dl className="cast-list">{CAST.map(([name, role]) => <div key={name}><dt>{name}</dt><dd>{role}</dd></div>)}</dl>
    <p className="detail-note">Written by Jenny Zigrino, Caleb Zeringue, and Jeffrey Jay. Executive producer: Kimmie Kim.</p>
    <a className="text-link" href={`${EVENT.website}#team`} target="_blank" rel="noopener noreferrer">Meet the cast <ArrowUpRight size={16} aria-hidden="true" /></a>
  </>;
  return <>
    <span className="eyebrow">Your evening, sorted</span>
    <h2>A date with history.</h2>
    <p>The mostly true story of America's GAYEST founding Daddy. A developmental preview of <strong>The Drillmaster</strong>, a queer historical comedy about Baron von Steuben.</p>
    <div className="logistics-row"><CalendarDays size={20} aria-hidden="true" /><div><strong>Tuesday, October 13, 2026</strong><span>Show {EVENT.time} · Doors {EVENT.doors}</span><span>Los Angeles time</span></div></div>
    <div className="logistics-row"><MapPin size={20} aria-hidden="true" /><div><strong>{EVENT.venue}</strong><span>{EVENT.address}</span></div></div>
    <p className="detail-note">Creator's list tickets are available at no charge at the door. Add your name below for one or two tickets.</p>
    <div className="detail-links">
      <a className="text-link" href="https://www.google.com/maps/search/?api=1&query=The+Elysian+1944+Riverside+Drive+Los+Angeles+CA+90039" target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={16} aria-hidden="true" /></a>
      <a className="text-link" href={EVENT.listing} target="_blank" rel="noopener noreferrer">The Elysian <ArrowUpRight size={16} aria-hidden="true" /></a>
      <a className="text-link" href="/VIP/assets/the-drillmaster.ics" download><CalendarDays size={16} aria-hidden="true" />Add to calendar</a>
    </div>
  </>;
}

function RsvpForm({ onSuccess }: { onSuccess: (receipt: RsvpReceipt) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState("1");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submission = useRef<{ id: string; name: string; email: string; guests: number } | null>(null);
  const [detailsLocked, setDetailsLocked] = useState(false);
  const [progress, setProgress] = useState("Adding your name…");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const parsed = rsvpSchema.safeParse(submission.current ?? { id: crypto.randomUUID(), name, email, guests: Number(guests) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Please check your details."); return; }
    submitting.current = true;
    setBusy(true);
    setProgress("Adding your name…");
    setError("");
    try {
      if (!submission.current) {
        const id = await getSubmissionId(parsed.data);
        submission.current = { ...parsed.data, id };
        setDetailsLocked(true);
      }
      const saved = await submitRsvp(submission.current, { onRetry: () => setProgress("Checking your reservation…") });
      clearPendingSubmission(submission.current.id);
      onSuccess(saved);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your RSVP hasn’t been saved. Please try again.");
    } finally { submitting.current = false; setBusy(false); }
  }

  return <form className="rsvp-form" onSubmit={submit} aria-labelledby="rsvp-heading">
    <div className="form-heading"><span className="eyebrow">Your personal invitation</span></div>
    <h2 id="rsvp-heading">Add your name to the Creator's list</h2>
    <p className="form-intro">(Tickets will be available for you at no charge at the door.)</p>
    <div className="form-event" aria-label="Event details">
      <strong>{EVENT.title}</strong>
      <span>Developmental preview</span>
      <strong>Tuesday, October 13, 2026 · {EVENT.time}</strong>
      <span>Doors {EVENT.doors} · Los Angeles time</span>
      <strong>{EVENT.venue}</strong>
      <span>{EVENT.address}</span>
    </div>
    <fieldset disabled={busy || detailsLocked}>
      <label htmlFor="guest-name">Your name</label>
      <Input className="rsvp-input" id="guest-name" name="name" autoComplete="name" placeholder="Alexander Hamilton" maxLength={100} required value={name} onChange={event => setName(event.target.value)} />
      <label htmlFor="guest-email">Email</label>
      <Input className="rsvp-input" id="guest-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} />
      <label htmlFor="guest-count">Tickets needed</label>
      <Select value={guests} onValueChange={setGuests} disabled={busy || detailsLocked}><SelectTrigger id="guest-count" className="rsvp-select"><SelectValue /></SelectTrigger><SelectContent className="party-menu"><SelectItem value="1">1 ticket · just me</SelectItem><SelectItem value="2">2 tickets · me + 1</SelectItem></SelectContent></Select>
    </fieldset>
    <p className="more-tickets">Need more than 2 tickets? <a href={`mailto:${EVENT.email}?subject=The%20Drillmaster%20Creator%27s%20list%20-%20additional%20tickets`}>Email {EVENT.email}</a>.</p>
    {error && <div className="form-error" role="alert"><p>{error}</p>{detailsLocked && <p className="retry-note">Retry uses these same details, so you won’t be added twice.</p>}</div>}
    <Button className="submit-rsvp" type="submit" disabled={busy}>{busy ? progress : error && detailsLocked ? "Try again safely" : "Add my name"}{!busy && <Send size={17} aria-hidden="true" />}</Button>
    <p className="privacy-copy">We’ll email your confirmation and use your details to manage this invitation.</p>
  </form>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const introPlaying = !messages.some(message => message.rsvp);
  const [receipt, setReceipt] = useState<RsvpReceipt | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [openedSections, setOpenedSections] = useState<Array<"details" | "cast">>([]);
  const pendingDestination = useRef<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const readingManually = useRef(false);
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [pending, setPending] = useState(false);
  const { play: playSound, sound, toggle: toggleSound } = useMessageSound();
  const queueRef = useRef<ReturnType<typeof createMessageQueue> | null>(null);

  useEffect(() => {
    // Fresh component state and queue on every page load. Saved RSVPs stay on the server.
    const queue = createMessageQueue((message: Message, immediate = false) => {
      if (message.action) message.action();
      else setMessages(previous => [...previous, message]);
      if (!immediate) playSound();
    }, { onPending: (value: boolean) => setPending(value) });
    queueRef.current = queue;
    queue.add(...INTRO_MESSAGES);
    return () => { queue.stop(); queueRef.current = null; };
  }, [playSound]);

  const scrollTo = useCallback((id?: string, immediate = false) => {
    const thread = threadRef.current;
    if (!thread) return;
    const target = id ? document.getElementById(id) : null;
    const top = target ? thread.scrollTop + target.getBoundingClientRect().top - thread.getBoundingClientRect().top - 22 : thread.scrollHeight;
    thread.scrollTo({ top, behavior: immediate || reducedMotion() ? "instant" : "smooth" });
  }, []);

  const navigateTo = useCallback((section: Section) => {
    readingManually.current = true;
    pendingDestination.current = section === "rsvp" ? "rsvp-panel" : `section-${section}`;
    queueRef.current?.flush();
    if (section !== "rsvp") setOpenedSections(previous => previous.includes(section) ? previous : [...previous, section]);
    setActiveSection(section);
    // Already-visible destinations need no render before navigation.
    const target = document.getElementById(pendingDestination.current);
    if (target) {
      scrollTo(target.id, true);
      target.focus({ preventScroll: true });
      pendingDestination.current = null;
    }
  }, [scrollTo]);

  useEffect(() => {
    const id = pendingDestination.current;
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (!target) return;
      scrollTo(id, true);
      target.focus({ preventScroll: true });
      pendingDestination.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, activeSection, openedSections, scrollTo]);

  useEffect(() => {
    const latest = messages.at(-1);
    if (!latest) return;
    setAnnouncement(latest.text ?? (latest.rsvp ? "Your RSVP form is ready. Enter your name, email, and number of tickets." : "Your invitation has arrived."));
    const timer = window.setTimeout(() => {
      if (!readingManually.current) scrollTo(latest.id);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [messages, scrollTo]);

  return <main className="experience">
    <aside className="desktop-caption" aria-hidden="true"><span>THE DRILLMASTER</span><span>A VERY PERSONAL INVITATION.</span></aside>
    <section className="chat-shell" aria-label="Your Creator's list invitation from Baron von Steuben">
      <header className="chat-header">
        <Portrait header />
        <div className="contact"><h1>Baron von Steuben</h1><div className="invitation-status">Personal invitation</div></div>
        <AmericanFlagMark className="flag-mark" />
      </header>
      <div className="event-strip">
        <strong className="event-premise">The Drillmaster- America's GAYEST founding Daddy</strong>
        <span className="event-format">A developmental preview</span>
        <div className="event-logistics"><Ticket size={15} aria-hidden="true" /><span>OCT 13 <span className="strip-dot">·</span> 7:30 PM <span className="strip-dot">·</span> THE ELYSIAN</span></div>
      </div>
      <div className={`chat-viewport${introPlaying ? " intro-playing" : ""}`}>
      <div className="chat-thread" ref={threadRef} tabIndex={0}
        onFocusCapture={event => { if (event.target !== event.currentTarget) readingManually.current = true; }}
        onWheel={() => { readingManually.current = true; }}
        onTouchMove={() => { readingManually.current = true; }}
        onKeyDown={event => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) readingManually.current = true; }} aria-label="Your invitation. Scroll to read the messages and RSVP form.">
        <div className="day-label">Today</div>
        <div className="message-stack">
          {messages.map(message => <Fragment key={message.id}>
            {message.rsvp && openedSections.map(section => <Bubble key={section} id={`section-${section}`} className="detail-bubble"><InvitationDetails section={section} /></Bubble>)}
            <Bubble id={message.id} side={message.side} className={message.invitation ? "invitation-bubble" : message.rsvp ? "detail-bubble rsvp-bubble" : ""}>
            {message.invitation ? <><p className="invite-intro">Jenny Zigrino, Caleb Zeringue, and Jeffrey Jay cordially invite you to</p><h2>THE DRILLMASTER</h2><p className="invite-date">October 13 <span>•</span> 7:30 PM</p><p className="invite-venue">The Elysian, Los Angeles</p><a className="invite-poster-link" href="/VIP/assets/elysian-announcement.png" target="_blank" rel="noopener noreferrer" aria-label="Open The Drillmaster announcement poster"><img className="invite-poster" src="/VIP/assets/elysian-announcement.png" alt="The Drillmaster developmental preview at The Elysian, October 13 at 7:30 PM, with the ensemble cast." width="2160" height="2700" /></a></>
            : message.rsvp ? receipt ? <div className="confirmation" role="status"><span className="confirmation-icon"><Check size={24} aria-hidden="true" /></span><span className="eyebrow">Name added</span><h2>You’re on the Creator's list.</h2><p>Thank you, {receipt.name}. We’ve added your name for {receipt.guests === 1 ? "one ticket" : "two tickets"}.</p><p>Your tickets will be available for you at no charge at the door. We can’t wait to make a scene.</p>{receipt.emailStatus && <p className="confirmation-note">{receipt.emailStatus === "sent" ? "Your confirmation email is on its way, with the poster and calendar link. Check spam if you don’t see it." : receipt.emailStatus === "pending" ? "Your name is on the list. Your confirmation email may take a moment." : "Your name is on the list, but we couldn’t confirm email delivery. Save the details below, or contact the team for a copy."}</p>}<div className="confirmation-event"><strong>THE DRILLMASTER</strong><strong>October 13 · 7:30 PM</strong><span>The Elysian, Los Angeles</span></div><a className="text-link" href="/VIP/assets/the-drillmaster.ics" download><CalendarDays size={17} aria-hidden="true" />Add to calendar</a><p className="confirmation-note">Need to change your request? <a href={`mailto:${EVENT.email}?subject=Creator%27s%20list%20RSVP%20-%20${encodeURIComponent(receipt.reference)}`}>Contact the team</a>.</p></div>
            : <RsvpForm onSuccess={result => { queueRef.current?.add({ id: "rsvp-received", side: "baron", delay: 300, action: () => { setReceipt(result); setAnnouncement("Your name has been added to the Creator's list. Your tickets will be available at no charge at the door."); window.setTimeout(() => scrollTo("rsvp-panel"), 80); } }); }} />
            : message.text}
          </Bubble></Fragment>)}
        </div>
        {pending && <div className="typing-indicator" aria-label="A message is on its way"><span /><span /><span /></div>}
        <div className="thread-end"><AmericanFlagMark size={22} /><span>History. But make it a date.</span></div>
      </div>
      {introPlaying && <button className="skip-to-rsvp" type="button" onClick={() => navigateTo("rsvp")}>Skip to RSVP<ArrowDown size={16} aria-hidden="true" /></button>}
      </div>
      <footer className="invitation-toolbar">
        <nav className="toolbar-actions" aria-label="Invitation shortcuts">
          <button type="button" className="toolbar-link" onClick={() => navigateTo("details")} aria-current={activeSection === "details" ? "location" : undefined}><Info size={20} aria-hidden="true" /><span>Details</span></button>
          <button type="button" className="toolbar-link" onClick={() => navigateTo("cast")} aria-current={activeSection === "cast" ? "location" : undefined}><Users size={20} aria-hidden="true" /><span>Cast</span></button>
          <button type="button" className="toolbar-rsvp" onClick={() => navigateTo("rsvp")} aria-current={activeSection === "rsvp" ? "location" : undefined}>{receipt ? <Check size={21} aria-hidden="true" /> : <Ticket size={21} aria-hidden="true" />}<span>{receipt ? "My RSVP" : "RSVP"}</span></button>
        </nav>
        <div className="toolbar-meta"><span>Creator's list · No charge</span><button className="sound-toggle" type="button" onClick={toggleSound} aria-label={sound === "on" ? "Mute message sounds" : "Enable message sounds"}>{sound === "on" ? <Volume2 size={15} /> : <VolumeX size={15} />}{sound === "blocked" ? "Tap for sound" : sound === "on" ? "Sound on" : "Sound off"}</button></div>
      </footer>
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    </section>
    <aside className="desktop-date" aria-hidden="true"><span>OCTOBER 13</span><span>LOS ANGELES · 2026</span></aside>
  </main>;
}
