# SMART QR PRINT

**Print Smarter. Study Better. Achieve More.**

An intelligent printing and student-productivity platform: QR-based smart printing, an AI
student assistant, an AI notes generator, a PDF workspace, and a shop-owner console — in one
visually consistent SaaS product.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build
```

The build is a static SPA that uses **HashRouter**, so it runs from any static host with no
rewrite rules (deep links look like `/#/app/print`).

### Demo accounts

| Role       | Email                     | Password   |
| ---------- | ------------------------- | ---------- |
| Student    | `student@demo.com`        | `demo1234` |
| Shop owner | `owner@vertexprint.in`    | `demo1234` |

You can also register a fresh account as either role. Passwords are stored locally in this
build only — see *What is real and what is a placeholder* below.

---

## What is in the product

### Public
- Landing page: hero with an animated dashboard preview and live QR card, feature grid,
  smart-printing walkthrough with a live order-summary card, AI assistant and notes sections,
  PDF tools, how-it-works, benefits, testimonials (clearly labelled sample content), FAQ,
  about, final CTA, footer.
- Login, Sign up (student / shop owner), Forgot password.
- Public shop page `/shop/:shopId` — the page a scanned QR opens (shop profile, rates,
  printer availability, shareable QR code).

### SMART AI AGENT (always-on)
- Agent console at `/app/agent`: five agent types (print monitor, exam revision planner,
  study buddy reminder, document caretaker, shop queue watcher), triggers (every N hours,
  daily at a time, on an event), per-agent permissions, enable/pause, run now, run history,
  activity feed.
- A runtime keeps it alive: a 30-second heartbeat plus a visibility catch-up pass while the
  app is open, an event bus fed by real order/note changes, and a notification feed in the
  header with unread badge.
- `server/agent-worker.mjs` is the same rules as a Node service, so the agents keep checking
  when no browser tab is open. A run is only recorded when it actually happened — nothing is
  back-filled or claimed.

### Student workspace (`/app`)
- Dashboard: greeting, five quick actions, KPIs, pending orders, recent documents, recent AI
  conversations, usage overview, saved notes, shop status, order history.
- **Smart QR printing**: 7-step flow — shop (QR or picker) → upload PDF → preview (real
  browser PDF render) → options (page ranges, copies, colour, duplex, paper, binding) →
  summary with live cost from the shop's rates → payment → tracking across
  uploaded / payment pending / payment verified / in queue / printing / completed / failed.
  Includes duplicate-order guard, cancellation rules, retention acknowledgement and printer
  availability with an estimated wait.
- **AI assistant**: conversation list, subjects, suggested prompts, file attachment, copy,
  regenerate, clear chat, markdown-ish rendering.
- **AI notes**: topic / PDF / pasted material sources, seven generation formats, editable
  result, save, organise by subject, download as PDF and print (browser print engine).
- **PDF editor**: page thumbnails, rotate, reorder, delete, select, merge queue, split input,
  text extraction, AI proofread / grammar / formatting / summary, export-a-copy flow.
- **Documents**: search, sort, retention countdown, delete.
- **Orders**: filters, detail drawer, order history, cancellation.
- **Profile**: personal info, notifications, privacy controls.

### Shop console (`/shop-owner`)
- Overview: KPIs, weekly bar chart, recent orders, printer health, "needs attention",
  customers, open/close shop.
- Orders: filters, search, verify payment, advance stage, mark failed with a reason, reprint.
- Queue: printer list with status and toner, live queue with start/complete.
- Pricing: all rates, A3 multiplier, binding, retention hours, live price preview.
- Analytics: revenue trend, status mix, colour vs B&W, largest jobs.
- Settings: shop profile, downloadable QR code, public shop link.

---

## Architecture

```
src/
  App.jsx                    routes + page transitions
  context/
    AuthContext.jsx          session, login/signup/logout, profile updates
    DataContext.jsx          documents, notes, conversations, orders, shops, printers
  lib/
    agent.js                 agent types, tasks, scheduler, run log, notifications
    db.js                    local persistence layer (mirrors Supabase calls)
    seed.js                  demo data (clearly demo-only)
    pricing.js               the price formula + page-range parser
    ai.js                    AI adapter — reads VITE_AI_ENDPOINT, never a key
    supabase.js              documented production adapter
  components/                ui.jsx (Button, Card, Badge, Modal, …), Navbar, Toast, Guards
  pages/                     Landing, Login, Signup, ForgotPassword, ShopScan
    student/                 layout + 8 pages
    shop/                    layout + 6 pages
supabase/
  schema.sql                 tables, enums, RLS policies, storage bucket, functions
  functions/ai-chat/index.ts reference Edge Function (server-side provider key)
```

