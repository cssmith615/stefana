import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Guest, TimelineEvent, Expense, Vendor } from '../types';
import { csvCell, sanitizeFilename } from './exportFormatters';
import { toAmount, sumExpenses, totalsByCategory } from './budgetUtils';

// ─── Guest CSV ────────────────────────────────────────────────────────────────

export async function exportGuestsCsv(guests: Guest[], eventName: string): Promise<void> {
  const header = [
    'First Name', 'Last Name', 'Email', 'Phone',
    'Group', 'RSVP', 'Plus One', 'Plus One Name',
    'Dietary Notes', 'Table #', 'Invite Sent', 'Thank You Sent',
  ].join(',');

  const rows = guests.map(g => [
    csvCell(g.first_name),
    csvCell(g.last_name ?? ''),
    csvCell(g.email ?? ''),
    csvCell(g.phone ?? ''),
    csvCell(g.group_tag ?? ''),
    csvCell(g.rsvp_status),
    g.plus_one ? 'Yes' : 'No',
    csvCell(g.plus_one_name ?? ''),
    csvCell(g.dietary_notes ?? ''),
    g.table_number?.toString() ?? '',
    g.invitation_sent ? 'Yes' : 'No',
    g.thank_you_sent ? 'Yes' : 'No',
  ].join(','));

  const csv = [header, ...rows].join('\n');
  const filename = `${sanitizeFilename(eventName)}_guests.csv`;
  const uri = (FileSystem.documentDirectory ?? '') + filename;

  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Guest List',
    UTI: 'public.comma-separated-values-text',
  });
}

// ─── Timeline PDF ─────────────────────────────────────────────────────────────

