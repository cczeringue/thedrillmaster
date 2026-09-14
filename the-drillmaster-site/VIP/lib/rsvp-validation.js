import { z } from "zod";

export const rsvpSchema = z.object({
  id: z.string().uuid("Please refresh the page and try again."),
  name: z.string().trim().min(1, "Please enter your name.").max(100, "Please keep your name under 100 characters."),
  email: z.string().trim().toLowerCase().max(254, "Please use a shorter email address.").email("Please enter a valid email address."),
  guests: z.number().int().min(1, "Choose one or two guests.").max(2, "Choose one or two guests."),
}).strict();

export const rsvpReceiptSchema = z.object({
  ok: z.literal(true),
  reference: z.string().uuid(),
  name: z.string().min(1).max(100),
  guests: z.number().int().min(1).max(2),
});
