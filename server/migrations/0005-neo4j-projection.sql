ALTER TABLE provider_settings DROP CONSTRAINT provider_settings_provider_check;
ALTER TABLE provider_settings ADD CONSTRAINT provider_settings_provider_check CHECK(provider IN ('openai','exa','resend','neo4j'));
CREATE TABLE neo4j_projection_state (
 tenant_id uuid NOT NULL,
 company_id uuid NOT NULL,
 connection_id uuid NOT NULL,
 source_revision bigint NOT NULL DEFAULT -1,
 fingerprint text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','current','error','oversized')),
 message text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,company_id),
 FOREIGN KEY(tenant_id,company_id) REFERENCES companies(tenant_id,id)
);
ALTER TABLE neo4j_projection_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo4j_projection_state FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON neo4j_projection_state USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
