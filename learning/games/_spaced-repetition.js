// Spaced-repetition LAYER — wraps any mode's result, queues missed items
// with shorter due intervals (Anki SM-2 light).
//
// Storage: localStorage key `itcertif_sr_<packId>` → { [itemId]: { due, ease, reps } }.
// Any mode that wants SR support reports missed items via reportResult().

const KEY = (packId) => `itcertif_sr_${packId}`;

export function load(packId) {
  try {
    return JSON.parse(localStorage.getItem(KEY(packId)) || '{}');
  } catch {
    return {};
  }
}

export function save(packId, state) {
  localStorage.setItem(KEY(packId), JSON.stringify(state));
}

export function dueItems(packId, now = Date.now()) {
  const s = load(packId);
  return Object.entries(s)
    .filter(([, v]) => v.due <= now)
    .map(([id]) => id);
}

// Call after a game session. Items are { id, correct: boolean }.
// Correct → push the due date further out; wrong → re-queue soon.
export function reportResult(packId, items) {
  const s = load(packId);
  const now = Date.now();
  for (const it of items) {
    const cur = s[it.id] || { due: now, ease: 2.5, reps: 0 };
    if (it.correct) {
      cur.reps += 1;
      const days = cur.reps === 1 ? 1 : cur.reps === 2 ? 3 : Math.round(cur.reps * cur.ease);
      cur.due = now + days * 24 * 60 * 60 * 1000;
      cur.ease = Math.min(3.0, cur.ease + 0.05);
    } else {
      cur.reps = 0;
      cur.due = now + 30 * 60 * 1000; // 30 min
      cur.ease = Math.max(1.3, cur.ease - 0.2);
    }
    s[it.id] = cur;
  }
  save(packId, s);
}

// Layer helper: filter a candidate pool down to items that are SR-due.
// Use this to construct an SR-prioritised session of any mode.
export function prioritiseDue(packId, candidatePool) {
  const due = new Set(dueItems(packId));
  const front = candidatePool.filter((c) => due.has(c.id));
  const rest  = candidatePool.filter((c) => !due.has(c.id));
  return [...front, ...rest];
}
