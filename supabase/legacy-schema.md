# Legacy progress schema (snapshotted 2026-05-19, pre-cutover)

| Table | Columns | Rows |
| ----- | ------- | ---- |
| profiles | user_id uuid PK, username, display_name, leaderboard_opt_in, created_at, updated_at | 3 |
| stats | user_id uuid PK, payload jsonb, updated_at | 2 |
| path_progress | user_id, pack_id, node_id, completed_at, score (PK user_id,pack_id,node_id) | 3 |
| laurels | user_id, pack_id, earned_at, score (PK user_id,pack_id) | 0 |
| cosmetics | user_id PK, unlocked text[], wearing, updated_at | 2 |
| hearts | user_id PK, hearts smallint, last_lost_at nullable, updated_at | 2 |
| daily | user_id, day date, progress, claimed, updated_at (PK user_id,day) | 5 |

`stats.payload` holds: `{xp, level, username?, …}`. Backfill reads `payload->>'xp'` and `payload->>'level'`.
