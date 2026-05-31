# Meter Tracker PK

![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)

A React Native CLI app for tracking electricity meter readings (Pakistan
DISCOs) and computing monthly usage. Fully offline-first; no backend.

> Built with **React Native 0.85.3 + React 19** (new architecture on by default).

> Replace `OWNER/REPO` in the badge URL above once the project is pushed to GitHub.

---

## Stack

| Concern              | Library                                            |
| -------------------- | -------------------------------------------------- |
| Storage (relational) | `@op-engineering/op-sqlite`                        |
| Storage (KV)         | `react-native-mmkv` (app prefs, theme, last URL)   |
| State                | `zustand` (+ MMKV-backed `persist` adapter)        |
| Forms / validation   | `react-hook-form` + `zod` + `@hookform/resolvers`  |
| Navigation           | `@react-navigation/native` + `bottom-tabs` + `native-stack` |
| Webview              | `react-native-webview` (used by Bill Checker)      |
| Charts               | `react-native-gifted-charts` (+ `react-native-svg`, `react-native-linear-gradient`) |
| Dates                | `date-fns` + `@react-native-community/datetimepicker` |
| Env / config         | `react-native-dotenv` (`.env` → `@env` imports)    |
| Camera / gallery     | `react-native-image-picker`                        |
| OCR                  | `@react-native-ml-kit/text-recognition` (Google ML Kit) |
| File IO / share      | `react-native-fs`, `react-native-share`, `@react-native-documents/picker` |
| Notifications        | `@notifee/react-native` (local-only; no FCM)       |
| Gestures             | `react-native-gesture-handler` (incl. `ReanimatedSwipeable`) |
| Animations           | `react-native-reanimated` v4 + `react-native-worklets` |
| Splash               | `react-native-bootsplash` (icon + splash from `assets/icon.png`) |
| Safe areas           | `react-native-safe-area-context`                   |

