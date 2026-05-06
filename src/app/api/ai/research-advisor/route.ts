import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { searchSemanticScholar } from '@/lib/api-clients/semantic-scholar';
import { searchOpenAlex } from '@/lib/api-clients/openalex';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivityServer } from '@/lib/activity-logger-server';
import { checkAccess } from '@/lib/feature-gate';
import type { SearchResult } from '@/types/paper';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkAccess(userId, 'advisor');
  if (!access.allowed) return access.error!;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { text, context_type } = await request.json();
  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    // Step 1: Claude が入力を分析し、検索クエリと期待される文献カテゴリを生成
    const client = new Anthropic({ apiKey });

    const analysisMessage = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `あなたは研究アドバイザーです。以下の研究に関するテキストを分析し、文献検索のための情報を生成してください。

入力タイプ: ${context_type || '研究メモ'}

テキスト:
${text}

以下のJSON形式で回答してください（JSONのみ）:
{
  "research_summary": "この研究テーマの簡潔な要約（2-3文）",
  "key_concepts": ["主要概念1", "主要概念2", "主要概念3"],
  "search_queries": [
    {
      "query": "英語の検索クエリ（Semantic Scholar/OpenAlex用）",
      "category": "foundational | methodology | recent | related",
      "purpose": "なぜこの検索が必要か（日本語で）"
    }
  ],
  "expected_fields": ["関連する学術分野1", "関連する学術分野2"],
  "advice": "この研究テーマに取り組む上でのアドバイス（日本語、3-5文）",
  "next_research_directions": [
    {
      "title": "次の研究テーマ候補のタイトル",
      "description": "このテーマの概要と意義（2-3文）",
      "rationale": "なぜこのテーマが有望か（1-2文）",
      "difficulty": "easy | medium | hard"
    }
  ],
  "development_possibilities": [
    {
      "direction": "発展の方向性",
      "description": "具体的にどう発展できるか（2-3文）",
      "potential_impact": "high | medium | low"
    }
  ]
}

search_queries は以下の4カテゴリで5-8個生成:
- foundational: 必読の基礎的先行研究（概論、レビュー論文）
- methodology: 方法論に関連する文献
- recent: 最新の関連研究（直近3年）
- related: 関連するが少し離れた分野の文献

next_research_directions は3-5個生成してください。この研究をベースにした次の研究テーマ候補を提案してください。
development_possibilities は2-4個生成してください。この研究がどのように発展・拡張できるかを具体的に提案してください。`,
        },
      ],
    });

    const analysisText = analysisMessage.content[0].type === 'text' ? analysisMessage.content[0].text : '';
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Step 2: 生成された検索クエリで並列検索
    const searchPromises = (analysis.search_queries || []).map(
      async (sq: { query: string; category: string; purpose: string }) => {
        const [s2Result, oaResult] = await Promise.allSettled([
          searchSemanticScholar(sq.query, { limit: 10 }),
          searchOpenAlex(sq.query, { limit: 10 }),
        ]);

        const results: SearchResult[] = [];
        if (s2Result.status === 'fulfilled') results.push(...s2Result.value.results);
        if (oaResult.status === 'fulfilled') results.push(...oaResult.value.results);

        // DOI重複排除
        const seen = new Set<string>();
        const unique = results.filter(r => {
          if (r.doi) {
            const key = r.doi.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
          }
          return true;
        });

        return {
          category: sq.category,
          purpose: sq.purpose,
          query: sq.query,
          papers: unique.slice(0, 8),
        };
      }
    );

    const searchResults = await Promise.allSettled(searchPromises);
    const categoryResults = searchResults
      .filter((r): r is PromiseFulfilledResult<{
        category: string;
        purpose: string;
        query: string;
        papers: SearchResult[];
      }> => r.status === 'fulfilled')
      .map(r => r.value);

    // Step 3: Claude が各論文の関連度を評価
    const allPapers = categoryResults.flatMap(cr =>
      cr.papers.map(p => ({ ...p, search_category: cr.category }))
    );

    // 重複排除（全体で）
    const globalSeen = new Set<string>();
    const uniquePapers = allPapers.filter(p => {
      const key = p.doi?.toLowerCase() || `${p.title.toLowerCase().slice(0, 50)}`;
      if (globalSeen.has(key)) return false;
      globalSeen.add(key);
      return true;
    });

    // 上位30件に絞ってClaude評価
    const topPapers = uniquePapers.slice(0, 30);

    const scoringMessage = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `以下の研究テーマに対する各論文の関連度を評価してください。

研究テーマ:
${text}

論文リスト:
${topPapers.map((p, i) => `${i + 1}. "${p.title}" (${p.year || 'N/A'}) - ${p.authors?.map(a => a.name).slice(0, 2).join(', ') || 'Unknown'} - カテゴリ: ${p.search_category}
   Abstract: ${(p.abstract || '').slice(0, 200)}...`).join('\n')}

以下のJSON配列で回答（JSONのみ）:
[
  {
    "index": 1,
    "relevance": 85,
    "category": "must_read | recommended | related",
    "reason_ja": "なぜこの論文が重要か（日本語、1文）"
  }
]

category の基準:
- must_read (関連度80%以上): この研究に絶対必要な先行研究
- recommended (関連度50-79%): 読んでおくべき文献
- related (関連度50%未満): 参考になる関連文献`,
        },
      ],
    });

    const scoringText = scoringMessage.content[0].type === 'text' ? scoringMessage.content[0].text : '';
    const scoringMatch = scoringText.match(/\[[\s\S]*\]/);
    let scores: { index: number; relevance: number; category: string; reason_ja: string }[] = [];

    if (scoringMatch) {
      try {
        scores = JSON.parse(scoringMatch[0]);
      } catch {
        scores = [];
      }
    }

    // Step 4: 結果を整形
    const scoredPapers = topPapers.map((paper, i) => {
      const score = scores.find(s => s.index === i + 1);
      return {
        ...paper,
        relevance: score?.relevance ?? 50,
        recommendation_category: score?.category ?? 'related',
        reason_ja: score?.reason_ja ?? '',
      };
    });

    // 関連度でソート
    scoredPapers.sort((a, b) => b.relevance - a.relevance);

    // Step 5: 論文をDBにキャッシュ
    const supabase = createServiceClient();
    for (const paper of scoredPapers) {
      if (paper.doi) {
        const { data: existing } = await supabase
          .from('papers')
          .select('id')
          .eq('user_id', userId)
          .eq('doi', paper.doi)
          .single();

        if (!existing) {
          const { data: inserted } = await supabase
            .from('papers')
            .insert({
              user_id: userId,
              semantic_scholar_id: paper.semantic_scholar_id || null,
              openalex_id: paper.openalex_id || null,
              doi: paper.doi,
              cinii_id: paper.cinii_id || null,
              title: paper.title,
              abstract: paper.abstract || null,
              authors: paper.authors,
              year: paper.year || null,
              venue: paper.venue || null,
              citation_count: paper.citation_count,
              reference_count: paper.reference_count,
              is_open_access: paper.is_open_access,
              pdf_url: paper.pdf_url || null,
              fields_of_study: paper.fields_of_study || null,
              ai_relevance_score: paper.relevance / 100,
            })
            .select('id')
            .single();

          if (inserted) {
            (paper as SearchResult & { db_id?: string }).db_id = inserted.id;
          }
        } else {
          (paper as SearchResult & { db_id?: string }).db_id = existing.id;
        }
      }
    }

    // Log activity (fire-and-forget)
    logActivityServer(userId, 'advisor_query', 'advisor', undefined, {
      context_type: context_type || 'research_memo',
      text_length: text.length,
      result_count: scoredPapers.length,
      must_read_count: scoredPapers.filter(p => p.recommendation_category === 'must_read').length,
      recommended_count: scoredPapers.filter(p => p.recommendation_category === 'recommended').length,
    });

    return NextResponse.json({
      data: {
        analysis: {
          research_summary: analysis.research_summary,
          key_concepts: analysis.key_concepts,
          expected_fields: analysis.expected_fields,
          advice: analysis.advice,
        },
        categories: [
          {
            id: 'must_read',
            label: '必読文献',
            description: 'この研究に不可欠な先行研究',
            papers: scoredPapers.filter(p => p.recommendation_category === 'must_read'),
          },
          {
            id: 'recommended',
            label: '推奨文献',
            description: '読んでおくべき関連文献',
            papers: scoredPapers.filter(p => p.recommendation_category === 'recommended'),
          },
          {
            id: 'related',
            label: '関連文献',
            description: '参考になる周辺分野の文献',
            papers: scoredPapers.filter(p => p.recommendation_category === 'related'),
          },
        ],
        search_queries: analysis.search_queries,
        next_research_directions: analysis.next_research_directions || [],
        development_possibilities: analysis.development_possibilities || [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Research advisor failed';
    console.error('Research advisor error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
