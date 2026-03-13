-- ===== アクティビティログ =====

CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,  -- search, view_paper, add_to_project, set_status, set_cite_decision, summarize, expand_citations, advisor_query, trend_view
  entity_type TEXT,      -- paper, project, search, advisor
  entity_id TEXT,        -- paper_id, project_id, etc.
  metadata JSONB DEFAULT '{}',  -- action-specific data (query terms, status changes, relevance scores, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own activity_log" ON activity_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
