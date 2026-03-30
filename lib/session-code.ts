import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
const generate = customAlphabet(alphabet, 6);

export function generateSessionCode(): string {
  return generate();
}
