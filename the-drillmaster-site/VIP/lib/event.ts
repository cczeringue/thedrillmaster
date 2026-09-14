export const EVENT = {
  title: "The Drillmaster",
  date: "2026-10-13",
  time: "7:30 PM",
  timezone: "America/Los_Angeles",
  doors: "7:00 PM",
  end: "8:45 PM",
  venue: "The Elysian",
  address: "1944 Riverside Drive, Los Angeles, CA 90039",
  website: "https://www.thedrillmaster.gay/",
  listing: "https://www.elysiantheater.com/shows/thedrillmaster1013",
  email: "thedrillmasterplay@gmail.com",
} as const;

export type Topic = "play" | "cast" | "venue";
export const topicLabels: Record<Topic, string> = {
  play: "tell me more",
  cast: "who’s in it?",
  venue: "where are we meeting?",
};
