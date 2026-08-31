# 🍽️ MasiCanteen (MasiPay) — College Canteen Order Management System

> **Tagline:** *"Order karo, Masi tak turant pahunchao."*

Production-grade College Canteen Order Management Platform with Next.js PWA, Express.js API, Realtime Socket.IO, and MongoDB Atlas.

---

## 📱 Features

- **🪑 Table QR System**: Scan table QR (`/table/[token]`) for automatic table detection without typing table numbers.
- **📸 10-Second Student Onboarding**: Only requires **Name**, **10-Digit Mobile Number**, and a **Live Selfie Photo**. No roll numbers, emails, or complex passwords.
- **💳 Manual UPI Verification Workflow**: Instant dynamic UPI QR & deep links (GPay, PhonePe, Paytm) + "I HAVE PAID" claim. Masi verifies payment on her existing UPI app.
- **👩‍🍳 Masi Kitchen Dashboard**: Touch-optimized orders screen with real-time audible bell alerts, student selfie cards, color-coded elapsed timers (0-10m Green, 10-20m Yellow, 20m+ Red), and 1-tap kitchen pipeline (`Accept` -> `Preparing` -> `Ready` -> `Delivered`).
- **🌐 3-Language i18n**: English, Hindi (`हिन्दी`), and Gujarati (`ગુજરાતી`).
- **👨‍💼 Super Admin Portal**: Live sales and revenue analytics, menu & stock CRUD, table QR generator with printable cards, staff management, and audit logs.

---

## 🏗️ Architecture

- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS + Lucide React + PWA Support (`apps/web`)
- **Backend API**: Node.js + Express.js + TypeScript + Zod validation (`apps/api`)
- **Realtime Engine**: Socket.IO with rooms (`staff-room`, `user-{id}`, `order-{id}`)
- **Database**: MongoDB Atlas + Mongoose ODM (11 collections with atomic order sequence counter)
- **Deployment**: Vercel (Frontend) + Render (Backend)

---

## 🔑 Demo Credentials

| Portal | Login Identifier | Password | URL |
|---|---|---|---|
| **Super Admin** | `admin@masicanteen.com` | `Admin@12345` | `/admin/dashboard` |
| **Masi (Staff)** | `masi@masicanteen.com` *(or `9876543210`)* | `Masi@12345` | `/staff/dashboard` |
| **Student** | Any 10-digit mobile number *(e.g. `9876543210`)* | Fast 1-Click Login | `/menu` |

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/abdulzubair1135/masiPay.git
cd masiPay
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/masicanteen?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_masicanteen_key_2026
CLIENT_URL=http://localhost:3000
UPI_ID=canteen@upi
UPI_PAYEE_NAME=Masi Canteen Services
```

In `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Seed Demo Data
```bash
npm run seed --workspace=apps/api
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend API
npm run dev:api

# Terminal 2: Frontend Web App
npm run dev:web
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/health`
