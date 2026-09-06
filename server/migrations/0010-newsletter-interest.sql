CREATE TABLE newsletter_interest (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE,
 consent_version text NOT NULL,
 state text NOT NULL DEFAULT 'pending_confirmation' CHECK(state IN ('pending_confirmation','confirmed','unsubscribed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE newsletter_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY newsletter_interest_insert ON newsletter_interest FOR INSERT WITH CHECK(state='pending_confirmation');
