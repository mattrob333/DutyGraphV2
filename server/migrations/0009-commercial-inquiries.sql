ALTER TABLE pilot_applications ADD COLUMN inquiry_type text NOT NULL DEFAULT 'pilot'
 CHECK(inquiry_type IN ('pilot','advisor','enterprise','team'));
ALTER TABLE pilot_applications ADD COLUMN stage text NOT NULL DEFAULT 'new'
 CHECK(stage IN ('new','contacted','qualified','scheduled','active','completed','closed'));
ALTER TABLE pilot_applications ADD COLUMN next_action text NOT NULL DEFAULT '';
ALTER TABLE pilot_applications ADD COLUMN next_action_at date;
ALTER TABLE pilot_applications DROP CONSTRAINT pilot_applications_email_key;
ALTER TABLE pilot_applications ADD CONSTRAINT pilot_email_interest_key UNIQUE(email,inquiry_type);
DROP FUNCTION pilot_notification_details(uuid);
CREATE FUNCTION pilot_notification_details(target uuid) RETURNS TABLE(name text,email text,company text,role text,team_size text,goal text,inquiry_type text)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT a.name,a.email,a.company,a.role,a.team_size,a.goal,a.inquiry_type FROM public.pilot_applications a
 JOIN public.pilot_notifications n ON n.application_id=a.id WHERE a.id=target AND n.state='sending'
$$;
REVOKE ALL ON FUNCTION pilot_notification_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pilot_notification_details(uuid) TO dutygraph_app;
