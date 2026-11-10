# Rounds

A fillable morning-rounds sheet (built from Outline v3) that syncs between devices with end-to-end encryption.

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
