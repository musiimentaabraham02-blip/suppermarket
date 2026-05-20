-- Restore execute permissions for RLS helper functions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_supermarket_id() TO authenticated, anon;
