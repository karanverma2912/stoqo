## 0.3.1 changes — APK build pending

- Refresh sign-in/signup, dashboard, inventory, checkout, workspace, assistant and store setup with shared typography, icons, light/dark palettes and reduced-motion-aware native interactions.
- Show validation beneath the relevant field, explain the 12-character signup password minimum, and add password visibility controls.
- Preserve role permissions, checkout confirmation and retry behavior, and held-cart workflows.

The signed 0.3.0 APK remains the latest completed build until 0.3.1 is built and its certificate is verified.

Native Android release with inventory, barcode scanning, checkout, bill PDFs, returns, customer history, suppliers, employee invitations, live store updates and a Gemini assistant interface with voice input.

The app uses the Stoqo Rails API and shared store records. AI answers require the operator's Gemini API key; automatic invitation emails require SMTP credentials. Background push requires Expo/Firebase credentials. The app shows availability when these services are not connected.

Verify the store workflows on physical Android devices before a public rollout. Offline stock synchronization and Bluetooth thermal-printer integration are not included in this release.