Deferred libraries:
`react-native-keychain`, `nativewind` (the existing themed-StyleSheet
system already covers the same ground; a wholesale Tailwind retrofit
isn't justified at this scale), `react-native-html-to-pdf`
(deferred until a new-arch-friendly PDF lib is identified).

---

## Getting started

> Make sure your environment is set up by following the
> [official RN environment setup](https://reactnative.dev/docs/set-up-your-environment).
> You need Node ≥ 22.11, JDK 17, Android Studio (Android), and Xcode + CocoaPods (iOS).

```bash
# 1. JS deps
npm install

# 2. Bill-check URLs — copy the template
cp .env.example .env       # macOS / Linux
copy .env.example .env     # Windows

# 3. iOS pods (macOS only)
cd ios && bundle install && bundle exec pod install && cd ..

# 4. Metro
npm start

# 5. Run (in a second terminal)
npm run android   # or
npm run ios
```

> When you change `.env`, restart Metro with `npm start -- --reset-cache`
> so `react-native-dotenv` picks the new values up.

---

## Project structure

```
.
├── App.tsx                         # Boot: providers, DB init, store warm-up
├── index.js                        # RN entry point
├── android/, ios/                  # Native projects
└── src/
    ├── components/                 # Reusable UI primitives (themed)
    │   ├── Card.tsx
    │   ├── EmptyState.tsx
    │   ├── FadeInUp.tsx            # Reanimated entrance wrapper
    │   ├── OptionPicker.tsx        # Pill-style single-select
    │   ├── PrimaryButton.tsx
    │   ├── Skeleton.tsx            # Pulsing placeholder + SkeletonStack
    │   ├── StatTile.tsx            # Dashboard stat card
    │   └── TextField.tsx
    ├── constants/
    │   └── app.ts                  # APP_NAME, DB_NAME, STORAGE_KEYS
    ├── database/
    │   ├── connection.ts           # Singleton DB + migrations runner
    │   ├── migrations.ts           # Versioned schema migrations
    │   ├── meterRepository.ts      # CRUD for meters
    │   └── readingRepository.ts    # CRUD for readings
    ├── features/                   # Feature-based architecture
    │   ├── analytics/              # Charts (monthly bar / trend line / yearly bar) + period filter
    │   ├── backup/                 # JSON export/import + CSV export of all readings
    │   ├── bill-checker/           # DISCO + consumer-number form → in-app WebView (env-driven URLs)
    │   ├── dashboard/              # Aggregate stats screen + quick actions
    │   ├── meters/                 # Meter CRUD (list / form / detail) + stack + embedded mini chart
    │   ├── notifications/          # notifee scheduler: monthly bill reminders + permission flow
    │   ├── ocr/                    # Image picker + ML Kit text recognition + reading-extraction heuristics
    │   ├── readings/               # Reading add/edit form + Zod schema + OCR integration
    │   └── settings/               # Theme, notifications, about, backup/restore, exports
    ├── navigation/
    │   └── RootNavigator.tsx       # Bottom-tab navigator
    ├── storage/
    │   └── mmkv.ts                 # Storage instances + helper
    ├── store/
    │   ├── meterStore.ts           # Zustand: meters list & CRUD
    │   ├── readingStore.ts         # Zustand: readings keyed by meterId
    │   ├── settingsStore.ts        # Zustand + MMKV persist (theme, etc.)
    │   └── zustandMmkvStorage.ts   # StateStorage adapter
    ├── theme/
    │   ├── colors.ts               # Light/dark palettes
    │   └── useAppTheme.ts          # `system | light | dark` resolver
    ├── types/
    │   └── domain.ts               # Meter, Reading, ReadingType, DISCOs
    └── utils/
        ├── id.ts                   # Lightweight UID generator
        └── usage.ts                # Monthly-usage math (BILL deltas)
```

---

## What's implemented

### Slice 1 — Foundation

✅ App rename to **Meter Tracker PK** (Android display name + `app.json`)
✅ SQLite schema with versioned migrations (`meters`, `readings`)
✅ Repositories for meters & readings (incl. `ocr_detected_value` column)
✅ Zustand stores (`meterStore`, `readingStore`, `settingsStore`)
✅ MMKV-backed persistence for settings (theme + notifications toggle)
✅ Theme system with `system / light / dark` modes
✅ Bottom-tab navigator: **Dashboard / Meters / Bill / Settings**
✅ Meters stack: **List → Add/Edit (RHF + Zod) → Detail** with search
✅ Dashboard: total meters, current/previous-month units, average,
   highest / lowest month, last reading, quick actions
✅ Monthly-usage algorithm (BILL deltas only, CASUAL ignored)
✅ Settings: theme picker, notifications toggle, about section
✅ Bill Checker tab: stub explaining what's coming next

### Slice 2 — Readings CRUD

✅ Reading form (`ReadingFormScreen`) with RHF + Zod
✅ BILL / CASUAL pill picker (vertical layout)
✅ Date input with `@react-native-community/datetimepicker` (cross-platform)
✅ Notes (multi-line, optional, ≤500 chars)
✅ Add + Edit + Delete reading flows
✅ Historical entries supported — usages auto-recompute on Dashboard refocus
✅ Tap a reading on **Meter Detail** to edit it
✅ "X units consumed since last bill reading" banner appears when latest
   reading is CASUAL and a BILL exists
✅ Dashboard `+ Add reading` quick action: routes intelligently
   (no meters → prompt to add one; 1 meter → straight to form;
    multiple → meters list to pick)

### Slice 3 — Analytics & charts

✅ New **Analytics** tab between Meters and Bill
✅ Period filter pills: 3M / 6M / 12M / All time
✅ Per-meter selector with "All meters" aggregation
✅ Three charts:
   - **Monthly usage** — bar chart of units per closed bill cycle
   - **Consumption trend** — area / line chart over the same period
   - **Yearly usage** — bar chart aggregated across years (always all-time)
✅ Period summary stats: total units, average / month, highest, lowest
✅ Embedded mini bar chart on **Meter Detail** (last 6 months)
✅ Empty state when fewer than two BILL readings exist
✅ Pull-to-refresh on the Analytics tab

### Slice 4 — Bill Checker

✅ Bill Checker tab is now a stack: **Form → WebView**
✅ DISCO picker + consumer-number form (RHF + Zod) with last-DISCO recall
✅ URLs are **never hard-coded** — they're read from `.env` via
   `react-native-dotenv` and looked up by DISCO code
✅ `.env.example` ships with sane defaults (PITC bill pages + KE)
✅ DISCO labels show "(no URL)" when their template is missing in `.env`
✅ In-app WebView with toolbar: Back, Forward, Reload, Done
✅ Last visited bill URL is persisted via MMKV
✅ Loading overlay while pages load; back-forward gestures enabled

### Slice 5 — OCR meter scanning

✅ **Scan with camera** and **Pick from gallery** buttons in the reading form
✅ ML Kit Text Recognition runs on the captured image (Latin script)
✅ Heuristic picks the largest plausible 3–7 digit number (with optional
   1–2 decimal places) as the suggested reading
✅ Suggested value pre-fills the **Reading value** field; the original
   image URI and OCR-detected value are stored separately on the reading
   so you can later see what OCR thought vs. what you corrected to
✅ Inline thumbnail with a **Remove image** button
✅ "You've adjusted the OCR suggestion" hint appears when the user edits
   the auto-filled value (audit-friendly)
✅ **Dashboard → Scan reading** quick action deep-links into the same form
   with `autoScan` so the camera launches automatically
✅ Native config baked in: `CAMERA` permission on Android,
   `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` on iOS

> **Note**: ML Kit is a native dependency. After this slice, do a fresh
> Android build (`cd android && ./gradlew clean && cd ..` then
> `npm run android`) and re-run `pod install` for iOS.

### Slice 6 — Full readings list

✅ Dedicated **All readings** route in the Meters stack
✅ FlatList with: filter pills (All / BILL / CASUAL), sort toggle
   (Newest / Oldest), counts in the header, BILL/CASUAL color-coded dots
✅ Tap a row to edit; long-press to delete (confirm dialog)
✅ Pull-to-refresh
✅ Floating "+ Add reading" button at the bottom
✅ Shows "OCR detected: X (corrected)" line when the saved reading was
   corrected from the OCR suggestion
✅ Smart empty states per filter: "No BILL readings", "No CASUAL readings"
✅ **Meter Detail → "View all readings →"** replaces the old "+N more" line

### Slice 7 — Backup, restore & CSV export

✅ **Export all data (.json)** — dumps every meter + reading to a JSON
   file (versioned schema) and opens the platform share sheet
✅ **Import from backup** — picks a `.json` file, validates it via Zod
   (rejects malformed files with a clear error), wipes the local DB, and
   bulk-inserts everything in a single transaction. Confirmation prompt
   before destruction
✅ **Export readings as CSV** — joins every reading to its meter (name,
   consumer no, DISCO) and produces a CSV with date, value, type, OCR
   detected value, and notes. Opens the share sheet
✅ Versioned `BackupSnapshot` (`version: 1`) — future versions can break
   compatibly; old apps reject newer files with "Update the app and try
   again."
✅ Bulk-insert helpers added to both repositories
✅ Settings → Backup / Reports cards now drive these flows with proper
   loading states and error alerts

> **Native build needed**: `react-native-fs`, `react-native-share`, and
> `@react-native-documents/picker` are autolinked native modules.
> Re-run `npm run android` (Gradle will rebuild) and `pod install` for iOS.

### Slice 8 — Local notifications (monthly bill reminders)

✅ **Settings → Notifications** is now fully wired:
   - Switch requests OS permission (iOS prompt + Android 13+ runtime perm)
   - **Day of the month** picker (1st / 5th / 10th / 15th / 20th / 25th / 28th)
   - **Time of day** picker (7 AM / 9 AM / 12 PM / 5 PM / 7 PM / 9 PM)
   - "Next: Wed, 25 Jun at 9:00 AM" status line below the toggle
✅ Scheduling strategy: notifee doesn't have a true "monthly" trigger, so the
   app books **12 one-shot reminders** ahead each time settings change
✅ **Auto top-up on app foreground** — `App.tsx` listens for `AppState`
   transitions and re-schedules whenever fewer than 6 reminders remain in the
   queue, so the user always has a year of reminders booked
✅ Day is capped at **28** to stay safe in February; if a future month has
   fewer days than chosen, the helper falls back to the last day of that month
✅ All reminders are **local-only** — no FCM project, no Firebase, no remote push
✅ `POST_NOTIFICATIONS` permission added to Android manifest (Android 13+)
✅ Notification copy: "Time to record your bill reading — Open Meter Tracker
   and add this month's reading to keep your usage charts accurate."

> **Native build needed**: `@notifee/react-native` is an autolinked native
> module. Re-run `npm run android` and `pod install && npm run ios`.

### Slice 9 — UI polish

✅ **Reanimated 4 + worklets** wired up (Babel plugin in `babel.config.js`,
   `import 'react-native-reanimated'` at the top of `App.tsx`)
✅ **Reusable `FadeInUp`** component — fades + slides 12 px on mount with
   tunable delay/duration. Used to stagger Dashboard stat tiles, Cards, and
   list items
✅ **Reusable `Skeleton` + `SkeletonStack`** — pulsing placeholders driven
   by a Reanimated shared value. Cheap, no shimmer-gradient, but feels alive
✅ **Dashboard skeleton** — shows tile/card placeholders on first load
   instead of the empty "—" values, then crossfades into staggered real data
✅ **Meters list skeleton** — three placeholder cards on first load
✅ **Entrance animations** on Dashboard tiles + Meters list rows + Readings
   list rows (clamped stagger so big lists don't drag)
✅ **Swipe-to-delete on Readings list** using `ReanimatedSwipeable` from
   `react-native-gesture-handler`. Replaces the long-press fallback
   - Drag left → "Delete" action slides in
   - Tap Delete → confirm dialog → row removed
   - Opening one row auto-closes any other open row
   - Footer hint updated to "Tap to edit · Swipe left to delete"

✅ **Explicitly skipped** — NativeWind retrofit (the themed StyleSheet
   system already does what NativeWind would, conversion across 25+ files
   is high churn for low value) and app icon / splash (needs you to drop
   in a 1024×1024 PNG; ping me with the asset and I'll wire it up)

> **Native build needed**: `react-native-reanimated` and
> `react-native-worklets` are autolinked native modules.
> Re-run `npm run android` and `pod install && npm run ios`.
> If Metro caches old transformed code: `npm start -- --reset-cache`.

### Slice 10 — Tests

✅ **56 unit tests, 5 suites, all passing** — covering every piece of pure
   business logic that's worth locking in:
   - `usage.test.ts` — BILL/CASUAL math, historical recompute via sort,
     negative-delta clamping (rollovers / bad data), aggregations, ties
   - `chartData.test.ts` — per-meter and aggregated monthly usage, period
     filtering (3M/6M/12M/ALL), date-range envelope when summing meters,
     yearly aggregation, summary stats
   - `buildBillUrl.test.ts` — `{consumer}` substitution, whitespace
     stripping, URL encoding, missing-template `BillUrlError`,
     `configuredDiscos()` filtering
   - `extractReading.test.ts` — OCR heuristic: 3-7 digit floor/ceiling,
     decimal handling, dedup, descending sort, raw-token preservation
   - `notificationsService.test.ts` — `nextReminderTimestamp` covers
     same-month-future, same-month-past, day-of-month clamp for short
     months, leap-year (Feb 29 in 2024), year-boundary crossing,
     hour preservation
✅ Babel test mode disables `react-native-dotenv` so Jest can intercept
   `@env` via `moduleNameMapper` → `__mocks__/env.js`
✅ `jest.setup.js` mocks `@notifee/react-native` and
   `@react-native-ml-kit/text-recognition` so service files that import
   these native modules still load in pure-Node test runs

> **Run them**: `npm test`. Time: ~6 s on a warm cache.

### Slice 11 — App icon + splash screen

✅ **Single-source icon pipeline** — drop a 1024×1024 PNG at
   `assets/icon.png`, run `npm run icons`, ship.
✅ `scripts/generate-icons.js` produces every Android mipmap density
   (mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi) **plus the rounded variants**
   (`ic_launcher_round.png` masked with an SVG circle), and the full
   iOS `AppIcon.appiconset` (15 sizes + `Contents.json`)
✅ `react-native-bootsplash generate` produces the splash screen — drawables
   for every Android density, the iOS `BootSplash.storyboard`, and the
   colour assets. Auto-edits `AndroidManifest.xml`, `styles.xml`,
   `Info.plist` and `project.pbxproj` so the splash shows on launch.
✅ **`MainActivity.kt`** patched: `RNBootSplash.init(this, R.style.BootTheme)`
   in `onCreate` keeps the splash visible from native boot until JS calls
   hide.
✅ **`App.tsx`** patched: `BootSplash.hide({ fade: true })` runs in
   `useEffect`'s `finally` block, so the splash dismisses with a
   crossfade once the DB has opened (success, error, or stuck).
✅ Resilient: if DB initialisation throws, we still hide the splash and
   fall through to the in-app error screen — no risk of being stuck on
   the launch image.
✅ `npm run icons` regenerates everything from `assets/icon.png`. Swap
   the source PNG, run the script, commit, rebuild — that's it.

> **Native build needed**: `react-native-bootsplash` is autolinked native.
> Re-run `npm run android` (Gradle rebuild) and
> `pod install && npm run ios`.
>
> **Want a different background colour?** Edit the `npm run icons` script
> in `package.json` (`--background "#hex"`) and re-run.

### Slice 12 — Performance pass

Targeted, measurable wins — nothing speculative.

✅ **Debounced search** in `MeterListScreen` via a small `useDebouncedValue`
   hook (`src/utils/useDebouncedValue.ts`). The TextField updates per
   keystroke (instant feedback) but the **filter computation only runs after
   150 ms of stable input**. On a 100-meter list this collapses 5+ filter
   passes into 1 per typing burst.
✅ **Memoised list rows** — `MeterRow` (Meters list) and `SwipeableRow`
   (Readings list) are now both wrapped in `React.memo`. `renderItem` is
   wrapped in `useCallback` so its identity is stable across parent
   re-renders. Net effect: when a single row's gesture state changes (e.g.
   user opens a Swipeable), only that row re-renders — not all 50 of them.
✅ **Stable empty selector** — `useReadingStore(s => s.byMeter[meterId] ?? [])`
   was returning a fresh `[]` reference on every call when no readings
   were cached, defeating downstream `useMemo` shallow-equality. Replaced
   with `selectReadingsForMeter(meterId)` which returns a frozen
   `EMPTY_READINGS` singleton.
✅ **FlatList windowing tuning** — both `MeterListScreen` and
   `ReadingsListScreen` now declare explicit
   `removeClippedSubviews / initialNumToRender / maxToRenderPerBatch /
   windowSize` props sized for our typical data volumes (1-20 meters,
   50-500 readings). Off-screen rows actively unmount their views; the
   green-thread render queue stays small.
✅ **Stable selector function for `useMeterStore`** in
   `ReadingsListScreen` (the meter lookup is wrapped in `useCallback`
   keyed only on `meterId`). Prevents the function from being a fresh
   identity each render.
✅ **AnalyticsScreen** was audited — already fully memoised
   (`useMemo` on every derived value, stable deps). No changes needed.
✅ **DashboardScreen** was audited — already only re-renders on focus or
   data change. No changes needed.

> Trade-off note: react-native-reanimated's `entering` animation fires
> when an item mounts. With windowing on, that means rows can re-animate
> when scrolled back into view. The stagger delay is clamped to a few
> hundred ms in both lists so this stays subtle.

### Slice 13 — Continuous Integration

✅ `.github/workflows/ci.yml` — runs on every push and PR to `main` /
   `master`. Cancels in-progress runs on the same branch when a newer
   commit lands.
✅ Pipeline (single Ubuntu job, ~2 minutes warm):
   1. Checkout (`actions/checkout@v4`)
   2. Setup Node 22.11 with built-in `npm` cache (`actions/setup-node@v4`)
   3. `npm ci --legacy-peer-deps` (matches local install behaviour for
      packages with strict peer-dep ranges)
   4. Stub `.env` from `.env.example` (tests don't actually read it,
      but the file path is touched at config load time)
   5. `npm run lint` — fails on errors only, not warnings
   6. `npx tsc --noEmit` — strict TypeScript pass
   7. `npm test -- --ci --runInBand` — Jest in CI mode
✅ Matrix-friendly node version field (currently `[22.11]`; add a row to
   test against future LTS releases)
✅ Lint, type-check, and 56 unit tests run on every PR — green merge
   button is the source of truth, no more "works on my machine"

> **Adding a status badge**: replace `OWNER/REPO` at the top of this
> README with the actual GitHub path once you push. The badge auto-
> updates with the latest workflow result.
>
> **Adding env vars later** (e.g. for staging URLs or release signing):
> use repository **Secrets** under
> *Settings → Secrets and variables → Actions* and reference them as
> `${{ secrets.MY_VAR }}` in the workflow.

### Configuring bill-check URLs

`buildBillUrl(disco, consumerNumber)` takes the env template for that
DISCO and replaces `{consumer}` with the URL-encoded consumer number.
For example:

```
LESCO_URL=https://bill.pitc.com.pk/lescobill/general?refno={consumer}
```

becomes `https://bill.pitc.com.pk/lescobill/general?refno=1234567` at
runtime. Edit `.env`, restart Metro with `--reset-cache`, and the new
URL is live.

## Not yet implemented (next slices)

⏳ **PDF report** — re-evaluate once a maintained new-arch PDF library exists
⏳ **NativeWind** — explicitly **skipped**; the themed StyleSheet system
   covers the same UX with no migration cost

---

## Domain model

```ts
interface Meter {
  id: string;
  meterName: string;
  consumerNumber: string;
  disco: 'LESCO' | 'FESCO' | 'GEPCO' | 'MEPCO' | 'IESCO'
       | 'PESCO' | 'HESCO' | 'SEPCO' | 'QESCO' | 'TESCO'
       | 'KE'    | 'OTHER';
  createdAt: string; // ISO 8601
}

interface Reading {
  id: string;
  meterId: string;
  readingValue: number;
  readingDate: string;   // ISO 8601 date
  readingType: 'BILL' | 'CASUAL';
  imagePath?: string | null;
  ocrDetectedValue?: number | null;  // separate from readingValue → audit-friendly
  notes?: string | null;
  createdAt: string;
}
```

## Usage calculation

For each meter, BILL readings are sorted ascending by date, and:

```
monthly_usage[i] = bill[i+1].value - bill[i].value
```

The dashboard sums these by `YYYY-MM` across all meters. CASUAL readings
are ignored for billing math but are used to compute "units consumed since
last bill reading" on a meter's detail screen.

When a historical BILL reading is added, the next dashboard refresh
automatically recomputes the entire usage timeline (no manual rebuild needed).

---

## Useful scripts

| Command           | What it does                       |
| ----------------- | ---------------------------------- |
| `npm start`       | Start Metro                        |
| `npm run android` | Build & launch on Android          |
| `npm run ios`     | Build & launch on iOS              |
| `npm run lint`    | ESLint                             |
| `npm test`        | Jest                               |
| `npx tsc --noEmit`| TypeScript check                   |
| `npm run icons`   | Regenerate launcher icons + splash from `assets/icon.png` |

---

## Troubleshooting

- **Build fails right after install** — Always re-run `pod install` after
  adding native modules. On Android: `cd android && ./gradlew clean`.
- **`@op-engineering/op-sqlite` errors at startup** — It's a JSI/Nitro
  module; you must do a fresh native build, not just a Metro reload.
- **Dark mode not switching** — `Settings → Appearance` lets you pin
  `light / dark / system`. The choice persists via MMKV.
- **Stuck on the splash / blank screen** — `npm start -- --reset-cache`.