Design tokens live in `src/index.css` (`@theme`): dark navy surfaces, electric-blue accent,
Sora for display type and Inter for UI. All motion is Framer Motion and respects
`prefers-reduced-motion` both in CSS and through `MotionConfig reducedMotion="user"`.

---

## What is real and what is a placeholder

**Real and working**
- Every route, form, validation rule, navigation link and dashboard.
- The pricing engine (per page × sheets × copies × paper factor + binding), live in the UI.
- The full order lifecycle, status history, duplicate guard and cancellation rules.
- Documents library, notes editor/save/delete, PDF page operations, text-layer extraction.
- QR generation (real scannable codes), shop page, printer state management.
- Sign in / sign up / role separation (a student cannot open `/shop-owner`).

**Labelled placeholders — the UI says so, and nothing is faked**
- **AI provider**: no endpoint is configured, so the assistant and notes generator return an
  explicit "AI provider is not connected" message instead of inventing an answer. Set
  `VITE_AI_ENDPOINT` (and the provider key server-side) to switch them on.
- **Payment gateway**: "Proceed to pay" reports that no gateway is configured; the order stays
  at *Payment pending*. A clearly-labelled **development control** stands in for the gateway
  webhook so the workflow can be demonstrated — it never claims a payment succeeded.
- **Physical printing**: the shop owner moves the order through the queue; the platform never
  reports a print job as done on its own.
- **Merge / split / compression / conversion**: interfaces complete, operations need a
  server-side PDF service; the buttons say so.
- **Email**: password reset and email notifications are not delivered in this build.
- **Storage**: files stay in browser memory; production uses a private Supabase bucket with
  scheduled deletion (`purge_expired_documents()`).

## Real payments (Razorpay — hackathon build)

Step 6 now opens **real Razorpay Checkout** (UPI / card / netbanking / wallet) instead of a
placeholder. After a verified payment the app shows a full-screen celebration — confetti,
animated tick, receipt and a pickup code — then "Track my print" and "go collect your prints"
steps. The demo checkout is still there underneath, clearly labelled TEST MODE.

**Enable it (2 minutes, free test keys — no real money moves):**

1. Sign up at razorpay.com → Dashboard → **Test Mode** → Settings → API Keys → Generate.
2. Local: create `.env.local` with `VITE_RAZORPAY_KEY_ID=rzp_test_...` and `npm run dev`.
   Vercel: Project → Settings → Environment Variables → add `VITE_RAZORPAY_KEY_ID`
   (Production + Preview) → Redeploy.
3. Pay with test credentials: UPI `success@razorpay`, or card `4111 1111 1111 1111`
   (any future expiry, any CVV) — see https://razorpay.com/docs/payments/payments/test-card-details.
4. Without the key the card shows "Not configured" and judges use the demo flow — nothing is faked.

Only the **key id** (`rzp_test_...`) is public by design. The key secret stays with Razorpay /
your server — this build records verification client-side for the hackathon demo and labels
every receipt accordingly. For production, verify `razorpay_signature` server-side before
releasing the job.

## AI on Vercel (Google Gemini, free tier) — the deployed setup

```
api/
  _lib_adapter.js  bridges Vercel (req, res) to the shared helpers
  ai-chat.js       AI Assistant + PDF assistant (proofread / grammar / format / summary)
  ai-notes.js      structured notes from PDF text, pasted text or a topic
  ai-agent.js      agent study questions -> answer + a saved study note
  ai-health.js     connection test used by the AI provider page
vercel.json        build (vite -> dist), 60s function timeout, cache + security headers
```

The implementation itself lives once, in `netlify/functions/_lib/ai.mjs` (key handling, the
Gemini call, error mapping, rate limits). The Vercel functions import it, so both hosts behave
identically and there is nothing to keep in sync. The `netlify/` folder is kept so the same
repo can still deploy to Netlify.

**Deploy to Vercel**

