/** @type {ReadonlyArray<{id: string, side: 'guest' | 'baron', text?: string, invitation?: boolean, rsvp?: boolean, delay: number}>} */
export const INTRO_MESSAGES = [
  { id: 'intro-1', side: 'guest', text: 'hey daddy', delay: 600 },
  { id: 'intro-2', side: 'baron', text: 'Founding Daddy.', delay: 1000 },
  { id: 'intro-3', side: 'guest', text: 'hosting?', delay: 1000 },
  { id: 'intro-4', side: 'baron', text: 'Yes. An entire theatrical production.', delay: 1000 },
  { id: 'intro-5', side: 'guest', text: 'so... role play?', delay: 1400 },
  { id: 'intro-6', side: 'baron', text: 'Definitely.', delay: 1000 },
  { id: 'invitation', side: 'baron', invitation: true, delay: 1300 },
  { id: 'intro-8', side: 'guest', text: 'i’m coming', delay: 8000 },
  { id: 'intro-9', side: 'baron', text: 'so are the British', delay: 1000 },
  { id: 'rsvp-panel', side: 'baron', rsvp: true, delay: 1400 },
];
