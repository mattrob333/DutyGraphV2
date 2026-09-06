CREATE TABLE pilot_notifications (
 application_id uuid PRIMARY KEY REFERENCES pilot_applications(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','review')),
 attempts integer NOT NULL DEFAULT 0,
 first_attempt_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 envelope jsonb,
 provider_id text,
 last_error text
);
ALTER TABLE pilot_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_worker ON pilot_notifications TO dutygraph_app USING(true) WITH CHECK(true);
CREATE FUNCTION queue_pilot_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 INSERT INTO public.pilot_notifications(application_id) VALUES(NEW.id);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION queue_pilot_notification() FROM PUBLIC;
CREATE TRIGGER pilot_notification_insert AFTER INSERT ON pilot_applications FOR EACH ROW EXECUTE FUNCTION queue_pilot_notification();
-- Keep the intake table write-only for the web role. Only the internal worker
-- can obtain the details for an existing queued application through this function.
CREATE FUNCTION pilot_notification_details(target uuid) RETURNS TABLE(name text,email text,company text,role text,team_size text,goal text)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT a.name,a.email,a.company,a.role,a.team_size,a.goal FROM public.pilot_applications a
 JOIN public.pilot_notifications n ON n.application_id=a.id WHERE a.id=target AND n.state='sending'
$$;
REVOKE ALL ON FUNCTION pilot_notification_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pilot_notification_details(uuid) TO dutygraph_app;
