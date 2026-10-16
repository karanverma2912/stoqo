## Pending follow-up — no new APK requested

Barcode capture inside the product form; quick add/remove stock from Inventory;
useful assistant shortcuts without AI setup; icon-only selected tab highlights;
clearer push availability; and shared startup readiness recovery are saved in
source. Live demo stock and the external API health schedule are recorded in
[the next-batch handoff](native-next-batch.md). The installed 0.3.1 APK does not
contain these later app changes. Firebase configuration remains required before
background push can be verified in the next APK.

## 0.3.1 — Android version code 4

- Refresh sign-in/signup, dashboard, inventory, checkout, workspace, assistant and store setup with shared typography, icons, light/dark palettes and reduced-motion-aware native interactions.
- Show validation beneath the relevant field, explain the 12-character signup password minimum, and add password visibility controls.
- Preserve role permissions, checkout confirmation and retry behavior, and held-cart workflows.

The signed native APK `Stoqo-0.3.1-Android.apk` is built and signature-verified. It uses the same permanent signing certificate as 0.3.0 and can be installed as an update. EAS build: `608d82d9-db1f-47d7-9941-cab8293216f7`, completed 16 October 2026 at 05:28:51 UTC. Physical-device validation remains part of rollout.

Native Android release with inventory, barcode scanning, checkout, bill PDFs, returns, customer history, suppliers, employee invitations, live store updates and a Gemini assistant interface with voice input.

The app uses the Stoqo Rails API and shared store records. AI answers require the operator's Gemini API key; automatic invitation emails require SMTP credentials. Background push requires Expo/Firebase credentials. The app shows availability when these services are not connected.

Verify the store workflows on physical Android devices before a public rollout. Offline stock synchronization and Bluetooth thermal-printer integration are not included in this release.
