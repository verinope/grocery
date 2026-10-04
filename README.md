# Belanja

A personal grocery list PWA with shopping history, receipt scanning, and an optional Indonesian recipe catalog. One user, one active list, with no login or backend database.

## Getting started

Requires Node.js 22 or later and pnpm (Capacitor 8 requires Node.js 22+).

```sh
pnpm install
pnpm dev
```

Open **http://localhost:5173**. `pnpm dev` builds the app and starts the preview server. After changing the code, stop and restart the preview, then use the **Perbarui** (Update) button when a new version is available. Use a fresh browser profile to check changes without an existing cache.

```sh
pnpm test
pnpm build
pnpm start
```

Build output is written to `dist/` and can be deployed at the root of an HTTPS static hosting site. No API service, environment secrets, or database server setup is required.

## User flow

- Add items using autocomplete for Indonesian grocery names; quantity and unit are optional. Tap a row to check it off or the pencil icon to edit it. Checking and deleting an item can be undone briefly afterward.
- **Selesai belanja** (Finish shopping) becomes available once every item is checked off. Choose to scan a receipt or save without one.
- Take a photo or choose one from the gallery. Tesseract runs OCR on the device; review the extracted results. Product names, line prices, and the total paid can be corrected, and products can be added or removed.
- Each product price represents the total for that receipt line, rather than the unit price. The total paid is recorded separately to account for discounts and taxes. Any difference is shown for review.
- History stores the completion time, original list, actual purchases, prices, total paid, and receipt photo. A receipt can be added to a previous trip without changing the active list or that trip's date.
- Unfinished scans are saved as drafts. The active list is cleared only after the history entry and photo have been saved successfully in a single transaction.

## Recipes

Open **Mau masak apa?** from the shopping list to browse **100 Indonesian recipes** across eight categories. **Cari nama masakan** searches dish names only. Recipe details include ingredients, cooking steps, and source attribution. Food photos are deferred; the catalog uses text cards.

Choose the ingredients you need, then add them to the existing shopping list. New items start without a shopping quantity or unit; edit them using the pencil button. Original recipe measurements remain available as a reference. There is no serving selector, automatic scaling, or quantity summation. Repeated ingredient names become one choice, with their separate recipe references retained. Ingredients already on the list keep their amount and checkmark and can be edited from the selection screen.

The collection is adapted from Wikibuku bahasa Indonesia and its contributors under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Each detail screen links to the pinned source revision, contributor history, and license. This license covers the adapted recipe content, including `public/data/recipes.json`, and does not assign a license to the application code. Source snapshots and extraction details are in [artifacts/recipes/README.md](artifacts/recipes/README.md). The recipes have structural and provenance checks; they have not been cooking-tested, and editorial review remains necessary before a public product release.

`scripts/build-recipes.mjs` creates the local catalog from the reviewed collection whenever the app is built. It extracts shopping names and applies explicit corrections from `scripts/recipe-name-overrides.json`, while retaining source ingredient text. No scraping or external recipe request takes place in the app. After initial offline preparation, browsing, searching, reading recipes, and adding ingredients work without a network connection.

## PWA and data storage

The app, fonts, icons, OCR engine, and language model are included in the build and cached for offline use. The first installation requires an internet connection and downloads approximately 40 MB of assets. Wait for **Siap dipakai offline** (Ready for offline use) on the List Belanja screen before testing airplane mode. The English language model supports Latin characters on Indonesian receipts; abbreviated product names and poor photos may still require manual corrections.

On iPhone, open the HTTPS URL in Safari → Share → Add to Home Screen. Camera access, service workers, and PWA installation require HTTPS, except when using localhost on a computer. A local network HTTP URL can be used to preview the interface but is not sufficient for installation and offline use on iPhone.

Data is stored in IndexedDB on the device and browser being used. Photos are not sent to external services. Clearing site or browser data may delete lists and history; syncing across devices and backups are not included in the MVP. Persistent storage is requested after saving a receipt, subject to browser policy.

## Project structure and tests

`src/app.js` manages screens and interactions; `domain.js` enforces list and archive rules; `storage.js` handles atomic transactions and version checks across tabs; `receipt.js` parses amounts and receipt lines; `ocr.js` prepares photos and runs OCR. `recipes.js` handles recipe search, ingredient grouping, and additions; `recipe-ui.js` renders the optional recipe flow. `scripts/build.mjs` generates the recipe asset, copies assets, and generates a service worker whose version is based on the build contents.

