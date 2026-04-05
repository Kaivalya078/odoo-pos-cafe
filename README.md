<div align="center">

<h1>☕ POS Cafe</h1>

<p><strong>A full-stack, role-based Restaurant Point-of-Sale & Management System</strong><br/>
Built with the MERN stack — MongoDB · Express · React (Vite) · Node.js</p>

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

</div>

---

## 📌 Overview

**POS Cafe** is a production-ready restaurant management platform that digitises the entire service workflow — from a customer browsing the menu on their phone to the owner reviewing revenue charts at the end of the day.

The system implements strict **role-based access control**, **real-time order tracking**, a **mobile-first public interface**, and a **comprehensive analytics dashboard**, all within a single unified codebase.

---

## ✨ Feature Highlights

| Area | Features |
|------|----------|
| 🛒 **Ordering** | Mobile-first menu, variant & add-on selection, cart, booking conflict warnings |
| 🍳 **Kitchen** | Live order queue, per-item preparation tracking, Kanban-style status board |
| 💳 **Cashier** | Booking-conflict order review, session-based billing, Cash / UPI / Card payment, QR code generation |
| 📅 **Booking** | 3-step mobile wizard, auto table assignment (best-fit algorithm), 15-min slot availability |
| 📊 **Analytics** | Revenue by category (pie), payment methods (bar), hourly revenue (histogram), top products, business insights |
| 👥 **User Management** | Owner creates/manages all staff accounts with role assignment |
| 🏪 **Restaurant Control** | Open/Close toggle, operating hours config, UPI ID management |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT (React + Vite)                 │
│                                                         │
│  Public (no auth)          Protected (JWT + Role)       │
│  ┌──────────────────┐     ┌──────────────────────────┐  │
│  │ /menu            │     │ /owner  → OwnerPanel     │  │
│  │ /tables          │     │ /analytics → Analytics   │  │
│  │ /order           │     │ /admin  → AdminPanel     │  │
│  │ /book            │     │ /kitchen → KitchenScreen │  │
│  └──────────────────┘     │ /cashier → CashierScreen │  │
│                           └──────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP + JWT
┌───────────────────────▼─────────────────────────────────┐
│              EXPRESS API SERVER (:5000)                  │
│                                                         │
│  /api/auth       /api/orders      /api/kitchen          │
│  /api/bookings   /api/cashier     /api/admin/reports/*  │
│  /api/menu       /api/products    /api/restaurant       │
└───────────────────────┬─────────────────────────────────┘
                        │ Mongoose ODM
┌───────────────────────▼─────────────────────────────────┐
│                     MONGODB                             │
│  Users · Orders · Products · Tables · Sessions          │
│  Bookings · Floors · Restaurant                         │
└─────────────────────────────────────────────────────────┘
```

---

## 👤 Role Matrix

| Role | Access |
|------|--------|
| **OWNER** | Everything — Owner Panel, Analytics, Admin Panel, Kitchen, Cashier |
| **ADMIN** | Admin Panel (products, tables, bookings, analytics), Kitchen screen, Cashier screen (incl. conflict-order approval) |
| **KITCHEN** | Kitchen screen only |
| **CASHIER** | Cashier screen only |
| *(public)* | Menu, Table Selection, Ordering, Booking (no login required) |

---

## 🗄️ Data Models

```
User          — name, email, password (bcrypt), role
Order         — table, session, customerName, items[], totalAmount, status, paymentStatus
  └─ items[]  — product (ref), name, category, variant, addons[], quantity, preparedQuantity, itemTotal
Table         — tableNumber, floor (ref), seats, status (FREE/OCCUPIED/RESERVED)
Session       — table, status (OPEN/CLOSED), openedAt, closedAt, paymentMethod, totalRevenue
Booking       — table, name, phone, startTime, endTime, status (BOOKED/CANCELLED/COMPLETED/EXPIRED)
Product       — name, category, description, availability, variants[], addons[], image
Floor         — name (links tables to physical floor zones)
Restaurant    — status (OPEN/CLOSED), openingHour, closingHour, upiId
```

### Order Status Lifecycle
```
PLACED  →  APPROVED  →  PREPARING  →  PREPARED
       ↘ REJECTED

Note: Orders with NO booking conflict are auto-approved at placement time
      and skip the PLACED state entirely → directly visible in Kitchen.
      Orders on tables with a booking within 15 min stay PLACED until
      a Cashier reviews and approves or rejects them.
```

---

## 📺 User Journeys

### Customer Ordering
```
Browse /menu → Select table at /tables → Build cart at /order
→ Submit order
   ├─ No booking conflict → auto-APPROVED → Kitchen sees it immediately
   └─ Booking within 15 min → stays PLACED → Cashier reviews (approve/reject)
→ Kitchen prepares → Cashier collects payment → Table freed
```

### Table Booking
```
/book → Pick date → Guests adjusted → Best-fit table auto-assigned
→ Choose time from dropdown → Name + phone → Confirmed
→ Admin can complete or cancel from AdminPanel
```

### Owner Analytics
```
/analytics → Summary cards (revenue, orders, AOV, sessions)
           → Pie chart (revenue by category)
           → Bar chart (payment method counts)
           → Histogram (hourly revenue)
           → Top 5 products with progress bars
           → Insights box (best hour, top item)
```

---

## 🔑 Key Technical Decisions

**Best-fit table assignment** — On the booking page, available tables are filtered by `seats >= guestCount`, sorted ascending, and the smallest suitable table is selected. This maximises capacity efficiency without any backend change.

**Auto-approve with smart conflict detection** — On order creation, `createOrder` calls `getUpcomingBooking` for the table. If no booking exists within 15 minutes, the order is immediately set to `APPROVED`, a session is created, and the table is marked `OCCUPIED` — no manual step required. If a conflict is found, the order stays `PLACED` and surfaces as an amber notification in the Cashier screen, where staff can approve (→ Kitchen) or reject.

**Denormalised order items** — Each `orderItem` stores `name`, `category`, `variant`, and `addons` at order time. Receipts stay accurate even if a product's price changes in future.

**Slot availability computed on-the-fly** — The booking API generates all 15-minute slots between `openingHour` and `closingHour`, then subtracts existing `BOOKED` entries. No slot documents are stored in the database.

**`asyncHandler` wrapper** — All controllers are wrapped to eliminate `try/catch` boilerplate. Errors propagate to the centralised `errorHandler` middleware.

**Single CSS file, phase-tagged** — `index.css` (~6,000 lines) uses named section comments (`PHASE 8 — Analytics`, `PHASE 9 — Booking`) with BEM-style prefixes (`bk-`, `pm-`, `ts-`, `an-`) per feature area.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm

### 1. Clone the repository

```bash
git clone https://github.com/Kaivalya078/odoo-pos-cafe.git
cd odoo-pos-cafe
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Fill in MONGO_URI and JWT_SECRET in .env
npm install
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Seed the database (optional)

```bash
cd backend
node scripts/seed-orders.js      # Seed sample orders for analytics
node scripts/backfill-categories.js  # Fix category field on older orders
```

The app will be available at **http://localhost:5173**  
The API runs at **http://localhost:5000**

---

## 🌐 Environment Variables

**`backend/.env`**

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pos-cafe
JWT_SECRET=your_jwt_secret_here
```

---

## 📁 Project Structure

```
odoo-pos-cafe/
├── backend/
│   ├── controllers/        # Business logic (12 controllers)
│   ├── models/             # Mongoose schemas (9 models)
│   ├── routes/             # Express routers
│   ├── middleware/         # JWT auth, role guard, error handler
│   ├── utils/              # asyncHandler
│   ├── scripts/            # Seed & maintenance scripts
│   └── app.js              # Express app setup
│
└── frontend/
    ├── src/
    │   ├── pages/          # 10 page components
    │   ├── components/     # Reusable UI components + analytics
    │   ├── context/        # AuthContext, RestaurantContext
    │   ├── services/       # Axios API wrappers (8 service files)
    │   └── index.css       # Global design system (~6,000 lines)
    └── index.html
```

---

## 🛠️ Tech Stack

**Backend**

| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.x | HTTP server & routing |
| mongoose | 8.x | MongoDB ODM |
| jsonwebtoken | 9.x | JWT authentication |
| bcryptjs | 2.x | Password hashing |
| cors | 2.x | Cross-origin requests |
| dotenv | 16.x | Environment variables |
| nodemon | 3.x | Dev auto-restart |

**Frontend**

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.x | UI framework |
| react-router-dom | 7.x | Client-side routing |
| axios | 1.x | HTTP client |
| recharts | 2.x | Analytics charts |
| lucide-react | latest | Icon library |
| react-hot-toast | 2.x | Toast notifications |
| qrcode.react | 4.x | UPI QR code generation |
| vite | 8.x | Build tool & dev server |

---

## 👨‍💻 Contributors

| Name | Role |
|------|------|
| **Kaivalya Patel** | Frontend — UI/UX, React pages, CSS design system, mobile interfaces |
| **Darshil Doshi** | Backend — Express API, MongoDB models, business logic, controllers |

---

<div align="center">

Made with ☕ for the Odoo Hackathon

</div>
