-- Activity Logs for tracking manager actions

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs
CREATE POLICY "admin_read_logs" ON activity_logs
  FOR SELECT USING (user_has_role(ARRAY['admin']));

-- Users can only insert logs (mostly handled by service role or authenticated users themselves)
CREATE POLICY "auth_insert_logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id AND user_has_role(ARRAY['admin', 'manager', 'staff']));
