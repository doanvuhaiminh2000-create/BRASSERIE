-- User profiles
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff', 'pending');

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- POS Batches
CREATE TABLE pos_batches (
  batch_id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES user_profiles(id),
  summary JSONB NOT NULL,
  details JSONB NOT NULL,
  payments JSONB NOT NULL,
  total_transactions INT NOT NULL,
  total_revenue NUMERIC NOT NULL,
  total_customers INT NOT NULL
);

CREATE INDEX idx_pos_batches_dates ON pos_batches(date_from, date_to);

-- Menu items
CREATE TABLE menu_items (
  pos_code TEXT PRIMARY KEY,
  pos_name TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  display_name TEXT NOT NULL,
  section TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cost NUMERIC,
  cost_ratio NUMERIC,
  price_from_recipe NUMERIC,
  cost_source TEXT,
  cost_updated_at TIMESTAMPTZ,
  recipe_match_method TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  station TEXT NOT NULL DEFAULT 'N',
  cook_time INT NOT NULL DEFAULT 10,
  complexity INT NOT NULL DEFAULT 2
);

-- Live sessions  
CREATE TABLE live_sessions (
  id TEXT PRIMARY KEY,
  table_id INT NOT NULL,
  guest_count INT NOT NULL,
  status TEXT NOT NULL,
  opened_at BIGINT NOT NULL,
  closed_at BIGINT,
  opened_by_staff_id UUID REFERENCES user_profiles(id),
  items JSONB NOT NULL DEFAULT '[]',
  upsell_attempts JSONB NOT NULL DEFAULT '[]',
  current_round INT NOT NULL DEFAULT 1,
  event_logs JSONB NOT NULL DEFAULT '[]',
  payment_method TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_live_sessions_opened ON live_sessions(opened_at);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
CREATE INDEX idx_live_sessions_table ON live_sessions(table_id);

-- App settings (tables, zones)
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== TRIGGERS =====

-- Auto create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role user_role;
BEGIN
  IF NEW.email = 'doanvuhaiminh2000@gmail.com' THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'pending';
  END IF;

  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    assigned_role
  )
  ON CONFLICT (email) DO UPDATE SET
    id = NEW.id,
    last_login_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== ROW LEVEL SECURITY =====

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: check user role
CREATE OR REPLACE FUNCTION public.user_has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role::TEXT INTO current_role
  FROM user_profiles
  WHERE id = auth.uid() AND is_active = true;
  
  RETURN current_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- user_profiles policies
CREATE POLICY "users_view_own_profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "admin_view_all_profiles" ON user_profiles
  FOR SELECT USING (user_has_role(ARRAY['admin', 'manager']));

CREATE POLICY "admin_update_profiles" ON user_profiles
  FOR UPDATE USING (user_has_role(ARRAY['admin']));

CREATE POLICY "admin_insert_profiles" ON user_profiles
  FOR INSERT WITH CHECK (user_has_role(ARRAY['admin']));

CREATE POLICY "admin_delete_profiles" ON user_profiles
  FOR DELETE USING (user_has_role(ARRAY['admin']));

-- pos_batches policies
CREATE POLICY "auth_users_read_pos" ON pos_batches
  FOR SELECT USING (user_has_role(ARRAY['admin', 'manager', 'staff']));

CREATE POLICY "manager_write_pos" ON pos_batches
  FOR ALL USING (user_has_role(ARRAY['admin', 'manager']));

-- menu_items policies
CREATE POLICY "auth_users_read_menu" ON menu_items
  FOR SELECT USING (user_has_role(ARRAY['admin', 'manager', 'staff']));

CREATE POLICY "manager_write_menu" ON menu_items
  FOR ALL USING (user_has_role(ARRAY['admin', 'manager']));

-- live_sessions policies
CREATE POLICY "auth_users_read_sessions" ON live_sessions
  FOR SELECT USING (user_has_role(ARRAY['admin', 'manager', 'staff']));

CREATE POLICY "auth_users_write_sessions" ON live_sessions
  FOR ALL USING (user_has_role(ARRAY['admin', 'manager', 'staff']));

-- app_settings policies
CREATE POLICY "auth_users_read_settings" ON app_settings
  FOR SELECT USING (user_has_role(ARRAY['admin', 'manager', 'staff']));

CREATE POLICY "manager_write_settings" ON app_settings
  FOR ALL USING (user_has_role(ARRAY['admin', 'manager']));
