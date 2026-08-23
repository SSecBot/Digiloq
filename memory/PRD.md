# KASA - Nakit Akış Yönetim Uygulaması

## Original Problem Statement
Alacakları, giderleri, banka hesaplarını ve yaklaşan ödemeleri tek ekrandan yönetebileceğim bir nakit akış yönetim uygulaması oluştur.

## User Choices
- Tek kullanıcılı (kişisel kullanım - auth yok)
- Çoklu para birimi (TRY, USD, EUR)
- Tüm özellikler dahil
- AI yok
- Koyu tema

## Architecture
- Backend: FastAPI + MongoDB (Motor async), /api prefix
- Frontend: React 19 + React Router 7 + Tailwind + Shadcn UI + Recharts + date-fns
- Dark-mode "Performance Pro" theme (Manrope + IBM Plex Sans/Mono, brand yellow #F5D90A)

## Implemented (Feb 2026)
- Dashboard (Genel Bakış): 4 KPI cards, 30-day cash flow forecast (Area), 14-day realized income vs expense (Bar), Upcoming payments 14d list
- Receivables (Alacaklar): CRUD, mark-as-paid (auto increments matching account balance), filter by status
- Expenses (Giderler): CRUD, mark-as-paid (auto decrements account balance), category, filter
- Bank Accounts (Banka Hesapları): CRUD with per-currency totals
- Upcoming Payments (Yaklaşan Ödemeler): 60-day calendar view with dot indicators, day-detail list, quick close

## Backend Endpoints
- CRUD /api/accounts, /api/receivables, /api/expenses
- POST /api/receivables/{id}/mark-paid, /api/expenses/{id}/mark-paid
- GET /api/dashboard/summary, GET /api/upcoming-payments

## Backlog
- P1: CSV/PDF export, multi-currency conversion (FX rate), recurring transactions
- P2: Notification for overdue items, quick capture from mobile, PWA install
- P2: PIN/Face ID protection
