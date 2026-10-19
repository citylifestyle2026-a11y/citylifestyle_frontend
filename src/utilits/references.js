// utilits/references.js
//
// A Reference typed as "Ramesh & Suresh", "Ramesh / Suresh" or
// "Ramesh - Suresh" is two different people: the name before and the name
// after the special character (& / -) become separate references.
// Same rule as the backend (utils/splitReferences.js).

const REFERENCE_SEPARATORS = /[&/\-\u2013\u2014]/;

// "A & B-C" -> ["A", "B", "C"]  (trimmed, no empties, no case-insensitive repeats)
export const splitReferenceText = (text) => {
  const seen = new Set();
  const result = [];

  String(text || "")
    .split(REFERENCE_SEPARATORS)
    .forEach((part) => {
      const name = part.replace(/\s+/g, " ").trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return;
      seen.add(key);
      result.push(name);
    });

  return result;
};

// The parts of `text` that are not already in `existing` (case-insensitive).
export const newReferencesFrom = (text, existing = []) => {
  const have = new Set(existing.map((r) => String(r).trim().toLowerCase()));
  return splitReferenceText(text).filter((name) => !have.has(name.toLowerCase()));
};