`pnpm test` covers archive rules, validation, autocomplete, receipt parsing, recipe search, and ingredient additions. `tests/browser.mjs` tests complete flows in Chrome with Playwright, including OCR, reloads, attaching receipts to history, storage rollback, and offline use. `tests/recipes-browser.mjs` checks catalog browsing, source attribution, ingredient selection, editable quantities, retry after a concurrent storage change, offline recipes, and shopping history. To run them, make the `playwright` package available (or set `PLAYWRIGHT_MODULE` to an existing module path), start the preview server, then run `node tests/browser.mjs` and `node tests/recipes-browser.mjs`.

Design reference: [Belanja on Figma](https://www.figma.com/design/VxHTl9pk3bRZ3xBjGjkQiA). Navigation and checkbox icons come from that design. OCR documentation: [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md).

## Android APK

APK build output for personal testing: `artifacts/Belanja-0.1.0-debug.apk`. APKs, deployment ZIPs, SDKs, installed dependencies, and signing keys are excluded from Git; use the scripts below to generate them locally. This is a signed debug build, not a Play Store release. The package includes the entire UI, fonts, OCR engine, and language model, so it needs no hosting or asset downloads on first launch. The service worker runs only in the PWA; Android uses assets bundled in the APK.

Copy the APK to an Android phone, open it using the Files app, allow installation from that app if Android prompts you, then tap Install. App name: **Belanja**; ID: `id.belanja.personal`; version: `0.1.0`. Requires Android 7/API 24 or later and an up-to-date Android System WebView. Camera and gallery access use native Capacitor plugins. The Back button dismisses an open sheet or navigates back, and minimizes the app when already on the shopping list screen.

PWA and APK data are separate, with no automatic migration from the browser. Android backup is disabled to keep data and photos on the device. Clearing app data or uninstalling removes local data. To update, install the new APK over the existing app using the same application ID and signing key.

Rebuild on Windows:

```powershell
./scripts/setup-android.ps1  # Run once to download the official SDK and JDK
pnpm android:build
```

Tools, SDKs, the Gradle cache, and the debug key are stored in `.android-tools/` on the project's drive. The scripts verify JDK/SDK download checksums and the APK signature. Android Studio is not required for builds using these SDK tools, but the `android/` project can still be opened in Android Studio.

Keep `.android-tools/signing/debug.keystore` for future updates to the test build. The debug key is unsuitable for production distribution; a public release needs a dedicated release key and release process. The APK's SHA-256 checksum is recorded in `artifacts/Belanja-0.1.0-debug.apk.sha256`.

For optional Android emulator testing, use `scripts/setup-emulator.ps1`; the virtual device and emulator cache are also stored in `.android-tools/`. Camera capture still needs testing with actual receipts on a physical phone.

`scripts/verify-apk.py` checks every asset in the APK against the web build, including the `.gz` language model that AAPT expands into `.traineddata`. OCR uses `gzip: false` on Android and `gzip: true` in the PWA. Run the script with Python, or set `BELANJA_PYTHON` before building to run verification automatically.

The APK build and signature have been verified, and browser flows and offline OCR have passed testing. The emulator on the build machine could not boot without virtualization acceleration; the APK has not been tested on a physical phone. Package verification results are recorded in `artifacts/verification.json`.

`tests/apk-ocr.mjs` also successfully ran real OCR in Chromium using assets extracted from the APK, following the Android code path (`gzip: false`) with no requests to external services. This verifies the packaged OCR assets, but does not test the camera or WebView runtime on an Android device.

## Cloudflare hosting

The current deployment uses **Cloudflare Workers Static Assets** at [Belanja](https://throbbing-bread-b3df.veagul-pepito.workers.dev/). Shopping lists, history, OCR, and offline reloads and scanning have passed Chromium tests at that URL. It has not been tested on a physical iPhone. Verification results are recorded in `artifacts/cloudflare-verification.json`.

The recipe update has passed local browser and offline testing. Upload the newly generated static package to update the live site; previous deployment verification does not cover this update. On an existing installation, tap **Perbarui** when the new version becomes available. Lists and history stay in the same browser's IndexedDB during a normal app update.

Build the PWA and Direct Upload package:

```sh
pnpm build
python scripts/package-cloudflare.py
```

Upload `artifacts/Belanja-PWA-Cloudflare.zip` as an asset update to the existing **throbbing-bread-b3df** Worker. Keep the same project and URL so existing device storage remains accessible. No paid domain or backend is required. Instructions are in `artifacts/UPLOAD-CLOUDFLARE.md`.

The `_headers` file contains Cloudflare configuration and is intentionally excluded from the precache list. Browsers continue to use the `.traineddata.gz` model; the uncompressed model without `.gz` is used only in the Android APK.
