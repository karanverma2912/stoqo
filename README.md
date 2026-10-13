# Stoqo

**Your stock. In a good place.** A mobile-first inventory SaaS for small businesses.

Stoqo includes an Expo React Native Android/iOS app, a Rails API and a Next.js website. See [native launch status](docs/native-launch.md) for implemented workflows and remaining provider/store-release requirements.

## Included

- Landing page, signup/login, business onboarding, membership workspace selector
- Responsive dashboard, searchable/filterable/paginated inventory, product detail/edit
- Locked stock ledger with signed movements, retry keys, negative-stock protection and history
- Categories, optional images, SKU/barcode, camera/manual barcode lookup
- Stock reports, CSV export, asynchronous CSV/XLSX import with per-row errors
- Business activity log, in-app alerts, configurable trials and plan records
- Light/dark/system themes, command palette, mobile bottom navigation and sheets
- Installable PWA manifest/icons and offline fallback (no offline stock writes)
- RSpec/FactoryBot security/domain tests, frontend API tests, GitHub Actions CI

## Structure

```text
backend/       Rails 8.1 API, PostgreSQL, Solid Queue and Solid Cable
mobile/        Expo 57 / React Native / TypeScript
legacy/        Previous Android WebView implementation
frontend/      Next.js 16 / React 19 / TypeScript
docs/         Architecture, API, deployment and verification
.github/       Independent backend/frontend CI jobs
```

## Quick start

Requirements: Docker Compose, Node.js 24 and npm. Ruby 3.4.5 is needed only when running Rails outside Docker.

```bash
docker compose up --build
# In a second terminal:
cp frontend/.env.example frontend/.env.local
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open http://localhost:3000 and create an account. API: http://localhost:3001. Docker automatically prepares the development schema and seeds plans. These local database credentials are development-only. Docker is not a production deployment configuration.

For native Rails setup:

```bash
cd backend
cp .env.example .env
# Export these variables in your shell; Rails does not automatically load .env.
bundle install
bundle exec rails db:prepare db:seed
bundle exec puma -C config/puma.rb
# Separate terminal with the same exported environment:
bundle exec ruby bin/jobs
```

## Checks

```bash
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
cd backend
RAILS_ENV=test bundle exec rails db:prepare
bundle exec rspec
```

Tests need a PostgreSQL test database. CI supplies one. Test credentials default to `postgres:postgres` on localhost with database `stoqo_test`. Override `TEST_DATABASE_URL` as needed.

## Deploy

The free pilot uses Render for Rails/Next.js and the existing Supabase PostgreSQL project with a private schema. Jobs, realtime delivery and limited uploads share PostgreSQL; Redis and paid object storage are optional. Free Render instances sleep and share monthly running-hour limits. This setup does not promise unlimited traffic or always-on production availability.

See [deployment instructions](docs/deployment.md), [native app and launch requirements](docs/native-launch.md) and [API contract](docs/api.md). Native source is in `mobile/`; Android releases are built by `.github/workflows/android.yml`. Payments, offline stock synchronization and Bluetooth printer integration remain separate work. Email, Gemini and background push require provider credentials.
