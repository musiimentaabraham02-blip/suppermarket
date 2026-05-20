-- 20260520122200_restrict_manager_activities.sql
-- Drop loose policies that allow managers to update or delete transactional entries

-- 1. Sales Update lockdown
DROP POLICY IF EXISTS "Update sales (admin or own supermarket)" ON public.sales;
CREATE POLICY "Update sales (admin only)"
  ON public.sales FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Expenses Update lockdown
DROP POLICY IF EXISTS "Update expenses" ON public.expenses;
CREATE POLICY "Update expenses (admin only)"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Stock Update and Delete lockdown
DROP POLICY IF EXISTS "Update stock" ON public.stock;
CREATE POLICY "Update stock (admin only)"
  ON public.stock FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Delete stock" ON public.stock;
CREATE POLICY "Delete stock (admin only)"
  ON public.stock FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Salaries Update lockdown
DROP POLICY IF EXISTS "Update salaries" ON public.salaries;
CREATE POLICY "Update salaries (admin only)"
  ON public.salaries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
