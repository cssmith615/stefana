import * as SecureStore from 'expo-secure-store';
import { getPlanningPhase } from './dateUtils';

const API_KEY_STORE_KEY = 'anthropic_api_key';
const MODEL = 'claude-haiku-4-5-20251001';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface EventContext {
  // Core
  eventName: string;
  eventDate: string | null;
  daysUntil: number | null;
  venueName: string | null;

  // Budget
  totalBudget: number | null;
  budgetSpent: number;
  budgetRemaining: number;
  budgetOverBudget: boolean;
  topSpendCategories: string; // e.g. "venue ($12k), catering ($8k), photography ($4k)"

  // Checklist
  completedTasks: number;
  totalTasks: number;
  overdueTasks: number;
  upcomingTaskTitles: string; // next 3 due tasks

  // Guests
  guestCountEstimate: number | null;
  guestsTotal: number;
  guestsAttending: number;
  guestsDeclined: number;
  guestsAwaitingRsvp: number;
  guestsSeated: number;
  guestsUnseated: number;

  // Vendors
  vendorsBooked: number;
  vendorsTotal: number;
  bookedCategories: string; // e.g. "venue, photography, catering"
  missingCategories: string; // e.g. "florals, music, officiant"
  upcomingPayments: string; // e.g. "Florist deposit $500 due Jun 1, Venue balance $8000 due Aug 15"

  // Timeline & Moodboard
  hasTimeline: boolean;
  timelineEventCount: number;
  moodboardCount: number;
  moodboardCategories: string;
}

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_STORE_KEY);
}

export async function saveApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_STORE_KEY, key.trim());
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
}

export async function sendMessage(
  messages: AiMessage[],
  ctx: EventContext,
): Promise<{ reply?: string; error?: string }> {
  const apiKey = await getApiKey();
  if (!apiKey) return { error: 'no_key' };

  const system = buildSystemPrompt(ctx);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await response.json();
    if (!response.ok) return { error: data.error?.message ?? 'API error' };
    return { reply: data.content?.[0]?.text ?? '' };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

function buildSystemPrompt(ctx: EventContext): string {
  const phase = getPlanningPhase(ctx.daysUntil);

  const budgetLine = ctx.totalBudget
    ? `$${ctx.budgetSpent.toLocaleString()} spent of $${ctx.totalBudget.toLocaleString()} total (${ctx.budgetOverBudget ? '⚠️ OVER BUDGET' : `$${ctx.budgetRemaining.toLocaleString()} remaining`})`
    : 'Budget not set';

  const checklistLine = ctx.totalTasks > 0
    ? `${ctx.completedTasks}/${ctx.totalTasks} complete${ctx.overdueTasks > 0 ? ` — ⚠️ ${ctx.overdueTasks} OVERDUE` : ''}`
    : 'No tasks yet';

  const guestLine = ctx.guestsTotal > 0
    ? `${ctx.guestsTotal} guests — ${ctx.guestsAttending} attending, ${ctx.guestsDeclined} declined, ${ctx.guestsAwaitingRsvp} awaiting RSVP${ctx.guestsUnseated > 0 ? ` — ${ctx.guestsUnseated} not yet seated` : ', all seated'}`
    : `Estimate: ${ctx.guestCountEstimate ?? 'unknown'}`;

  const vendorLine = ctx.vendorsTotal > 0
    ? `${ctx.vendorsBooked}/${ctx.vendorsTotal} booked. Booked: ${ctx.bookedCategories || 'none'}. Still needed: ${ctx.missingCategories || 'none'}`
    : 'No vendors added yet';

  return `You are a warm, experienced wedding planning assistant named Stefana.

== WEDDING DETAILS ==
Event: ${ctx.eventName}
Date: ${ctx.eventDate ?? 'not set'} ${ctx.daysUntil != null ? `(${ctx.daysUntil} days away)` : ''}
Phase: ${phase}
Venue: ${ctx.venueName ?? 'not set'}

== BUDGET ==
${budgetLine}
${ctx.topSpendCategories ? `Top spending: ${ctx.topSpendCategories}` : ''}
${ctx.upcomingPayments ? `Upcoming payments: ${ctx.upcomingPayments}` : ''}

== CHECKLIST ==
${checklistLine}
${ctx.upcomingTaskTitles ? `Next tasks due: ${ctx.upcomingTaskTitles}` : ''}

== GUESTS ==
${guestLine}

== VENDORS ==
${vendorLine}

== DAY-OF TIMELINE ==
${ctx.hasTimeline ? `${ctx.timelineEventCount} events planned` : 'Not started yet'}

== INSPIRATION BOARD ==
${ctx.moodboardCount > 0 ? `${ctx.moodboardCount} photos saved (${ctx.moodboardCategories})` : 'No photos saved yet'}

== YOUR ROLE ==
- Answer wedding planning questions with warmth and expertise
- Proactively reference the couple's specific details (budget, vendors, timeline) in your answers
- Help draft vendor emails — write complete, copy-paste ready emails using the couple's real details
- Suggest what to prioritize based on current phase and what's overdue or missing
- If vendors are missing for their phase, mention which ones to book next
- If budget is tight or over, give concrete cost-saving advice
- Create day-of timelines when asked, incorporating their actual vendors and venue
- Help with seating, RSVP management, and guest communication
- Be encouraging — planning a wedding is stressful and exciting!

Keep responses concise and actionable. Use bullet points for lists. Reference their specific numbers and names when relevant.`;
}
