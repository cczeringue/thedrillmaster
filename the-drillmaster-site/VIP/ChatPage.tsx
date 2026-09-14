import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowUpRight, CalendarDays, Check, ChevronRight, EllipsisVertical, MapPin, Send, Ticket, VenetianMask, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { EVENT, type Topic, topicLabels } from "./lib/event";
import { rsvpReceiptSchema, rsvpSchema } from "./lib/rsvp-validation";

type Message = { id: string; side: "baron" | "guest"; text?: string; topic?: Topic | "help" };
type RsvpReceipt = { name: string; guests: number; reference: string };
type McpTool = {
  name: string; title: string; description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }>;
};
type ModelContext = { registerTool: (tool: McpTool, options?: { signal?: AbortSignal }) => void | Promise<void> };

function Portrait({ header = false }: { header?: boolean }) {
  return <img className={header ? "portrait portrait-header" : "portrait"} src="/VIP/assets/baron.webp" alt={header ? "Portrait of Baron von Steuben" : ""} width={header ? 48 : 32} height={header ? 48 : 32} />;
}

function Bubble({ side = "baron", children, className = "", id }: { side?: "baron" | "guest"; children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`message-row ${side}`}>
    {side === "baron" && <Portrait />}
    <div className={`bubble ${className}`}><span className="sr-only">{side === "baron" ? "Baron: " : "You: "}</span>{children}</div>
  </div>;
}

function OutsideLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={16} aria-hidden="true" /></a>;
}

function TopicReply({ topic, onRsvp }: { topic: Topic | "help"; onRsvp: () => void }) {
  if (topic === "play") return <>
    <span className="eyebrow">The play</span>
    <h2>America’s founding daddy<br />has entered the chat.</h2>
    <p>It’s 1778. The Continental Army is a mess. Enter Baron von Steuben: a Prussian immigrant with a flair for discipline, a questionable résumé, and a very big job.</p>
    <p><em>The Drillmaster</em> is a queer historical comedy about the unlikely man who helps turn a ragtag militia into an army.</p>
    <div className="detail-divider" />
    <p className="small-copy">Join us for a developmental staged reading of the revised play, back in Los Angeles for one night.</p>
    <OutsideLink href={EVENT.website}>Meet The Drillmaster</OutsideLink>
    <Button className="bubble-action" onClick={onRsvp}>I’d like to RSVP <ArrowUpRight size={17} /></Button>
  </>;
  if (topic === "cast") return <>
    <span className="eyebrow">The company</span>
    <h2>Quite the ensemble.</h2>
    <dl className="cast-list">
      <div><dt>Jenny Zigrino</dt><dd>Baron von Steuben</dd></div>
      <div><dt>Caleb Zeringue</dt><dd>Alexander Hamilton</dd></div>
      <div><dt>Jeffrey Jay</dt><dd>Du Ponceau</dd></div>
    </dl>
    <p className="small-copy">Conceived by Jenny Zigrino and Caleb Zeringue. Written by Jenny Zigrino, Caleb Zeringue, and Jeffrey Jay.</p>
    <OutsideLink href={EVENT.website}>About the company</OutsideLink>
  </>;
  if (topic === "venue") return <>
    <span className="eyebrow">Your rendezvous</span>
    <h2>The Elysian</h2>
    <div className="logistics-row"><CalendarDays size={20} aria-hidden="true" /><div><strong>Tuesday, October 13, 2026</strong><span>Show 7:30 PM · Doors 7:00 PM</span><span>All times Los Angeles local time</span></div></div>
    <div className="logistics-row"><MapPin size={20} aria-hidden="true" /><div><strong>1944 Riverside Drive</strong><span>Los Angeles, CA 90039</span></div></div>
    <p className="small-copy">General seating begins at 7:15 PM. The reading is scheduled to end at 8:45 PM.</p>
    <div className="link-stack"><OutsideLink href="https://www.google.com/maps/search/?api=1&query=The+Elysian+1944+Riverside+Drive+Los+Angeles+CA+90039">Get directions</OutsideLink><OutsideLink href={EVENT.listing}>Official venue listing</OutsideLink><a className="text-link" href="/VIP/assets/the-drillmaster.ics" download><CalendarDays size={16} aria-hidden="true" />Add to calendar</a></div>
  </>;
  return <><p>My specialties? Theatrics, logistics, and a very good invitation.</p><p>Ask me about the play, the cast, getting there, or how to RSVP. The replies below work, too.</p></>;
}

