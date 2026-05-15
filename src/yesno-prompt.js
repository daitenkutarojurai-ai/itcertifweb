/**
 * src/yesno-prompt.js — Phase 5.13.
 *
 * Pure helpers for the path-mode Yes/No mini-game. The previous drill
 * showed `<question stem>` + `<one option>` + the prompt
 *   "Is this the right answer?"
 * which read as a riddle for any "Which X is Y?" stem ("Is HTTPS the
 * answer to: which protocol uses port 443?").
 *
 * This module synthesises a single declarative sentence from
 * (stem, option) so the user can yes/no a STATEMENT, not a riddle:
 *   "HTTPS uses port 443." → Yes / No
 *   "DynamoDB is a relational database." → Yes / No
 *
 * Pure JS, dual-export so it works in both Node test runner and the
 * browser via window.cqYesNoPrompt. Use the CJS form in tests
 * (`require('../src/yesno-prompt.js')`) and the global in path.js.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.cqYesNoPrompt = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  /* Stems we cannot turn into a declarative without distorting meaning.
     Reject scenario stems, negative-framed stems, and questions whose
     answer is a recommended *action* rather than a fact. */
  const REJECT_PATTERNS = [
    /\bshould (you|the (admin|engineer|developer|company|customer|team))\b/i,
    /\bwhat action\b/i,
    /\bwhat (is the |would be the )?next step\b/i,
    /\bwhich (action|step|approach|strategy|solution) (should|would|will|best)\b/i,
    /\b(NOT|EXCEPT|never|cannot|none of)\b/, // negative-framed (case-sensitive — match exam-style ALL-CAPS)
    /\bnot true\b/i,
    /\b(true or false|true\/false)\b/i, // already a bool prompt elsewhere
  ];

  function isComplexStem(stem) {
    if (!stem) return true;
    const s = String(stem).trim();
    // Long multi-sentence scenarios: too much context for a one-line yes/no.
    if (s.length > 160) return true;
    // More than one sentence-ending punctuation usually signals a scenario.
    const sentences = s.split(/[.!?]\s+[A-Z]/);
    if (sentences.length > 1) return true;
    if (REJECT_PATTERNS.some(re => re.test(s))) return true;
    return false;
  }

  /* Verbs we know how to splice cleanly into "[option] [verb] [rest]."
     Kept as a closed allowlist so we never produce broken English. */
  const VERB_SET = '(?:is|are|uses?|has|have|provides?|supports?|allows?|enables?|requires?|stores?|encrypts?|decrypts?|authenticates?|implements?|manages?|configures?|monitors?|protects?|controls?|prevents?|defines?|describes?|represents?|specifies?|handles?|processes?|generates?|creates?|deletes?|updates?|reads?|writes?|runs?|operates?|connects?|exposes?|listens?|serves?|forwards?|routes?|filters?|matches?|measures?|calculates?|returns?|emits?|produces?|consumes?|maintains?|tracks?|records?)';

  /* Pattern matrix. Each entry: [regex, builder(matchGroups, option) → string]
     Order matters — first match wins. Keep specific patterns before
     generic ones. */
  const PATTERNS = [
    // "Which <noun phrase> <verb> <rest>?" → "<option> <verb> <rest>."
    // Examples:
    //   "Which protocol uses port 443?" + "HTTPS" → "HTTPS uses port 443."
    //   "Which AWS service is serverless?" + "AWS Lambda" → "AWS Lambda is serverless."
    {
      re: new RegExp('^Which\\s+[\\w\\s\'/-]+?\\s+(' + VERB_SET.slice(3, -1) + ')\\s+(.+?)\\??$', 'i'),
      build: (m, opt) => `${opt} ${m[1].toLowerCase()} ${m[2].replace(/\s+$/, '')}.`
    },
    // "What is <subject>?" + option → "<subject> is <option>."
    {
      re: /^What\s+is\s+(.+?)\??$/i,
      build: (m, opt) => `${cap(m[1].trim())} is ${opt}.`
    },
    // "What are <subject>?" + option → "<subject> are <option>."
    {
      re: /^What\s+are\s+(.+?)\??$/i,
      build: (m, opt) => `${cap(m[1].trim())} are ${opt}.`
    },
    // "What does <subject> <verb>?" + option → "<subject> <verb> <option>."
    // Example: "What does TLS provide?" + "Confidentiality" → "TLS provides Confidentiality."
    {
      re: new RegExp('^What does\\s+(.+?)\\s+(' + VERB_SET.slice(3, -1) + ')\\??$', 'i'),
      build: (m, opt) => `${m[1].trim()} ${conjugate3rd(m[2])} ${opt}.`
    },
    // "How many <noun> <verb> <subject>?" → "<subject> <verb> <option> <noun>."
    // Too risky for grammar — skip; better to reject than ship broken English.

    // ("X. True or false?" was tried but isComplexStem rejects it via the
    //  REJECT_PATTERNS allowlist, so the entry is dead code.)
  ];

  function cap(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* Quick-and-dirty 3rd-person-singular conjugator for the few verbs
     we splice from "What does X verb?" patterns. Only needs to handle
     the verbs in VERB_SET. */
  function conjugate3rd(verb) {
    const v = verb.toLowerCase();
    if (v === 'do') return 'does';
    if (v === 'have') return 'has';
    if (v === 'is' || v === 'are') return v;
    if (/[sxz]$|[cs]h$/.test(v)) return v + 'es';
    if (/[^aeiou]y$/.test(v)) return v.replace(/y$/, 'ies');
    if (v.endsWith('s')) return v;
    return v + 's';
  }

  /* Build a declarative Yes/No prompt from a question stem + one of its
     options. Returns null when no pattern fits — caller should skip the
     question for the Yes/No drill. */
  function buildYesNoPrompt(stem, option) {
    if (!stem || !option) return null;
    if (isComplexStem(stem)) return null;
    const s = String(stem).trim();
    const o = String(option).trim().replace(/\.$/, ''); // strip option's trailing period — we add our own
    if (!o) return null;
    for (const p of PATTERNS) {
      const m = s.match(p.re);
      if (m) {
        const out = p.build(m, o).replace(/\s+/g, ' ').trim();
        // Sanity floor: a sensible declarative is at least 8 chars and ends in "."
        if (out.length >= 8 && /\.$/.test(out)) return out;
      }
    }
    return null;
  }

  /* Boolean predicate: can we generate ANY valid prompt for this stem,
     using a synthetic sentinel option? Useful as a content filter when
     building drill pools — if false, skip the question entirely. */
  function canYesNoify(stem) {
    return buildYesNoPrompt(stem, 'X') !== null;
  }

  return { buildYesNoPrompt, canYesNoify, isComplexStem };
});
