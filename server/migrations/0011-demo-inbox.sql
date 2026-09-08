ALTER TABLE pilot_applications ADD COLUMN company_url text NOT NULL DEFAULT '';
ALTER TABLE pilot_applications ADD COLUMN converted_tenant_id uuid REFERENCES tenants(id);
ALTER TABLE pilot_applications ADD COLUMN converted_company_id uuid;
ALTER TABLE pilot_applications ADD CONSTRAINT pilot_company_link FOREIGN KEY(converted_tenant_id,converted_company_id) REFERENCES companies(tenant_id,id);
ALTER TABLE pilot_applications ADD CONSTRAINT pilot_complete_link CHECK ((converted_tenant_id IS NULL) = (converted_company_id IS NULL));

-- Provision exact existing accounts with the migration role. No runtime write
-- policy exists, including after migrate.ts grants table privileges globally.
CREATE TABLE pilot_inbox_operators (
 user_id uuid PRIMARY KEY REFERENCES users(id),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pilot_inbox_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_inbox_operators FORCE ROW LEVEL SECURITY;
CREATE POLICY operator_self ON pilot_inbox_operators FOR SELECT USING (
 tenant_id::text=current_setting('app.tenant_id',true)
 AND user_id::text=current_setting('app.actor_id',true)
);
CREATE POLICY pilot_operator_read ON pilot_applications FOR SELECT USING (
 EXISTS(SELECT 1 FROM pilot_inbox_operators)
 AND (converted_tenant_id IS NULL OR converted_tenant_id::text=current_setting('app.tenant_id',true))
);
CREATE POLICY pilot_operator_update ON pilot_applications FOR UPDATE USING (
 EXISTS(SELECT 1 FROM pilot_inbox_operators)
 AND (converted_tenant_id IS NULL OR converted_tenant_id::text=current_setting('app.tenant_id',true))
) WITH CHECK (
 EXISTS(SELECT 1 FROM pilot_inbox_operators)
 AND (converted_tenant_id IS NULL OR converted_tenant_id::text=current_setting('app.tenant_id',true))
);
