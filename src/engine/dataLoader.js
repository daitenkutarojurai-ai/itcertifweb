/**
 * engine/dataLoader.js
 * Fetches question packs from ./data/free/.
 * Falls back to embedded data if fetch fails (e.g. file:// protocol in dev).
 */

// ─── Embedded fallback data (keeps app working without a local server) ─────────
const FALLBACK = {
  'ccna.json': {
    meta: { id: 'ccna', name: 'Cisco CCNA 200-301', vendor: 'Cisco', tier: 'free', version: '1.0.0', question_count: 3 },
    questions: [
      {
        id: 'ccna-001',
        question: 'What is the default administrative distance of OSPF?',
        options: ['90', '110', '120', '170'],
        correct: 1,
        explanation: 'OSPF has an administrative distance of 110. EIGRP internal is 90, RIP is 120, and EBGP is 20.',
        tags: ['routing', 'ospf'],
        difficulty: 'medium',
      },
      {
        id: 'ccna-002',
        question: 'Which OSI layer is responsible for end-to-end communication and error recovery?',
        options: ['Network', 'Data Link', 'Transport', 'Session'],
        correct: 2,
        explanation: 'Layer 4 (Transport) handles end-to-end delivery, error recovery, and flow control via TCP or UDP.',
        tags: ['osi', 'transport'],
        difficulty: 'easy',
      },
      {
        id: 'ccna-003',
        question: 'A network admin needs traffic from VLAN 10 to reach VLAN 20. What is required?',
        options: [
          'A trunk link between two switches',
          'A Layer 3 device performing inter-VLAN routing',
          'Spanning Tree Protocol must be disabled',
          'Both VLANs must use the same IP subnet',
        ],
        correct: 1,
        explanation: 'VLANs are separate Layer 2 broadcast domains. Inter-VLAN routing requires a Layer 3 device (router or L3 switch). A trunk link alone is not sufficient.',
        tags: ['vlan', 'routing'],
        difficulty: 'medium',
      },
    ],
  },
};

// ─── Public API ────────────────────────────────────────────────────────────────

/** Load the master pack index */
export async function loadIndex() {
  try {
    const res = await fetch('./data/index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('[DataLoader] Failed to load index.json, using empty index.');
    return { version: '1.0.0', brands: [] };
  }
}

/**
 * Load a question pack by filename (e.g. 'ccna.json')
 * @returns {object|null} pack data or null on failure
 */
export async function loadPack(filename) {
  // filename may be "ccna.json" or "free/ccna.json" — normalize to use ./data/ base
  const path = filename.startsWith('free/') || filename.startsWith('premium/')
    ? `./data/${filename}`
    : `./data/free/${filename}`;

  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    // Try fallback using just the basename
    const basename = filename.split('/').pop();
    if (FALLBACK[basename]) {
      if (window.cqDbg) console.info(`[DataLoader] Using embedded fallback for ${basename}`);
      return FALLBACK[basename];
    }
    console.error(`[DataLoader] Failed to load ${filename}:`, e.message);
    return null;
  }
}
