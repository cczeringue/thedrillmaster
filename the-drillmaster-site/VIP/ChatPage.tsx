import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, Check, Send, Ticket, VenetianMask, Volume2, VolumeX } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { EVENT } from "./lib/event";
import { createMessageQueue } from "./lib/message-queue";
import { useMessageSound } from "./lib/use-message-sound";
import { rsvpReceiptSchema, rsvpSchema } from "./lib/rsvp-validation";

type Message = { id: string; side: "baron" | "guest"; text?: string; invitation?: boolean; rsvp?: boolean; delay?: number; action?: () => void };
type RsvpReceipt = { name: string; guests: number; reference: string; emailStatus?: "sent" | "pending" | "failed" };

function Portrait({ header = false }: { header?: boolean }) {
  return <img className={header ? "portrait portrait-header" : "portrait"} src="/VIP/assets/baron.webp" alt={header ? "Portrait of Baron von Steuben" : ""} width={header ? 48 : 32} height={header ? 48 : 32} />;
}

function Bubble({ side = "baron", children, className = "", id }: { side?: "baron" | "guest"; children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`message-row ${side}`}>
    {side === "baron" && <Portrait />}
    <div className={`bubble ${className}`}><span className="sr-only">{side === "baron" ? "Baron: " : "You: "}</span>{children}</div>
  </div>;
}

