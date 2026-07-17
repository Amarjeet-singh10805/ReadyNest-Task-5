# 🚀 Multi-Tenant SaaS Platform

A production-ready, full-stack multi-tenant SaaS platform built with Next.js 15, React 19, Node.js, Express, Prisma, MySQL, Socket.IO, and Cloudinary.

---

## ✨ Features

### Architecture
- **Multi-tenant** data isolation with `organizationId` on all tables
- **RBAC** — Super Admin, Org Admin, Member with strict middleware enforcement
- **Real-time** via Socket.IO (notifications, presence, task updates, typing indicators)
- **JWT Auth** — Access + Refresh token rotation with secure HttpOnly cookies

### Modules
| Module | Features |
|--------|----------|
| **Auth** | Sign up, login, logout, email verification, forgot/reset password, refresh tokens |
| **Organizations** | CRUD, logo upload, slug-based routing, settings |
| **Members** | Invite, role management, remove, online presence |
| **Projects** | CRUD, status, color-coding, progress tracking, archiving |
| **Tasks** | Kanban board, list view, priorities, assignees, comments, file attachments |
| **Files** | Cloudinary upload, drag-and-drop, preview, deletion |
| **Invitations** | Email invites, token-based acceptance, expiry |
| **Dashboard** | KPI cards, 5 chart types (area, bar, pie, line), activity feed, top contributors |
| **Analytics** | Deep-dive charts, monthly trends, priority distribution |
| **Audit Logs** | Full audit trail for all user actions |
| **Notifications** | Real-time, mark read/all, badge counts |

### Frontend Stack
- **Next.js 15** App Router + React 19
- **TypeScript** — fully typed
- **Tailwind CSS** + shadcn/ui components
- **Zustand** — auth state with persistence
- **TanStack Query** — server state, optimistic updates, caching
- **React Hook Form** + Zod — validation
- **Framer Motion** — smooth animations
- **Recharts** — analytics charts
- **Socket.IO Client** — real-time
- **next-themes** — dark/light mode
- **Sonner** — toast notifications

### Backend Stack
- **Node.js** + **Express.js** + TypeScript
- **Prisma ORM** + **MySQL**
- **JWT** (access + refresh) + **bcrypt**
- **Socket.IO** server
- **Cloudinary** file storage
- **Nodemailer** email service
- **Helmet** + **CORS** + **Rate Limiting** + **Compression**
- **Morgan** + **Winston** structured logging
- **Zod** validation
- **Swagger UI** API docs

---

## 🗂️ Project Structure

```
saas-platform/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Full DB schema (12 models)
│   ├── src/
│   │   ├── config/               # DB, JWT, Cloudinary, Email, Swagger, Logger
│   │   ├── controllers/          # Auth, Org, Project, Task, File, Invitation, Dashboard, User
│   │   ├── middleware/           # Auth, RBAC, Validation, Error, NotFound
│   │   ├── routes/               # 10 route files
│   │   ├── services/             # Audit & Activity logging
│   │   ├── sockets/              # Socket.IO — presence, tasks, notifications, typing
│   │   ├── utils/                # AppError, response helpers
│   │   ├── app.ts                # Express app setup
│   │   └── server.ts             # HTTP server + graceful shutdown
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/             # Login, Register, Verify, Forgot/Reset Password
│   │   │   └── dashboard/        # All dashboard pages
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── layout/           # Sidebar, TopBar
│   │   │   └── common/           # Providers, SocketProvider
│   │   ├── hooks/                # useApi — all TanStack Query hooks
│   │   ├── lib/                  # utils, cn
│   │   ├── services/             # Axios API client with interceptors
│   │   ├── store/                # Zustand auth store
│   │   └── types/                # Full TypeScript types
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── .github/workflows/ci-cd.yml   # GitHub Actions CI/CD
├── docker-compose.yml             # Local dev with MySQL + Backend + Frontend
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8.0+ (or Docker)
- Cloudinary account
- SMTP credentials (Gmail App Password recommended)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd saas-platform

# Backend
cp backend/.env.example backend/.env
# Fill in: DATABASE_URL, JWT secrets, Cloudinary keys, SMTP credentials

# Frontend
cp frontend/.env.example frontend/.env.local
# Set: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL
```

### 2. Backend Setup

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run prisma:seed      # Seeds demo users & data
npm run dev              # http://localhost:5000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev              # http://localhost:3000
```

### 4. Docker (All-in-one)

```bash
# Copy and configure .env files first
docker-compose up -d
```

---

## 🔐 Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@saasplatform.com | SuperAdmin123! |
| Org Admin | admin@acme.com | Admin123! |
| Member | member@acme.com | Member123! |

---

## 📡 API Documentation

After starting the backend, visit:
```
http://localhost:5000/api-docs
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register + create org |
| POST | `/api/v1/auth/login` | Login, returns tokens |
| POST | `/api/v1/auth/refresh-token` | Rotate refresh token |
| GET | `/api/v1/dashboard/stats` | Analytics & KPIs |
| GET | `/api/v1/projects` | List projects (paginated) |
| POST | `/api/v1/tasks` | Create task |
| POST | `/api/v1/files/upload` | Upload file to Cloudinary |
| POST | `/api/v1/invitations` | Send email invitation |
| GET | `/api/v1/audit-logs` | Organization audit trail |

All protected routes require: `Authorization: Bearer <accessToken>`  
Set organization context: `X-Organization-Id: <orgId>`

---

## 🌐 Deployment

### Backend → Render
1. Create a **Web Service** on Render
2. Set build command: `npm install && npx prisma generate && npm run build`
3. Set start command: `npm start`
4. Add all environment variables from `.env.example`
5. Add a **Render Deploy Hook** URL to GitHub secrets as `RENDER_DEPLOY_HOOK_BACKEND`

### Frontend → Vercel
1. Import repo to Vercel
2. Set root directory to `frontend`
3. Add env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`
4. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` to GitHub secrets

### Database → Railway MySQL
1. Create MySQL database on Railway
2. Copy the `DATABASE_URL` connection string
3. Run migrations: `npx prisma migrate deploy`

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `project:created` | Server → Client | New project in org |
| `task:created` | Server → Client | New task created |
| `task:updated` | Server → Client | Task changed |
| `task:moved` | Server → Client | Task status/position changed |
| `task:comment` | Server → Client | New comment on task |
| `task:typing` | Client → Server | User typing in comment |
| `user:online` | Server → Client | Member came online |
| `user:offline` | Server → Client | Member went offline |
| `notification:new` | Server → Client | New notification pushed |

---

## 🔒 Security

- Passwords hashed with **bcrypt** (12 rounds)
- **JWT** short-lived access (15m) + rotating refresh tokens (7d)
- Refresh tokens stored in DB; revoked on logout & password change
- **HttpOnly** secure cookies for refresh token
- **Helmet** security headers
- **CORS** restricted to frontend origin
- **Rate limiting** — global (500/15min) + auth (20/15min)
- **Zod** schema validation on all inputs
- Multi-tenant **organizationId** isolation on all DB queries
- **Prisma** parameterized queries (SQL injection prevention)
- XSS protection via Helmet + Content-Security-Policy

---

## 📊 Database Schema

12 Prisma models with full relational integrity:

`User` · `Organization` · `OrganizationUser` · `Project` · `Task` · `Comment` · `File` · `Invitation` · `RefreshToken` · `AuditLog` · `Notification` · `ActivityLog`

All tenant-scoped tables include `organizationId` with cascading deletes and proper indexes for performance.

---

## 📄 License

MIT — free to use and modify for any project.
