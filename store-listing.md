# Stefana — App Store Listing Copy

## App Name
Stefana – Wedding Planner

## Subtitle (iOS, 30 chars max)
Plan your perfect wedding day

## Short Description (Google Play, 80 chars)
Beautiful, simple wedding planning. Checklist, budget, guests & AI help.

## Full Description

**Your wedding, beautifully planned.**

Stefana is the calm, elegant wedding planning app built for real couples — not overwhelming spreadsheets or cluttered dashboards. Everything you need, nothing you don't.

**Plan your timeline**
A smart checklist auto-generates your full wedding timeline the moment you set a date — organized by 12, 9, 6, 4, 2, and 1 month milestones. Add your own custom tasks anytime. Long-press to delete. Simple.

**Track your budget**
Log every deposit and payment by category. Watch your budget ring fill up. Get alerted before you go over.

**Manage your vendors**
Keep every florist, photographer, and caterer in one place. Track their status from shortlisted → contacted → booked. One tap to call, email, or open their website.

**Your guest list, organized**
Manage RSVPs, plus-ones, dietary notes, and table assignments. See who's confirmed and who still needs a nudge.

**Wedding party task delegation** *(Premium)*
Assign checklist tasks to your bridal party and groomsmen. Each person gets a unique share code to view and complete their tasks — no app install required.

**AI Wedding Assistant** *(Premium)*
Ask anything. Get vendor email drafts, day-of timelines, budget tips, and personalized advice — all powered by Claude AI and aware of your specific wedding details.

**Gift Registries**
Keep all your registry links in one place — Zola, The Knot, Amazon, Target, and more. One tap to open any registry and share with guests.

**Song Wishlist**
Plan your music for every moment — processional, first dance, cocktail hour, reception, and last dance. Build your wishlist and hand it off to your DJ or band.

**Wedding Day Forecast**
When your big day is 10 days away, Stefana automatically shows the weather forecast right on your Day-of Timeline so you can plan accordingly.

**Your wedding colors**
Choose from 10 hand-crafted color palettes to match your wedding theme. The entire app shifts to match — hero card, tab bar, and accents.

**Smart reminders**
Never miss a deadline. Get notified before tasks are due, with weekly countdowns as your big day approaches.

---

**Free plan:** 1 wedding, core checklist
**Premium ($7.99/mo or $74.99/yr):** AI assistant, wedding party, unlimited tasks
**Pro ($19.99/mo or $189.99/yr):** Multi-client management for wedding planners

---

## Keywords (iOS, 100 chars)
wedding,planner,checklist,budget,guest list,RSVP,vendor,bride,groom,AI,planning

## Category
Lifestyle

## Age Rating
4+

## Privacy Policy URL
https://cssmith615.github.io/stefana

## Support URL
https://cssmith615.github.io/stefana/support.html

---

## What's New (v1.0.0)
Initial release of Stefana — your calm, elegant wedding planning companion.

---

## Screenshot Captions (in order)

> Order tells a story that converts: Hook → core tool → money → social → premium → supporting → fun.

1. **Dashboard** — "Count down to your perfect day" — Gold gradient hero card, countdown, stats strip. First impression, has to be beautiful.
2. **Checklist** — "Every task, every milestone" — Timeline grouped by phase with progress bar. Shows core value immediately.
3. **Budget** — "Budget clarity at a glance" — SVG donut ring with category breakdown. Visually distinctive, stands out in the App Store grid.
4. **Guest List** — "Your guest list, sorted" — RSVP summary strip. Brides recognize this pain immediately.
5. **AI Assistant** — "AI that knows your wedding" — Show a realistic useful response (vendor email draft or day-of timeline). Premium differentiator.
6. **Vendors** — "All your vendors, one place" — Status badges, clean and organized.
7. **Wedding Party** — "Delegate to your wedding party" — Member cards with roles and share codes. Shows the collaboration angle.
8. **Event Settings** — "Make it yours" — Palette picker showing multiple color themes. Unique, visually striking, shows personalization.

**Device specs:**
- iOS: iPhone 15 Pro — 6.7" (1290 × 2796px)
- Android: Pixel 8 — 1080 × 2400px minimum

**Mockup tools:** Shots.so, AppMockUp, or Figma device frames

---

## Google Play Store — Additional Info

### App Details (Play Console)
- **App name:** Stefana: Wedding Planner
- **Package name:** `com.stefana.weddingplanner`
- **Default language:** English (United States)
- **App category:** Lifestyle
- **Tags:** wedding, planner, bride
- **Contact email:** support@aisleapp.wedding (or charles.smith615@gmail.com)
- **Privacy Policy URL:** https://cssmith615.github.io/stefana

### Content Rating Questionnaire (Play Console)
When Play asks about content — answer:
- Violence: No
- Sexual content: No
- Profanity: No
- Controlled substances: No
- User-generated content: Yes (wedding notes, vendor notes — private, not shared publicly)
- Personal/sensitive data: Yes (email address for auth)
→ Expected rating: **Everyone**

### In-App Products (Play Console → Monetize → Subscriptions)
Create a subscription group, then add two products:

| Product ID | Name | Price | Billing period |
|---|---|---|---|
| `com.stefana.weddingplanner.premium_monthly` | Stefana Premium | $7.99 | Monthly |
| `com.stefana.weddingplanner.premium_yearly`  | Stefana Premium (Annual) | $74.99 | Yearly |
| `com.stefana.weddingplanner.pro_monthly`     | Stefana Pro | $19.99 | Monthly |
| `com.stefana.weddingplanner.pro_yearly`      | Stefana Pro (Annual) | $189.99 | Yearly |

### Data Safety (Play Console — required)
Under "Data types collected":
- **Personal info → Name:** Collected, not shared, used for account management
- **Personal info → Email address:** Collected, not shared, used for authentication
- **App activity → App interactions:** Collected, not shared, used for core functionality
- **Photos and videos → Photos:** Optional, collected only if user adds moodboard images
- Does your app share data with third parties? **Yes** — Supabase (data storage), Anthropic (AI, only when user sends a message)
- Is data encrypted in transit? **Yes**
- Can users request data deletion? **Yes** (via Profile → Delete Account)

### Google Service Account (for EAS automated submit)
EAS needs a Google service account to upload builds automatically.
Steps:
1. Go to **Google Play Console → Setup → API access**
2. Click **"Link to a Google Cloud project"** (create new if needed)
3. Click **"Create new service account"** → follow the Google Cloud link
4. In Google Cloud Console: create service account → add role **"Service Account User"**
5. Download the JSON key file
6. Back in Play Console: grant the service account **"Release manager"** permissions
7. Save the JSON file as `google-service-account.json` in the aisle project root
8. **Never commit this file** — it's already in .gitignore

### EAS Build + Submit Commands (Android)
```powershell
# Run from Windows PowerShell in C:\Users\charl\aisle

# Build production AAB (Android App Bundle)
npx eas-cli build --platform android --profile production

# Submit to Play Store internal track (after first manual upload)
npx eas-cli submit --platform android --profile production
```

> **Note:** The very first build must be manually uploaded to Play Console to create the app.
> After that, `eas submit` handles it automatically via the service account.

### Play Store Screenshots
Same 8 screenshots as iOS but exported at Android resolution:
- Phone: 1080×1920px minimum, up to 3840×2160px
- Play Console accepts the same images as iOS if they're the right dimensions
