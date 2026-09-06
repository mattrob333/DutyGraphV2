CREATE TABLE pilot_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  company text NOT NULL,
  role text NOT NULL,
  team_size text NOT NULL,
  goal text NOT NULL,
  consent_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Global recruitment inbox, not company evidence. Runtime can submit but cannot
-- read applicants. The database operator reviews it using scripts/pilot-inbox.mjs.
ALTER TABLE pilot_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY pilot_submit ON pilot_applications FOR INSERT WITH CHECK (true);