function RsvpForm({ onSuccess }: { onSuccess: (receipt: RsvpReceipt) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState("1");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submissionId = useRef<string | null>(null);
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const id = submissionId.current ?? crypto.randomUUID();
    submissionId.current = id;
    const parsed = rsvpSchema.safeParse({ id, name, email, guests: Number(guests) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Please check your details."); return; }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/vip-rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json().catch(() => null);
      const saved = rsvpReceiptSchema.safeParse(result);
      if (!response.ok || !saved.success) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "We couldn’t verify your RSVP. Please try again.";
        throw new Error(message);
      }
      onSuccess(saved.data);
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
    <fieldset disabled={busy}>
      <label htmlFor="guest-name">Your name</label>
      <Input className="rsvp-input" id="guest-name" name="name" autoComplete="name" placeholder="Alexander Hamilton" maxLength={100} required value={name} onChange={event => setName(event.target.value)} />
      <label htmlFor="guest-email">Email</label>
      <Input className="rsvp-input" id="guest-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} />
      <label htmlFor="guest-count">Tickets needed</label>
      <Select value={guests} onValueChange={setGuests} disabled={busy}><SelectTrigger id="guest-count" className="rsvp-select"><SelectValue /></SelectTrigger><SelectContent className="party-menu"><SelectItem value="1">1 ticket · just me</SelectItem><SelectItem value="2">2 tickets · me + 1</SelectItem></SelectContent></Select>
    </fieldset>
    <p className="more-tickets">Need more than 2 tickets? <a href={`mailto:${EVENT.email}?subject=The%20Drillmaster%20Creator%27s%20list%20-%20additional%20tickets`}>Email {EVENT.email}</a>.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button className="submit-rsvp" type="submit" disabled={busy}>{busy ? "Adding your name…" : "Add my name"}{!busy && <Send size={17} aria-hidden="true" />}</Button>
    <p className="privacy-copy">We’ll email your confirmation and use your details to manage this invitation.</p>
  </form>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [receipt, setReceipt] = useState<RsvpReceipt | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const readingManually = useRef(false);
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [pending, setPending] = useState(false);
  const { play: playSound, sound, toggle: toggleSound } = useMessageSound();
  const queueRef = useRef<ReturnType<typeof createMessageQueue> | null>(null);

  useEffect(() => {
    // Fresh component state and queue on every page load. Saved RSVPs stay on the server.
    const queue = createMessageQueue((message: Message) => {
      if (message.action) message.action();
      else setMessages(previous => [...previous, message]);
      playSound();
    }, { onPending: (value: boolean) => setPending(value) });
    queueRef.current = queue;
    queue.add(
      { id: "intro-1", side: "guest", text: "hey daddy", delay: 600 },
      { id: "intro-2", side: "baron", text: "Founding Daddy." },
      { id: "intro-3", side: "guest", text: "hosting?" },
      { id: "intro-4", side: "baron", text: "Yes. An entire theatrical production." },
      { id: "intro-5", side: "guest", text: "so... role play?", delay: 1400 },
      { id: "intro-6", side: "baron", text: "Definitely." },
      { id: "invitation", side: "baron", invitation: true, delay: 1300 },
      { id: "intro-8", side: "guest", text: "i’m coming", delay: 8000 },
      { id: "intro-9", side: "baron", text: "so are the British" },
      { id: "rsvp-panel", side: "baron", rsvp: true, delay: 1400 },
    );
    return () => { queue.stop(); queueRef.current = null; };
  }, [playSound]);

  const scrollTo = useCallback((id?: string) => {
    const thread = threadRef.current;
    if (!thread) return;
    const target = id ? document.getElementById(id) : null;
    const top = target ? thread.scrollTop + target.getBoundingClientRect().top - thread.getBoundingClientRect().top - 22 : thread.scrollHeight;
    thread.scrollTo({ top, behavior: reducedMotion() ? "instant" : "smooth" });
  }, []);

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
        <VenetianMask className="mask-mark" size={31} aria-hidden="true" />
      </header>
      <div className="event-strip">
        <strong className="event-premise">The Drillmaster- America's GAYEST founding Daddy</strong>
        <span className="event-format">A developmental preview</span>
        <div className="event-logistics"><Ticket size={15} aria-hidden="true" /><span>OCT 13 <span className="strip-dot">·</span> 7:30 PM <span className="strip-dot">·</span> THE ELYSIAN</span></div>
      </div>
      <div className="chat-thread" ref={threadRef} tabIndex={0}
        onWheel={() => { readingManually.current = true; }}
        onTouchMove={() => { readingManually.current = true; }}
        onKeyDown={event => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) readingManually.current = true; }} aria-label="Your invitation. Scroll to read the messages and RSVP form.">
        <div className="day-label">Today</div>
        <div className="message-stack">
          {messages.map(message => <Bubble key={message.id} id={message.id} side={message.side} className={message.invitation ? "invitation-bubble" : message.rsvp ? "detail-bubble rsvp-bubble" : ""}>
            {message.invitation ? <><p className="invite-intro">Jenny Zigrino, Caleb Zeringue, and Jeffrey Jay cordially invite you to</p><h2>THE DRILLMASTER</h2><p className="invite-date">October 13 <span>•</span> 7:30 PM</p><p className="invite-venue">The Elysian, Los Angeles</p><a className="invite-poster-link" href="/VIP/assets/elysian-announcement.png" target="_blank" rel="noopener noreferrer" aria-label="Open The Drillmaster announcement poster"><img className="invite-poster" src="/VIP/assets/elysian-announcement.png" alt="The Drillmaster developmental preview at The Elysian, October 13 at 7:30 PM, with the ensemble cast." width="2160" height="2700" /></a></>
            : message.rsvp ? receipt ? <div className="confirmation" role="status"><span className="confirmation-icon"><Check size={24} aria-hidden="true" /></span><span className="eyebrow">Name added</span><h2>You’re on the Creator's list.</h2><p>Thank you, {receipt.name}. We’ve added your name for {receipt.guests === 1 ? "one ticket" : "two tickets"}.</p><p>Your tickets will be available for you at no charge at the door. We can’t wait to make a scene.</p>{receipt.emailStatus && <p className="confirmation-note">{receipt.emailStatus === "sent" ? "Your confirmation email is on its way, with the poster and calendar link. Check spam if you don’t see it." : "Your name is on the list, but we couldn’t confirm email delivery. Save the details below, or contact the team for a copy."}</p>}<div className="confirmation-event"><strong>THE DRILLMASTER</strong><strong>October 13 · 7:30 PM</strong><span>The Elysian, Los Angeles</span></div><a className="text-link" href="/VIP/assets/the-drillmaster.ics" download><CalendarDays size={17} aria-hidden="true" />Add to calendar</a><p className="confirmation-note">Need to change your request? <a href={`mailto:${EVENT.email}?subject=Creator%27s%20list%20RSVP%20-%20${encodeURIComponent(receipt.reference)}`}>Contact the team</a>.</p></div>
            : <RsvpForm onSuccess={result => { queueRef.current?.add({ id: "rsvp-received", side: "baron", delay: 300, action: () => { setReceipt(result); setAnnouncement("Your name has been added to the Creator's list. Your tickets will be available at no charge at the door."); window.setTimeout(() => scrollTo("rsvp-panel"), 80); } }); }} />
            : message.text}
          </Bubble>)}
        </div>
        {pending && <div className="typing-indicator" aria-label="A message is on its way"><span /><span /><span /></div>}
        <div className="thread-end"><VenetianMask size={18} aria-hidden="true" /><span>History. But make it a date.</span></div>
      </div>
      <div className="audio-controls"><button className="sound-toggle" type="button" onClick={toggleSound} aria-label={sound === "on" ? "Mute message sounds" : "Enable message sounds"}>{sound === "on" ? <Volume2 size={15} /> : <VolumeX size={15} />}{sound === "blocked" ? "Tap for sound" : sound === "on" ? "Sound on" : "Sound off"}</button></div>
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    </section>
    <aside className="desktop-date" aria-hidden="true"><span>OCTOBER 13</span><span>LOS ANGELES · 2026</span></aside>
  </main>;
}
