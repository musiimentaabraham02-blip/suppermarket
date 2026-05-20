
-- Tighten always-true policies
DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
CREATE POLICY "Admins or self insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated insert audit" ON public.audit_logs;
CREATE POLICY "Users insert own audit"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Lock down SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_supermarket_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
