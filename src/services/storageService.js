const storage = window.localStorage;

export function getItem(key, fallback = null) {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setItem(key, value) {
  storage.setItem(key, JSON.stringify(value));
}

export function removeItem(key) {
  storage.removeItem(key);
}

export function clearAll(keys) {
  keys.forEach((key) => removeItem(key));
}
