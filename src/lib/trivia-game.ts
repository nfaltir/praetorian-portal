/*
  Praetorian Trivia rules: action cards, twists and a fair shuffle.
  Pure logic with no UI, shared by the game screen.

  - Shuffles use the browser's cryptographic random source, so no card
    order is predictable or repeats in a pattern.
  - A deck is every active question plus about one action card for every
    four questions, never starting on an action card.
  - Question cards may carry a twist, decided when the card is drawn.
*/

export type DeckQuestion = { id: string; question: string; answer: string };

export type Twist = {
  id: string;
  name: string;
  rule: string; // shown on the card
  onMiss: string;
  onHit: string;
};

export type ActionCard = {
  id: string;
  title: string;
  text: string;
  answer?: string; // revealed on request, for quick-fire challenges
};

export type Draw =
  | { kind: "question"; card: DeckQuestion; twist: Twist | null }
  | { kind: "action"; card: ActionCard };

const BASE_MISS = "Take a sip.";
const BASE_HIT = "Your call: take a sip or skip it.";

export const TWIST_CHANCE = 35; // percent of question cards that get a twist

export const TWISTS: Twist[] = [
  {
    id: "double",
    name: "Double down",
    rule: "Miss it and it's two sips.",
    onMiss: "Take two sips.",
    onHit: BASE_HIT,
  },
  {
    id: "buddy",
    name: "Drinking buddy",
    rule: "Miss it and you pick someone to drink with you.",
    onMiss: "Take a sip, and pick a buddy to sip with you.",
    onHit: BASE_HIT,
  },
  {
    id: "steal",
    name: "Steal",
    rule: "Miss it and whoever shouts the right answer first hands out a sip.",
    onMiss: "Take a sip. Whoever shouted the right answer first hands out one more.",
    onHit: BASE_HIT,
  },
  {
    id: "hotseat",
    name: "Hot seat",
    rule: "Get it right and you hand out a sip to anyone.",
    onMiss: BASE_MISS,
    onHit: "Hand out a sip to anyone in the circle.",
  },
  {
    id: "lifeline",
    name: "Lifeline",
    rule: "You may ask one person for help. Miss it and you both sip.",
    onMiss: "You and your lifeline each take a sip.",
    onHit: BASE_HIT,
  },
];

export const ACTIONS: ActionCard[] = [
  { id: "cheers", title: "Cheers!", text: "Everyone raises a glass to the Class of 2010 and takes a sip." },
  { id: "reverse", title: "Reverse", text: "From now on, pass the phone the other way around the circle." },
  { id: "rule", title: "Make a rule", text: "Invent a rule for the rest of the game. Anyone who breaks it takes a sip." },
  { id: "moderator", title: "Moderator's pick", text: "The moderator chooses someone to take a sip." },
  { id: "pass", title: "Free pass", text: "You're safe this round. Pass the phone." },
  {
    id: "states",
    title: "Lightning round",
    text: "Name the four states of the FSM in five seconds, or take a sip.",
    answer: "Chuuk, Kosrae, Pohnpei and Yap",
  },
  { id: "story", title: "Story time", text: "Tell a 30-second Xavier memory, or take a sip." },
  { id: "water", title: "Water break", text: "Everyone takes a sip of water. Yes, water." },
];

/* Unbiased random integer in [0, n), from the cryptographic source */
export function randomInt(n: number): number {
  if (n <= 1) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    const v = buf[0] ?? 0;
    if (v < limit) return v % n;
  }
}

/* Fisher-Yates shuffle; returns a new array */
export function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

/* A deck is a list of keys: "q:<question id>" or "a:<action id>" */
export function buildDeck(questions: readonly DeckQuestion[]): string[] {
  const deck = shuffle(questions.map((q) => `q:${q.id}`));
  if (deck.length === 0) return deck;
  const count = Math.min(ACTIONS.length, Math.max(1, Math.round(deck.length / 4)));
  for (const action of shuffle(ACTIONS).slice(0, count)) {
    // Never at position 0: the first card of a game is always a question
    deck.splice(1 + randomInt(deck.length), 0, `a:${action.id}`);
  }
  return deck;
}

/* Turn a key into a card. Returns null for a question that no longer exists. */
export function resolve(key: string, questions: readonly DeckQuestion[]): Draw | null {
  if (key.startsWith("a:")) {
    const card = ACTIONS.find((a) => a.id === key.slice(2));
    return card ? { kind: "action", card } : null;
  }
  const card = questions.find((q) => q.id === key.slice(2));
  if (!card) return null;
  const twist = randomInt(100) < TWIST_CHANCE ? (TWISTS[randomInt(TWISTS.length)] ?? null) : null;
  return { kind: "question", card, twist };
}

export function outcome(draw: Extract<Draw, { kind: "question" }>, hit: boolean): string {
  if (!draw.twist) return hit ? BASE_HIT : BASE_MISS;
  return hit ? draw.twist.onHit : draw.twist.onMiss;
}
