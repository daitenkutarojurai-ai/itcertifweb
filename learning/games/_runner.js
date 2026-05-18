// Generic game-mode runner.
//
// Loads a GameNode JSON payload, dispatches to the right mode module,
// and renders it into a host element. Stays framework-free: zero deps.
//
//   <div id="game-host"></div>
//   <script type="module">
//     import { run } from '/learning/games/_runner.js';
//     run('#game-host', '/data/games/match-pair/example.json');
//   </script>

const MODE_MODULES = {
  'match-pair':         () => import('./match-pair.js'),
  'lightning-round':    () => import('./lightning-round.js'),
  'break-architecture': () => import('./break-architecture.js'),
  'acronym-decoder':    () => import('./acronym-decoder.js'),
  'true-false-blitz':   () => import('./true-false-blitz.js'),
  'scenario-builder':   () => import('./scenario-builder.js'),
  'boss-fight':         () => import('./boss-fight.js'),
};

export async function run(hostSelectorOrEl, payloadUrlOrObject, opts = {}) {
  const host = typeof hostSelectorOrEl === 'string'
    ? document.querySelector(hostSelectorOrEl)
    : hostSelectorOrEl;

  if (!host) throw new Error(`[games] host not found: ${hostSelectorOrEl}`);

  const payload = typeof payloadUrlOrObject === 'string'
    ? await fetch(payloadUrlOrObject).then((r) => r.json())
    : payloadUrlOrObject;

  const loader = MODE_MODULES[payload.mode];
  if (!loader) throw new Error(`[games] unknown mode: ${payload.mode}`);

  const mod = await loader();
  const state = mod.init(host, payload, opts);
  mod.render(state);
  return state;
}
