// Where the login token lives. Everything that needs the token goes through
// this file, so changing how it is stored later means changing one place.

const KEY = "mechlab.token";
const listeners = new Set<() => void>();

// Fallback for browsers that block storage (some private modes): the login
// then lasts until the tab is closed instead of crashing the app.
let memoryToken: string | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memoryToken;
  }
}

export function setToken(token: string) {
  memoryToken = token;
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // storage blocked: memoryToken still holds it
  }
  emit();
}

export function clearToken() {
  memoryToken = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // storage blocked: nothing to remove
  }
  emit();
}

// Lets React re-draw when the token changes (login, logout, expiry).
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Logging out in one browser tab logs out the others too.
window.addEventListener("storage", (event) => {
  if (event.key === KEY) emit();
});
