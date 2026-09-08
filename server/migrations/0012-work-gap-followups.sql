INSERT INTO maintenance_cursors(name) VALUES ('gap_reply'), ('gap_scan') ON CONFLICT DO NOTHING;
CREATE UNIQUE INDEX gap_reply_response_once ON provider_jobs(tenant_id,company_id,(input->>'responseId')) WHERE kind='gap_reply';
CREATE UNIQUE INDEX gap_outreach_request_once ON provider_jobs(tenant_id,company_id,(input->>'requestId')) WHERE kind='gap_outreach';
