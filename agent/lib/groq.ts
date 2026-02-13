import Anthropic from '@anthropic-ai/sdk';
import type { ComplaintCategory } from './supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface ExtractedComplaint {
  review_index: number;
  complaint_text: string;
  complaint_category: ComplaintCategory;
  severity: number; // 1–5
}

const SYSTEM_PROMPT = `You are an expert at analyzing iOS app store reviews to identify user complaints.

Given a batch of reviews, extract specific complaints from negative/mixed reviews.
For each complaint found, return structured JSON.

Complaint categories (use EXACTLY these strings):
- "Bugs/Crashes" — app crashes, freezes, specific bugs
- "Performance" — slow loading, lag, battery drain, memory issues
- "UI/UX" — confusing navigation, bad design, poor usability
- "Pricing/Subscriptions" — too expensive, misleading pricing, paywall issues
- "Missing Features" — features removed or requested by users
- "Customer Support" — unresponsive support, bad service experience
- "Privacy/Security" — data collection concerns, privacy issues, security flaws
- "Content Quality" — bad content, inaccurate information, low quality

Severity scale:
- 1: Minor annoyance
- 2: Noticeable issue
- 3: Significant problem affecting usage
- 4: Major issue causing app to be barely usable
- 5: App-breaking issue or serious harm

Return ONLY a valid JSON array. No markdown, no explanation.`;

interface ReviewInput {
  index: number;
  rating: number;
  title: string;
  body: string;
}

export async function extractComplaints(
  reviews: ReviewInput[]
): Promise<ExtractedComplaint[]> {
  const reviewsText = reviews
    .map(
      (r) =>
        `[${r.index}] Rating: ${r.rating}/5\nTitle: ${r.title || '(no title)'}\nBody: ${r.body}`
    )
    .join('\n\n---\n\n');

  const userPrompt = `Extract complaints from these ${reviews.length} app reviews:\n\n${reviewsText}\n\nReturn JSON array: [{review_index, complaint_text, complaint_category, severity}]`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw =
    response.content[0]?.type === 'text' ? response.content[0].text : '[]';
  // Strip markdown code fences if Claude wraps response in ```json ... ```
  const content = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(content);
    // Handle both {complaints: [...]} and [...] response shapes
    const items: ExtractedComplaint[] = Array.isArray(parsed)
      ? parsed
      : parsed.complaints ?? parsed.results ?? [];
    return items.filter(
      (c) =>
        typeof c.review_index === 'number' &&
        typeof c.complaint_text === 'string' &&
        typeof c.complaint_category === 'string' &&
        typeof c.severity === 'number'
    );
  } catch {
    console.error('Failed to parse Claude response:', content);
    return [];
  }
}
