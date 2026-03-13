# Research Navigator

Academic research literature management and analysis platform with AI-powered research advisory.

研究文献の検索・管理・分析を統合したプラットフォーム。AIアドバイザーによる研究方向の提案機能付き。

---

## Features / 主な機能

### Unified Literature Search / 統合文献検索
- Multi-source parallel search: **Semantic Scholar**, **OpenAlex**, **CiNii** (Japanese papers)
- DOI-based deduplication across sources
- Open access status checking via **Unpaywall**
- Citation expansion — discover references and cited-by papers

### Project Management / プロジェクト管理
- Create research projects with custom categorization
- Paper screening workflow: unreviewed → included / excluded / maybe
- Reading status tracking: unread → reading → read
- Citation decision management: undecided → will cite / won't cite
- Notes and annotations per paper

### AI Research Advisor / AI研究アドバイザー
- Powered by **Claude** (Anthropic)
- Two-stage analysis:
  1. Generate targeted search queries (foundational, methodology, recent, related)
  2. Score and categorize discovered papers by relevance
- Research direction suggestions and development possibilities
- Supports various input types: research themes, proposals, grant applications

### Citation Network Graph / 引用ネットワーク
- Visual citation relationship mapping with **D3.js**
- Interactive network exploration
- Discover connection patterns between papers

### Trend Monitoring / トレンドモニタリング
- Field/topic monitoring with customizable watchlists
- Publication trends by year (charts via **Recharts**)
- Top cited papers in recent years
- Related topic discovery
- Growth rate indicators

### Activity Tracking / アクティビティ追跡
- Search history
- Usage statistics
- Research activity timeline

---

## Tech Stack / 技術構成

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | React 19, Tailwind CSS 4, Lucide Icons |
| Charts | Recharts, D3.js |
| Database | Supabase (PostgreSQL + RLS) |
| AI | Anthropic Claude API |
| Literature APIs | Semantic Scholar, OpenAlex, CiNii, Crossref, Unpaywall |
| Auth | Supabase Auth |

---

## Setup / セットアップ

### Prerequisites
- Node.js 18+
- Supabase account
- Anthropic API key

### 1. Clone & Install

```bash
git clone https://github.com/koach08/research-navigator.git
cd research-navigator
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `ANTHROPIC_API_KEY` — Claude API key

Optional (improves search quality):
- `SEMANTIC_SCHOLAR_API_KEY` — Higher rate limits
- `CINII_API_KEY` — Japanese paper search
- `OPENALEX_EMAIL` / `UNPAYWALL_EMAIL` — Polite pool access

### 3. Database Setup

Run the SQL migrations in your Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_activity_log.sql
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment / デプロイ

Recommended: **Vercel**

1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

---

## Screenshots / スクリーンショット

*Coming soon*

---

## License / ライセンス

All rights reserved. This software is proprietary.
Commercial licensing available — contact for details.

このソフトウェアのすべての権利は留保されています。
商用ライセンスについてはお問い合わせください。

---

## Author / 開発者

**Language × AI Lab**
- Web: [language-smartlearning.com](https://www.language-smartlearning.com)
- Email: ariyabridge082024@gmail.com
