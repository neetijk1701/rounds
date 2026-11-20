# Rounds

A fillable morning-rounds sheet (built from Outline v3) that syncs between devices with end-to-end encryption.

## Features
- One tab per patient plus an **All** list (room, one-liner, code status, "A&P not updated", labs left to verify, every open to-do).
- **Present** view: read-only, large text, in presenting order, with ←/→ between patients.
- Lab boxes (BMP, CBC, Ca/Mg/Phos) with arrows vs the last value and high/low coloring.
- Fillable vitals (with O₂ device), I/O (net auto), Epic-style exam (WNL/Abnl per system + finding chips), cultures/imaging/consults lists that persist across days, code-status chips. Every section keeps a free-text notes box.
- To-dos that carry over each day until checked; checked ones clear on New day.
- "Copy yesterday's exam" (grayed until edited), move today → Prior per field, A&P carried forward grayed.
- Works offline: a service worker (`public/sw.js`) caches only the app shell, never patient data or `/api`.

## MICU mode (micu.js, merged into the page by build.js)
Per-patient toggle (Patient info → Rounding mode). Adds an ICU snapshot, structured overnight events, hemodynamics + pressor table,
respiratory/ventilator with PBW, Vt/PBW, driving pressure and compliance, ABG/VBG helper (P/F arterial only, Winter's, AG/delta),
neuro/RASS/CAM + sedation drips, renal (UOP mL/kg/h, Cr vs baseline, RRT/CRRT), antimicrobials, devices with daily necessity review,
ICU lab panel + tracked-lab trends, systems-based A/P, today's goals (→ to-dos), Yes/No/N/A/Deferred safety checklist, and a
full/brief presenting view. New day moves ICU values to Prior; "Copy yesterday's" brings a section back grayed until checked.

## Privacy model
- Notes live in each device's browser storage, encrypted with that device's passcode (AES-GCM, PBKDF2 key).
- Sync: a random 120-bit pairing code is made on the first device and handed to others by QR code or typing.
  The QR link carries the code in the URL `#fragment`, which browsers never send to the server.
  From the code each device derives the encryption key and a vault id (HKDF).
- The Worker stores only `{rev, ciphertext}` per vault id in a Durable Object. It never gets the code or key,
  so it can't read anything. Vaults delete themselves after 30 days without a save.
- The page's Content-Security-Policy allows network requests only to its own `/api/` (`connect-src 'self'`).
  No analytics, fonts, or third-party scripts. Worker observability/logging is off.
- "Erase synced data everywhere" deletes the vault and leaves a marker; every paired device erases its own copy
  the next time it opens (even while locked).

## Build & deploy
```
npm install
node build.js          # inlines the QR library: app.html -> public/index.html
npx wrangler deploy    # or connect the repo to a Cloudflare Worker named "rounds"
```
Edit `app.html`, not `public/index.html`, and run `node build.js` before committing.