export async function exportTimelinePdf(
  events: TimelineEvent[],
  eventName: string,
  eventDate: string | null,
): Promise<void> {
  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBD';

  const CAT_COLORS: Record<string, string> = {
    getting_ready: '#E8A0BF',
    ceremony:      '#C9A96E',
    photos:        '#9B8AC4',
    cocktail_hour: '#F5A623',
    reception:     '#4A90D9',
    travel:        '#6DB56D',
    other:         '#A0A0A0',
  };

  const CAT_LABELS: Record<string, string> = {
    getting_ready: 'Getting Ready',
    ceremony:      'Ceremony',
    photos:        'Photos',
    cocktail_hour: 'Cocktail Hour',
    reception:     'Reception',
    travel:        'Travel',
    other:         'Other',
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const formatDur = (min: number) => {
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  };

  const rows = events.map(e => {
    const color = CAT_COLORS[e.category] ?? '#A0A0A0';
    const catLabel = CAT_LABELS[e.category] ?? 'Other';
    return `
      <tr>
        <td class="time">${formatTime(e.time)}</td>
        <td class="dot-cell"><div class="dot" style="background:${color}"></div></td>
        <td class="content">
          <div class="event-title">${e.title}</div>
          <div class="event-meta">
            <span class="cat-badge" style="background:${color}22;color:${color}">${catLabel}</span>
            <span class="duration">${formatDur(e.duration_minutes)}</span>
            ${e.location ? `<span class="location">📍 ${e.location}</span>` : ''}
          </div>
          ${e.notes ? `<div class="notes">${e.notes}</div>` : ''}
        </td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', serif; background: #FDFAF8; padding: 48px 40px; color: #333; }
  .header { margin-bottom: 36px; border-bottom: 2px solid #C9A96E; padding-bottom: 20px; }
  .event-name { font-size: 28px; color: #C9A96E; font-weight: bold; letter-spacing: 1px; }
  .event-date { font-size: 15px; color: #888; margin-top: 4px; }
  .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 16px; font-family: sans-serif; }
  table { width: 100%; border-collapse: collapse; }
  .time { width: 80px; font-size: 13px; color: #C9A96E; font-weight: bold; padding: 10px 8px 10px 0; vertical-align: top; white-space: nowrap; font-family: sans-serif; }
  .dot-cell { width: 20px; vertical-align: top; padding-top: 12px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .content { padding: 8px 0 16px 12px; border-bottom: 1px solid #F0EBE3; vertical-align: top; }
  .event-title { font-size: 16px; color: #333; font-weight: bold; margin-bottom: 4px; }
  .event-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .cat-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-family: sans-serif; }
  .duration { font-size: 12px; color: #888; font-family: sans-serif; }
  .location { font-size: 12px; color: #888; font-family: sans-serif; }
  .notes { font-size: 12px; color: #888; margin-top: 4px; font-style: italic; }
  .footer { margin-top: 40px; font-size: 11px; color: #ccc; text-align: center; font-family: sans-serif; }
</style>
</head>
<body>
  <div class="header">
    <div class="event-name">${eventName}</div>
    <div class="event-date">${dateStr} &nbsp;·&nbsp; Day-of Timeline</div>
  </div>
  <div class="section-title">Schedule</div>
  <table><tbody>${rows}</tbody></table>
  <div class="footer">Generated by Stefana · Wedding Planner</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const dest = (FileSystem.documentDirectory ?? '') + `${sanitizeFilename(eventName)}_timeline.pdf`;
  await FileSystem.moveAsync({ from: uri, to: dest });

  await Sharing.shareAsync(dest, {
    mimeType: 'application/pdf',
    dialogTitle: 'Export Day-of Timeline',
    UTI: 'com.adobe.pdf',
  });
}

// ─── Budget PDF ───────────────────────────────────────────────────────────────

export async function exportBudgetPdf(
  expenses: Expense[],
  vendors: Vendor[],
  eventName: string,
  totalBudget: number | null,
): Promise<void> {
  const totalSpent = sumExpenses(expenses);
  const remaining = (totalBudget ?? 0) - totalSpent;
  const over = remaining < 0;

  const CAT_LABELS: Record<string, string> = {
    venue: 'Venue', catering: 'Catering', photography: 'Photography',
    videography: 'Videography', florals: 'Florals', music: 'Music',
    attire: 'Attire', hair_makeup: 'Hair & Makeup', cake: 'Cake',
    invitations: 'Invitations', transport: 'Transport', accommodation: 'Accommodation',
    honeymoon: 'Honeymoon', favors: 'Favors', officiant: 'Officiant',
    rentals: 'Rentals', legal: 'Legal', other: 'Other',
  };

  const byCategory = totalsByCategory(expenses);

  const categoryRows = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `
      <tr>
        <td class="cat-name">${CAT_LABELS[cat] ?? cat}</td>
        <td class="cat-amt">$${toAmount(amt).toLocaleString()}</td>
        <td class="cat-pct">${totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0}%</td>
      </tr>`).join('');

  const expenseRows = expenses
    .sort((a, b) => b.paid_date.localeCompare(a.paid_date))
    .map(e => {
      const vendor = vendors.find(v => v.id === e.vendor_id);
      return `
        <tr>
          <td class="exp-desc">${e.description}${vendor ? `<br><span class="vendor-tag">${vendor.business_name}</span>` : ''}</td>
          <td class="exp-cat">${CAT_LABELS[e.category] ?? e.category}</td>
          <td class="exp-date">${new Date(e.paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
          <td class="exp-amt">$${toAmount(e.amount).toLocaleString()}</td>
        </tr>`;
    }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', serif; background: #FDFAF8; padding: 48px 40px; color: #333; }
  .header { margin-bottom: 36px; border-bottom: 2px solid #C9A96E; padding-bottom: 20px; }
  .event-name { font-size: 28px; color: #C9A96E; font-weight: bold; }
  .event-sub { font-size: 15px; color: #888; margin-top: 4px; }
  .summary { display: flex; gap: 32px; background: white; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #E8E0D8; }
  .sum-item { flex: 1; }
  .sum-value { font-size: 24px; font-weight: bold; color: #333; }
  .sum-over { color: #D32F2F; }
  .sum-label { font-size: 12px; color: #999; margin-top: 4px; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 12px; font-family: sans-serif; }
  table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; background: #F5F0EB; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 10px 12px; border-bottom: 1px solid #F0EBE3; vertical-align: top; }
  .cat-name { font-weight: 600; color: #333; }
  .cat-amt { text-align: right; font-weight: bold; color: #333; }
  .cat-pct { text-align: right; color: #888; }
  .exp-desc { color: #333; font-size: 13px; }
  .exp-cat { color: #888; }
  .exp-date { color: #888; white-space: nowrap; }
  .exp-amt { text-align: right; font-weight: bold; color: #333; }
  .vendor-tag { font-size: 11px; color: #C9A96E; }
  .footer { margin-top: 40px; font-size: 11px; color: #ccc; text-align: center; font-family: sans-serif; }
</style>
</head>
<body>
  <div class="header">
    <div class="event-name">${eventName}</div>
    <div class="event-sub">Budget Summary</div>
  </div>

  <div class="summary">
    <div class="sum-item">
      <div class="sum-value">$${totalSpent.toLocaleString()}</div>
      <div class="sum-label">Total Spent</div>
    </div>
    ${totalBudget ? `
    <div class="sum-item">
      <div class="sum-value">$${totalBudget.toLocaleString()}</div>
      <div class="sum-label">Total Budget</div>
    </div>
    <div class="sum-item">
      <div class="sum-value ${over ? 'sum-over' : ''}">${over ? '-' : ''}$${Math.abs(remaining).toLocaleString()}</div>
      <div class="sum-label">${over ? 'Over Budget' : 'Remaining'}</div>
    </div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">By Category</div>
    <table>
      <thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">%</th></tr></thead>
      <tbody>${categoryRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">All Expenses</div>
    <table>
      <thead><tr><th>Description</th><th>Category</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${expenseRows}</tbody>
    </table>
  </div>

  <div class="footer">Generated by Stefana · Wedding Planner</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const dest = (FileSystem.documentDirectory ?? '') + `${sanitizeFilename(eventName)}_budget.pdf`;
  await FileSystem.moveAsync({ from: uri, to: dest });

  await Sharing.shareAsync(dest, {
    mimeType: 'application/pdf',
    dialogTitle: 'Export Budget Summary',
    UTI: 'com.adobe.pdf',
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export { csvCell, sanitizeFilename } from './exportFormatters';