1. Import `kunalpatil08-op/smart-qr-print` at vercel.com/new.
2. Framework preset **Vite** — build `npm run build`, output `dist` (already in `vercel.json`).
3. Project → Settings → Environment Variables → add:

   | Key | Value | Environments |
   | --- | --- | --- |
   | `GEMINI_API_KEY` | `AIza...` (aistudio.google.com/app/apikey) | Production, Preview, Development |

4. Redeploy. The browser calls `/api/ai-chat` (relative), so no build-time variable is needed.

Optional variables: `AI_MODEL` (default `gemini-3.1-flash-lite`), `AI_HOURLY_LIMIT` (10),
`AI_DAILY_LIMIT` (50), `ALLOWED_ORIGIN` (comma-separated origins), `AI_THINKING` (`on` to let
Gemini think — slower, better answers).

Free-tier mapping: 429 -> *quota used up today / slow down*, 400 API_KEY_INVALID -> *bad key*,
SAFETY finish reason -> *blocked, rephrase*, 5xx -> *Gemini server error, retry*.

**The key never leaves the server.** No `VITE_` variable ever holds a secret; the only AI
values that reach the browser are the endpoint path and the model name.

**Debugging a failed call.** Every function prints one structured line per request:

```
[ai] {"ts":"...","fn":"ai-chat","ok":false,"status":502,"code":"bad_key","model":"gemini-3.1-flash-lite",
      "ms":42,"client":"web_ab12","promptChars":9,"err":"Google rejected the API key..."}
```

No key, header or user text is ever logged — only lengths, ids and outcomes. Those lines are in
Vercel → Deployments → Functions → Logs.

Local development with the functions running:

```bash
npm i -g vercel
vercel dev           # serves the site AND /api/* on http://localhost:3000
```

`scripts/mock-gemini.mjs` is a local stand-in for the Gemini endpoint used only to prove the
wiring (it can force 429/500/safety). It is never used by the app.

## Turning the AI on (the "AI provider is not connected" message)

That message is the app refusing to invent an answer. To get real replies:

**Zero-key, runs on this computer — `server/ai-local.mjs`** (this is what the live build uses)

```bash
npm install node-llama-cpp     # once
AI_LOCAL_SIZE=tiny npm run ai:local   # tiny | small (default) | medium
# model: Qwen2.5-Instruct GGUF, downloaded once to ~/.cache/smartqr-models
# then: VITE_AI_ENDPOINT=http://127.0.0.1:8787/ai-chat  &&  npm run build
```

The model runs locally through node-llama-cpp, so there is no API key and nothing leaves
the machine. `GET /health` reports `ready` / `model` / `error`.

**Cloud key — `server/ai-gateway.mjs`**

```bash
AI_API_KEY=sk-...  AI_BASE_URL=https://api.openai.com/v1  AI_MODEL=gpt-4o-mini \
  node server/ai-gateway.mjs          # http://127.0.0.1:8787

# then, in .env.local
VITE_AI_ENDPOINT=http://127.0.0.1:8787/ai-chat
npm run build
```

**Production — `supabase/functions/ai-chat`**

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy ai-chat
# VITE_AI_ENDPOINT=https://<project>.supabase.co/functions/v1/ai-chat
```

Any OpenAI-compatible provider works (OpenAI, Groq, OpenRouter, Hugging Face router,
Gemini's compatible endpoint, Anthropic via a proxy). The gateway and the edge function
share one contract: `POST { messages, system, temperature } -> { content }`, plus a
`GET /health` on the gateway that reports whether the key is present.

In the app, **AI provider** (`/app/ai-settings`) walks through this, shows the live
connection state, and tests the endpoint — it never stores a key in the browser.

## Going to production

1. Create a Supabase project and run `supabase/schema.sql`.
2. `npm i @supabase/supabase-js`, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and
   point `src/lib/db.js` at the functions documented in `src/lib/supabase.js`.
3. Deploy `supabase/functions/ai-chat` with `OPENAI_API_KEY` set as a secret; set
   `VITE_AI_ENDPOINT` to its URL.
4. Add your payment provider (Razorpay/Stripe) webhook → verify signature → insert into
   `payments` → call `advance_order(id, 'payment_verified')`.
5. Schedule `purge_expired_documents()` with pg_cron.

All money and status changes run through `SECURITY DEFINER` functions in the database, so a
client cannot submit a tampered total or promote its own order.
