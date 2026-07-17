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
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```
