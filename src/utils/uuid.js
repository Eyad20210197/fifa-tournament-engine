// A simple UUID generator that falls back to a non-standard unique string
// for environments where crypto.randomUUID is not available.
export const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
