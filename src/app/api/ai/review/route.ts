import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { searchSemanticScholar } from '@/lib/api-clients/semantic-scholar';
import { searchOpenAlex } from '@/lib/api-clients/openalex';
import { logActivityServer } from '@/lib/activity-logger-server';
import type { SearchResult } from '@/types/paper';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { text } = await request.json();
  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });

    // Step 1: Extract key claims, methodology, and generate search queries
    const extractionMessage = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `あなたは学術論文の査読者です。以下の研究テキストから、主要な主張、方法論、研究課題を抽出し、関連する先行研究を見つけるための検索クエリを生成してください。

テキスト:
${text.slice(0, 15000)}

以下のJSON形式で回答してください（JSONのみ）:
{
  "title_guess": "この研究のタイトル推測",
  "research_questions": ["研究課題1", "研究課題2"],
  "key_claims": ["主要な主張1", "主要な主張2", "主要な主張3"],
  "methodology": "使用されている研究方法の概要",
  "field": "研究分野",
  "search_queries": [
    {
      "query": "英語の検索クエリ（先行研究検索用）",
      "purpose": "何を探すためのクエリか（日本語）"
    }
  ]
}

search_queries は5-8個生成してください。この研究の独自性を検証するために、類似研究や関連する先行研究を幅広く検索できるクエリにしてください。`,
        },
      ],
    });

    const extractionText = extractionMessage.content[0].type === 'text' ? extractionMessage.content[0].text : '';
    const extractionMatch = extractionText.match(/\{[\s\S]*\}/);
    if (!extractionMatch) {
      return NextResponse.json({ error: 'AI extraction failed' }, { status: 500 });
    }

    const extraction = JSON.parse(extractionMatch[0]);

    // Step 2: Search for related work using generated queries
    const searchPromises = (extraction.search_queries || []).map(
      async (sq: { query: string; purpose: string }) => {
        const [s2Result, oaResult] = await Promise.allSettled([
          searchSemanticScholar(sq.query, { limit: 8 }),
          searchOpenAlex(sq.query, { limit: 8 }),
        ]);

        const results: SearchResult[] = [];
        if (s2Result.status === 'fulfilled') results.push(...s2Result.value.results);
        if (oaResult.status === 'fulfilled') results.push(...oaResult.value.results);

        // DOI dedup
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
          query: sq.query,
          purpose: sq.purpose,
          papers: unique.slice(0, 6),
        };
      }
    );

    const searchResults = await Promise.allSettled(searchPromises);
    const queryResults = searchResults
      .filter((r): r is PromiseFulfilledResult<{
        query: string;
        purpose: string;
        papers: SearchResult[];
      }> => r.status === 'fulfilled')
      .map(r => r.value);

    // Collect all papers and deduplicate globally
    const allPapers = queryResults.flatMap(qr => qr.papers);
    const globalSeen = new Set<string>();
    const uniquePapers = allPapers.filter(p => {
      const key = p.doi?.toLowerCase() || `${p.title.toLowerCase().slice(0, 50)}`;
      if (globalSeen.has(key)) return false;
      globalSeen.add(key);
      return true;
    });

    const topPapers = uniquePapers.slice(0, 25);

    // Step 3: Claude evaluates originality, positioning, strengths, improvements
    const reviewMessage = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `あなたは経験豊富な学術査読者です。以下の研究テキストと、検索で見つかった関連文献リストに基づいて、詳細な査読レビューを行ってください。

## 研究テキスト:
${text.slice(0, 10000)}

## 抽出された情報:
- 研究課題: ${extraction.research_questions?.join(', ') || 'N/A'}
- 主要な主張: ${extraction.key_claims?.join(', ') || 'N/A'}
- 方法論: ${extraction.methodology || 'N/A'}
- 分野: ${extraction.field || 'N/A'}

## 関連文献リスト:
${topPapers.map((p, i) => `${i + 1}. "${p.title}" (${p.year || 'N/A'}) - ${p.authors?.map(a => a.name).slice(0, 2).join(', ') || 'Unknown'}
   Abstract: ${(p.abstract || '').slice(0, 200)}...`).join('\n')}

以下のJSON形式で回答してください（JSONのみ）:
{
  "research_positioning": "この研究が学術分野でどこに位置づけられるか。どの研究の流れに属し、どのギャップを埋めようとしているか（3-5文）",
  "originality_score": 75,
  "originality_explanation": "独自性スコアの根拠。どこが新しく、どこが既存研究と重なるか（3-5文）",
  "comparison_with_prior_work": [
    {
      "paper_index": 1,
      "paper_title": "関連論文のタイトル",
      "similarity": "どこが類似しているか",
      "difference": "どこが異なるか",
      "relation": "complementary | overlapping | extending | contrasting"
    }
  ],
  "strengths": [
    {
      "point": "強みのポイント",
      "explanation": "なぜこれが強みか（1-2文）"
    }
  ],
  "improvements": [
    {
      "point": "改善提案のポイント",
      "explanation": "具体的にどう改善すべきか（1-2文）",
      "priority": "high | medium | low"
    }
  ],
  "papers_to_cite": [
    {
      "paper_index": 1,
      "paper_title": "引用すべき論文のタイトル",
      "reason": "なぜ引用すべきか（1文）"
    }
  ],
  "overall_assessment": "総合的な評価コメント（3-5文）"
}

originality_score は0-100の整数で:
- 90-100: 非常に独創的、新しいパラダイムの提案
- 70-89: かなり独自性がある、新しい視点やアプローチ
- 50-69: ある程度の独自性、既存研究の改良や拡張
- 30-49: 限定的な独自性、多くが既存研究と重なる
- 0-29: ほぼ既存研究の繰り返し

comparison_with_prior_work は最も関連度の高い3-5件について詳述してください。
strengths は3-5個、improvements は3-5個、papers_to_cite は3-8個提案してください。`,
        },
      ],
    });

    const reviewText = reviewMessage.content[0].type === 'text' ? reviewMessage.content[0].text : '';
    const reviewMatch = reviewText.match(/\{[\s\S]*\}/);
    if (!reviewMatch) {
      return NextResponse.json({ error: 'AI review failed' }, { status: 500 });
    }

    const review = JSON.parse(reviewMatch[0]);

    // Enrich comparison and citation papers with full info from search results
    const enrichPaperRef = (ref: { paper_index: number; paper_title: string }) => {
      const paper = topPapers[ref.paper_index - 1];
      if (paper) {
        return {
          ...ref,
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          doi: paper.doi,
          venue: paper.venue,
          is_open_access: paper.is_open_access,
          pdf_url: paper.pdf_url,
          citation_count: paper.citation_count,
        };
      }
      return ref;
    };

    const enrichedComparisons = (review.comparison_with_prior_work || []).map(
      (c: { paper_index: number; paper_title: string; similarity: string; difference: string; relation: string }) =>
        enrichPaperRef(c)
    );

    const enrichedCitations = (review.papers_to_cite || []).map(
      (c: { paper_index: number; paper_title: string; reason: string }) =>
        enrichPaperRef(c)
    );

    // Log activity
    logActivityServer(userId, 'review_query', 'review', undefined, {
      text_length: text.length,
      originality_score: review.originality_score,
      related_papers_found: topPapers.length,
    });

    return NextResponse.json({
      data: {
        extraction: {
          title_guess: extraction.title_guess,
          research_questions: extraction.research_questions,
          key_claims: extraction.key_claims,
          methodology: extraction.methodology,
          field: extraction.field,
        },
        review: {
          research_positioning: review.research_positioning,
          originality_score: review.originality_score,
          originality_explanation: review.originality_explanation,
          comparison_with_prior_work: enrichedComparisons,
          strengths: review.strengths,
          improvements: review.improvements,
          papers_to_cite: enrichedCitations,
          overall_assessment: review.overall_assessment,
        },
        search_queries: extraction.search_queries,
        related_papers_count: topPapers.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review analysis failed';
    console.error('Review error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
