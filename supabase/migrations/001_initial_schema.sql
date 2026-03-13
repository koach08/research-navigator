-- ===== コアテーブル =====

-- 研究プロジェクト
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  field TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 文献メタデータ（API取得データのキャッシュ）
CREATE TABLE papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  semantic_scholar_id TEXT,
  openalex_id TEXT,
  doi TEXT,
  cinii_id TEXT,
  title TEXT NOT NULL,
  title_ja TEXT,
  abstract TEXT,
  authors JSONB,
  year INTEGER,
  venue TEXT,
  citation_count INTEGER DEFAULT 0,
  reference_count INTEGER DEFAULT 0,
  is_open_access BOOLEAN DEFAULT false,
  pdf_url TEXT,
  access_status TEXT DEFAULT 'unknown',
  ai_summary_ja TEXT,
  ai_summary_en TEXT,
  ai_key_findings JSONB,
  ai_methodology TEXT,
  ai_relevance_score REAL,
  fields_of_study JSONB,
  topics JSONB,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, doi)
);

-- 論文とプロジェクトの関連（多対多）
CREATE TABLE project_papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'unreviewed',
  read_status TEXT DEFAULT 'unread',
  cite_decision TEXT DEFAULT 'undecided',
  priority INTEGER DEFAULT 0,
  citation_context TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]',
  added_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, paper_id)
);

-- 引用関係グラフ
CREATE TABLE citation_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  citing_paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  cited_paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(citing_paper_id, cited_paper_id, user_id)
);

-- 検索履歴
CREATE TABLE search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  source TEXT,
  result_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 分野モニタリング設定
CREATE TABLE field_monitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  openalex_concept_id TEXT,
  keywords JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- トレンドキャッシュ
CREATE TABLE trend_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_monitor_id UUID REFERENCES field_monitors(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  top_papers JSONB,
  emerging_topics JSONB,
  ai_digest TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(field_monitor_id, snapshot_date)
);

-- ユーザーAPIキー（BYOK用）
CREATE TABLE user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, service)
);

-- ===== Indexes =====
CREATE INDEX idx_papers_user_id ON papers(user_id);
CREATE INDEX idx_papers_doi ON papers(doi);
CREATE INDEX idx_papers_semantic_scholar_id ON papers(semantic_scholar_id);
CREATE INDEX idx_papers_year ON papers(year);
CREATE INDEX idx_project_papers_project ON project_papers(project_id);
CREATE INDEX idx_project_papers_paper ON project_papers(paper_id);
CREATE INDEX idx_citation_edges_citing ON citation_edges(citing_paper_id);
CREATE INDEX idx_citation_edges_cited ON citation_edges(cited_paper_id);
CREATE INDEX idx_search_history_user ON search_history(user_id);

-- ===== RLS =====
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own projects" ON projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own papers" ON papers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own project_papers" ON project_papers
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users CRUD own citation_edges" ON citation_edges
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own search_history" ON search_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own field_monitors" ON field_monitors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own trend_snapshots" ON trend_snapshots
  FOR ALL USING (
    field_monitor_id IN (SELECT id FROM field_monitors WHERE user_id = auth.uid())
  );

CREATE POLICY "Users CRUD own api_keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
