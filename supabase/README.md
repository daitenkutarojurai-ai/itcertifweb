# Supabase Migrations

This directory is the source of truth for the canonical progress schema
shared by `webitcertif` (web) and `certquestapp` (native).

- One SQL file per change, named `YYYYMMDDHHMMSS_<slug>.sql`.
- Apply migrations using the Supabase MCP (`apply_migration` tool) or
  the `supabase` CLI; never edit production tables out-of-band.
- The app (`certquestapp`) reads this schema but does not store its
  migrations here — it depends on the shape, not the DDL.
