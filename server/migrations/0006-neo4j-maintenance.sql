-- Operator-only scheduling metadata, like auth_attempts; no company content or credentials.
CREATE TABLE maintenance_cursors (
 name text PRIMARY KEY,
 last_tenant_id uuid,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO maintenance_cursors(name) VALUES('neo4j');
