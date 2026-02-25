import { nanoid } from "nanoid";

const ADJECTIVES = [
  "Blue", "Red", "Green", "Gold", "Silver",
  "Quick", "Calm", "Bold", "Bright", "Cool",
  "Swift", "Warm", "Keen", "Wise", "Brave",
  "Lucky", "Crisp", "Fresh", "Kind", "Neat",
];

const ANIMALS = [
  "Fox", "Owl", "Bear", "Wolf", "Hawk",
  "Deer", "Lynx", "Panda", "Tiger", "Eagle",
  "Otter", "Raven", "Falcon", "Heron", "Bison",
  "Koala", "Whale", "Dolphin", "Penguin", "Parrot",
];

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#0ea5e9", "#10b981",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface AnonymousIdentity {
  participantId: string;
  displayName: string;
  color: string;
}

const STORAGE_KEY = "slideboard-identity";

export function generateIdentity(): AnonymousIdentity {
  return {
    participantId: nanoid(),
    displayName: `${pick(ADJECTIVES)} ${pick(ANIMALS)}`,
    color: pick(COLORS),
  };
}

export function loadIdentity(): AnonymousIdentity {
  if (typeof window === "undefined") {
    return generateIdentity();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AnonymousIdentity;
      if (parsed.participantId && parsed.displayName && parsed.color) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }

  const identity = generateIdentity();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

export function saveIdentity(identity: AnonymousIdentity): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}
