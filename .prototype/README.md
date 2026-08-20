# FIFA Tournament System - Live Interactive Showcase Prototype 🏆

A complete, standalone, **zero-backend frontend prototype** of the Global FIFA Tournament System. Designed specifically for instant client demonstrations, UI/UX evaluation, and **1-click deployment on Vercel**.

---

## ✨ Features Included in this Prototype

1. **📺 Spectator Live Cinema Display (`/display`)**:
   - 16:9 full-screen cinema layout with glowing stadium particles.
   - Live Match Scoreboard with real-time goal animations and stopwatch clock.
   - Dynamic Standings League Table with live point calculations.
   - Knockout Playoff Tree Bracket with winner highlights.
   - Match Fixtures and schedule order.
   - On-screen cinema tab switcher and fullscreen toggle.

2. **🎮 Referee Live Match Control (`/control`)**:
   - High-contrast electric cyan (+Home Goal) and neon gold (+Away Goal) buttons.
   - Instant goal undo and match lifecycle states (*Start*, *End*, *Confirm*, *Restart*).
   - Digital stopwatch timer controls (*Play*, *Pause*, *Reset*, *+30s*, *-30s*).
   - **0ms Instant Sync**: Open `/control` and `/display` in two separate tabs/windows side-by-side to experience 0ms real-time state synchronization via `BroadcastChannel`.

3. **⚙️ Tournament & Schedule Suite (`/schedule`)**:
   - Tournament rules and formats (*Round Robin*, *Single Elimination*, *Hybrid Groups+Knockouts*).
   - Single leg vs Home & Away (2 legs) modes.
   - Team roster management.
   - Smart bulk auto-scheduler with customizable match intervals.
   - Round progression overview.

4. **⏱️ PS5 Station Runtimes (`/stations`)**:
   - Live PlayStation 5 console station cards (PS5 #1 to #6).
   - Active session timers and per-hour revenue billing calculator.
   - One-click Start / Stop session toggles.

5. **🎨 Brand Identity & Theme Studio (`/branding`)**:
   - Real-time color customizer (Primary Accent and Secondary Glow).
   - Instant live CSS variable injection with preview.

6. **💰 Financial Ledger (`/finance`)**:
   - Entry fees, sponsor funds, hall operating expenses, and calculated net profits.
   - Interactive expenses ledger with Add / Delete item.

7. **👥 Super Admin Multi-Tenant Portal (`/super-admin`)**:
   - Venue management (Cairo Arena, PlayZone Alex, CyberLounge Giza).
   - Hardware console count allocator (PS5 devices per venue).
   - Subscription licensing dates and status badges.

8. **🌐 100% Bilingual AR / EN**:
   - Seamless one-click toggle between English and Egyptian Arabic across every view with full layout direction flipping (`ltr`/`rtl`).

---

## 🚀 How to Run Locally

```bash
# Navigate to the prototype directory
cd .prototype

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## ☁️ How to Deploy to Vercel

### Option 1: Vercel CLI
```bash
cd .prototype
npx vercel
```

### Option 2: Git Repository Subdirectory
1. Push your repository to GitHub.
2. In the Vercel Dashboard, create a **New Project** and import this repository.
3. Under **Root Directory**, click **Edit** and set it to `.prototype`.
4. Click **Deploy**!