function RsvpForm({ onSuccess, onClose }: { onSuccess: (receipt: RsvpReceipt) => void; onClose: () => void }) {
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
      try { sessionStorage.setItem("drillmaster-vip-receipt", JSON.stringify(saved.data)); } catch {}
      onSuccess(saved.data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your RSVP hasn’t been saved. Please try again.");
    } finally { submitting.current = false; setBusy(false); }
  }

  return <form className="rsvp-form" onSubmit={submit} aria-labelledby="rsvp-heading">
    <div className="form-heading"><span className="eyebrow">Your VIP invitation</span><button type="button" className="close-form" aria-label="Close RSVP form" onClick={onClose} disabled={busy}><X size={19} /></button></div>
    <h2 id="rsvp-heading">Make it a date.</h2>
    <p className="form-intro">Leave your details. The team will confirm your place for October 13.</p>
    <fieldset disabled={busy}>
      <label htmlFor="guest-name">Your name</label>
      <Input className="rsvp-input" id="guest-name" name="name" autoComplete="name" placeholder="Alexander Hamilton" maxLength={100} required value={name} onChange={event => setName(event.target.value)} />
      <label htmlFor="guest-email">Email</label>
      <Input className="rsvp-input" id="guest-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} />
      <label htmlFor="guest-count">Who’s coming?</label>
      <Select value={guests} onValueChange={setGuests} disabled={busy}><SelectTrigger id="guest-count" className="rsvp-select"><SelectValue /></SelectTrigger><SelectContent className="party-menu"><SelectItem value="1">Just me</SelectItem><SelectItem value="2">Me + 1 · guest request</SelectItem></SelectContent></Select>
    </fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button className="submit-rsvp" type="submit" disabled={busy}>{busy ? "Sending your RSVP…" : "Send my RSVP"}{!busy && <Send size={17} aria-hidden="true" />}</Button>
    <p className="privacy-copy">Your details are used to manage this invitation. An RSVP is a request; the team will confirm availability.</p>
  </form>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [showRsvp, setShowRsvp] = useState(false);
  const [receipt, setReceipt] = useState<RsvpReceipt | null>(null);
  const [unread, setUnread] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  const openTopics = useRef(new Set<Topic>());
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    try {
      const saved = rsvpReceiptSchema.safeParse(JSON.parse(sessionStorage.getItem("drillmaster-vip-receipt") ?? "null"));
      if (saved.success) setReceipt(saved.data);
    } catch {}
  }, []);

  const scrollTo = useCallback((id?: string) => {
    const thread = threadRef.current;
    if (!thread) return;
    const target = id ? document.getElementById(id) : null;
    const top = target ? thread.scrollTop + target.getBoundingClientRect().top - thread.getBoundingClientRect().top - 22 : thread.scrollHeight;
    thread.scrollTo({ top, behavior: reducedMotion() ? "instant" : "smooth" });
  }, []);

  const chooseTopic = useCallback((topic: Topic, prompt?: string) => {
    if (openTopics.current.has(topic)) { scrollTo(`topic-${topic}`); return; }
    openTopics.current.add(topic);
    const id = ++sequence.current;
    setMessages(previous => [...previous, { id: `question-${id}`, side: "guest", text: prompt ?? topicLabels[topic] }, { id: `topic-${topic}`, side: "baron", topic }]);
    setAnnouncement(`The Baron has replied about ${topic === "venue" ? "the venue" : `the ${topic}`}.`);
    window.setTimeout(() => scrollTo(`question-${id}`), 80);
  }, [scrollTo]);

  const startRsvp = useCallback(() => {
    setShowRsvp(true);
    window.setTimeout(() => {
      scrollTo("rsvp-panel");
      if (!receipt) formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    }, 80);
  }, [receipt, scrollTo]);

  useEffect(() => {
    const controller = new AbortController();
    const modelContext = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!modelContext) return;
    const output = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data) }] });
    const registrations: McpTool[] = [
      { name: "get_play_details", title: "Read The Drillmaster invitation", description: "Read verified play, date, venue and RSVP information.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: async () => output({ ...EVENT, rsvp: "RSVP requests are saved; the production team confirms availability." }) },
      { name: "show_chat_topic", title: "Ask the Baron about the show", description: "Open a chat reply about the play, cast or venue.", inputSchema: { type: "object", properties: { topic: { type: "string", enum: ["play", "cast", "venue"] } }, required: ["topic"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (input) => { const topic = input && typeof input === "object" && "topic" in input ? input.topic : null; if (topic !== "play" && topic !== "cast" && topic !== "venue") return { ...output({ error: "Choose play, cast or venue." }), isError: true }; chooseTopic(topic); return output({ opened: topic }); } },
      { name: "open_vip_rsvp", title: "Open the VIP RSVP form", description: "Open the RSVP form for the visitor to complete. This does not submit an RSVP.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async () => { startRsvp(); return output({ opened: "RSVP form", submitted: false }); } },
    ];
    registrations.forEach(tool => { try { Promise.resolve(modelContext.registerTool(tool, { signal: controller.signal })).catch(() => {}); } catch {} });
    return () => controller.abort();
  }, [chooseTopic, startRsvp]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    if (/rsvp|coming|attend|guest|ticket|join|reserve|sign.?up/i.test(value)) { startRsvp(); return; }
    if (/where|when|time|date|address|elysian|venue|park|direction|door/i.test(value)) { chooseTopic("venue", value); return; }
    if (/cast|actor|who|jenny|caleb|jeffrey|writer|star/i.test(value)) { chooseTopic("cast", value); return; }
    if (/play|show|about|story|more|drill|baron|hi\b|hello|hey|sup/i.test(value)) { chooseTopic("play", value); return; }
    const id = ++sequence.current;
    setMessages(previous => [...previous, { id: `question-${id}`, side: "guest", text: value }, { id: `help-${id}`, side: "baron", topic: "help" }]);
    setAnnouncement("The Baron has replied. Choose the play, cast, venue, or RSVP.");
    window.setTimeout(() => scrollTo(`question-${id}`), 80);
  }

  function checkScroll() {
    const thread = threadRef.current;
    if (thread) setUnread(thread.scrollHeight - thread.scrollTop - thread.clientHeight > 220);
  }

  useEffect(() => { checkScroll(); }, [messages, showRsvp, receipt]);

  return <main className="experience">
    <aside className="desktop-caption" aria-hidden="true"><span>THE DRILLMASTER</span><span>A VERY PERSONAL INVITATION.</span></aside>
    <section className="chat-shell" aria-label="Your VIP invitation from Baron von Steuben">
      <header className="chat-header">
        <button className="icon-button back-button" aria-label="Back to the start of the chat" onClick={() => threadRef.current?.scrollTo({ top: 0, behavior: reducedMotion() ? "instant" : "smooth" })}><ArrowLeft size={23} /></button>
        <Portrait header />
        <div className="contact"><h1>Baron von Steuben</h1><div className="online"><span />Online <span className="contact-divider">·</span><span className="vip-label">VIP invitation</span></div></div>
        <VenetianMask className="mask-mark" size={31} aria-hidden="true" />
        <DropdownMenu><DropdownMenuTrigger asChild><button className="icon-button menu-trigger" aria-label="More chat options"><EllipsisVertical size={23} /></button></DropdownMenuTrigger><DropdownMenuContent className="chat-menu" align="end"><DropdownMenuItem onSelect={() => chooseTopic("play")}>About the play</DropdownMenuItem><DropdownMenuItem onSelect={() => chooseTopic("cast")}>Meet the cast</DropdownMenuItem><DropdownMenuItem onSelect={() => chooseTopic("venue")}>Venue & directions</DropdownMenuItem><DropdownMenuItem onSelect={startRsvp}>{receipt ? "View my RSVP" : "RSVP"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem asChild><a href={EVENT.website} target="_blank" rel="noopener noreferrer">Official show website <ArrowUpRight size={15} /></a></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </header>
      <button className="event-strip" onClick={() => scrollTo("invitation")} aria-label="View invitation for October 13 at 7:30 PM"><Ticket size={15} aria-hidden="true" /><span>OCT 13 <span className="strip-dot">·</span> 7:30 PM <span className="strip-dot">·</span> THE ELYSIAN</span><ChevronRight size={15} aria-hidden="true" /></button>
      <div className="chat-thread" ref={threadRef} onScroll={checkScroll} tabIndex={0} aria-label="Conversation. Scroll for messages and play details.">
        <div className="day-label">Today</div>
        <div className="message-stack">
          <Bubble side="guest">hey daddy</Bubble>
          <Bubble>Founding Daddy.</Bubble>
          <Bubble side="guest">hosting?</Bubble>
          <Bubble>Yes. An entire theatrical production.</Bubble>
          <Bubble side="guest">so... role play?</Bubble>
          <Bubble>Definitely.</Bubble>
          <Bubble id="invitation" className="invitation-bubble"><p className="invite-intro">You’re invited:</p><h2>THE DRILLMASTER</h2><p className="invite-date">October 13 <span>•</span> 7:30 PM</p><p className="invite-venue">The Elysian, Los Angeles</p><button className="invite-more" onClick={() => chooseTopic("play")}>There’s a story here <ArrowUpRight size={17} aria-hidden="true" /></button></Bubble>
          <Bubble side="guest">i’m coming</Bubble>
          <Bubble>so are the British</Bubble>
        </div>
        <div className="read-receipt">An invitation from The Drillmaster</div>
        <div className="conversation-divider"><span>Your evening, sorted.</span></div>
        <div className="message-stack replies">
          <Bubble>Consider this your personal invitation. Want the details, or shall I put your name down?</Bubble>
          {messages.map(message => <Bubble key={message.id} id={message.id} side={message.side} className={message.topic ? "detail-bubble" : ""}>{message.topic ? <TopicReply topic={message.topic} onRsvp={startRsvp} /> : message.text}</Bubble>)}
          {showRsvp && <div id="rsvp-panel" ref={formRef}><Bubble className="detail-bubble rsvp-bubble">{receipt ? <div className="confirmation" role="status"><span className="confirmation-icon"><Check size={24} aria-hidden="true" /></span><span className="eyebrow">RSVP received</span><h2>A date with history.</h2><p>Thank you, {receipt.name}. We’ve received your request for {receipt.guests === 1 ? "one place" : "two places"}.</p><p>The team will confirm availability. We can’t wait to make a scene.</p><div className="confirmation-event"><strong>THE DRILLMASTER</strong><strong>October 13 · 7:30 PM</strong><span>The Elysian, Los Angeles</span></div><a className="text-link" href="/VIP/assets/the-drillmaster.ics" download><CalendarDays size={17} aria-hidden="true" />Add to calendar</a><p className="confirmation-note">Need to change your request? <a href={`mailto:${EVENT.email}?subject=VIP%20RSVP%20-%20${encodeURIComponent(receipt.reference)}`}>Contact the team</a>.</p></div> : <RsvpForm onClose={() => setShowRsvp(false)} onSuccess={result => { setReceipt(result); setAnnouncement("Your RSVP request has been saved. The team will confirm availability."); window.setTimeout(() => scrollTo("rsvp-panel"), 80); }} />}</Bubble></div>}
        </div>
        <div className="thread-end"><VenetianMask size={18} aria-hidden="true" /><span>History. But make it a date.</span></div>
      </div>
      <div className="composer-area">
        {unread && <button className="jump-latest" aria-label="Scroll to the latest messages" onClick={() => scrollTo()}><ArrowDown size={20} /></button>}
        <div className="quick-replies" aria-label="Suggested replies"><button onClick={() => chooseTopic("play")}>The play</button><button onClick={() => chooseTopic("cast")}>The cast</button><button onClick={() => chooseTopic("venue")}>Getting there</button><button className="rsvp-shortcut" onClick={startRsvp}>{receipt ? <Check size={15} aria-hidden="true" /> : <Ticket size={15} aria-hidden="true" />}{receipt ? "My RSVP" : "RSVP"}</button></div>
        <form className="composer" onSubmit={sendMessage}><Input aria-label="Message the Baron about the play, cast, venue, or RSVP" placeholder="Say something…" value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} className="composer-input" /><button type="submit" aria-label="Send message" disabled={!draft.trim()} className="send-button"><Send size={21} aria-hidden="true" /></button></form>
        <p className="composer-hint">Ask about the play, the cast, the venue, or your RSVP.</p>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    </section>
    <aside className="desktop-date" aria-hidden="true"><span>OCTOBER 13</span><span>LOS ANGELES · 2026</span></aside>
  </main>;
}
