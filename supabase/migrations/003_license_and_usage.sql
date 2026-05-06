-- ===== ライセンス管理 =====

-- ユーザーライセンス（Gumroad連携）
CREATE TABLE IF NOT EXISTS user_licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  license_key TEXT NOT NULL,
  gumroad_purchase_id TEXT,
  plan TEXT DEFAULT 'pro',
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 使用量トラッキング（月別）
CREATE TABLE IF NOT EXISTS usage_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  period TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, feature, period)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_licenses_user_id ON user_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_counts_user_period ON usage_counts(user_id, period);

-- 使用量をアトミックにインクリメントする関数
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_period TEXT
) RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO usage_counts (user_id, feature, period, count)
  VALUES (p_user_id, p_feature, p_period, 1)
  ON CONFLICT (user_id, feature, period)
  DO UPDATE SET count = usage_counts.count + 1, updated_at = now()
  RETURNING count INTO current_count;
  RETURN current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLSポリシー
ALTER TABLE user_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own license" ON user_licenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON usage_counts
  FOR SELECT USING (auth.uid() = user_id);
