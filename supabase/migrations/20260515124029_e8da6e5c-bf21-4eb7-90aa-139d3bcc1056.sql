
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager');

-- Supermarkets
CREATE TABLE public.supermarkets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles (mirrors auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  supermarket_id uuid REFERENCES public.supermarkets(id) ON DELETE SET NULL,
  full_name text,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User roles (separate table — never on profiles)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get current user's supermarket
CREATE OR REPLACE FUNCTION public.current_supermarket_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT supermarket_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Sales
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supermarket_id uuid NOT NULL REFERENCES public.supermarkets(id) ON DELETE CASCADE,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supermarket_id uuid NOT NULL REFERENCES public.supermarkets(id) ON DELETE CASCADE,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text,
  amount numeric(12,2) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Stock
CREATE TABLE public.stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supermarket_id uuid NOT NULL REFERENCES public.supermarkets(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity int NOT NULL DEFAULT 0,
  buying_price numeric(12,2),
  selling_price numeric(12,2),
  supplier_name text,
  reorder_level int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Salaries
CREATE TABLE public.salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supermarket_id uuid NOT NULL REFERENCES public.supermarkets(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  position text,
  monthly_salary numeric(12,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  supermarket_id uuid REFERENCES public.supermarkets(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  level text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  supermarket_id uuid REFERENCES public.supermarkets(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supermarkets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Supermarkets policies
CREATE POLICY "Authenticated can view supermarkets"
  ON public.supermarkets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage supermarkets"
  ON public.supermarkets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());
CREATE POLICY "Admins delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Generic tenant policy creator
-- Sales
CREATE POLICY "View sales (admin or own supermarket)"
  ON public.sales FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Insert sales (admin or own supermarket)"
  ON public.sales FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Update sales (admin or own supermarket)"
  ON public.sales FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Delete sales (admin only)"
  ON public.sales FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Expenses
CREATE POLICY "View expenses" ON public.expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Insert expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Stock
CREATE POLICY "View stock" ON public.stock FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Insert stock" ON public.stock FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Update stock" ON public.stock FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Delete stock" ON public.stock FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());

-- Salaries
CREATE POLICY "View salaries" ON public.salaries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Insert salaries" ON public.salaries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Update salaries" ON public.salaries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR supermarket_id = public.current_supermarket_id());
CREATE POLICY "Delete salaries" ON public.salaries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Audit logs (admin read; anyone authenticated insert)
CREATE POLICY "Admins view audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated insert audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, supermarket_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'supermarket_id','')::uuid
  )
  ON CONFLICT (id) DO NOTHING;

  -- Default role: manager (admins are promoted manually)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'manager')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed default supermarkets
INSERT INTO public.supermarkets (name, location) VALUES
  ('Shalom Supermarket', 'Kampala'),
  ('Simple Supermarket', 'Kampala'),
  ('Suubi Supermarket', 'Kampala'),
  ('Alleluya Supermarket', 'Kampala');
