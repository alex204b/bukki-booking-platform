# BUKKi - MultiBusiness Booking Platform

A comprehensive booking platform that allows customers to reserve services across various industries including beauty salons, tailors, mechanics, restaurants, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-red.svg)](https://nestjs.com/)

## Features (Highlights)

### Customer
- Browse/search businesses by category and location
- Real-time availability; nearby and distance ordering
- Book services; receive QR code for check-in
- Rate visits (1–5 stars) and leave reviews
- Multi-language (EN/RO/RU)

### Business Owner
- Onboarding wizard; services, working hours, custom booking fields
- Dashboard with upcoming bookings; optional revenue visibility
- QR check-in flow (scan and complete)
- Team members (staff) with operational access (no revenue)
- Contacts list and email campaigns
- Auto-accept bookings toggle

### Admin (Super Admin)
- Approve/reject/suspend businesses
- Manage users (activate/deactivate)
- Admin dashboard with secure role-based access

## Tech Stack

- Frontend: React + TypeScript, Tailwind CSS, React Router, React Query
- Backend: NestJS + TypeScript, TypeORM, PostgreSQL
- Email: Nodemailer (SMTP)
- Geocoding: Nominatim (OpenStreetMap)
- QR Codes: qrcode
- Auth: JWT (roles: customer, business_owner, super_admin)

## Security

- Passwords hashed (bcrypt)
- Sensitive fields encrypted (AES-256-GCM) via TypeORM transformers:
  - `users.phone`, `users.address`, `bookings.notes`, `business_contacts.email` (+ blind index `emailHash`)
- HTTPS required in production
- Signed QR/check-in server-side verification

## Repository Layout

```
├── backend/          # NestJS API server
│   ├── src/         # Source code
│   └── dist/        # Compiled output
├── frontend/         # React web application
│   ├── src/         # React source code
│   ├── android/     # Android native project
│   └── build/       # Production build
├── docs/            # Documentation
│   ├── setup/       # Setup guides
│   ├── mobile/      # Mobile app guides
│   ├── deployment/  # Deployment guides
│   ├── database/    # Database documentation
│   ├── troubleshooting/ # Troubleshooting guides
│   └── development/ # Development docs
├── scripts/         # Utility scripts
└── README.md        # This file
```

📚 **All documentation is organized in the [`docs/`](./docs/) folder.**

## 📚 Documentation

All documentation is organized in the [`docs/`](./docs/) folder:

- **[Setup Guides](./docs/setup/)** - Getting started
- **[Mobile App Development](./docs/mobile/)** - Android/iOS guides
- **[Deployment](./docs/deployment/)** - Production deployment
- **[Troubleshooting](./docs/troubleshooting/)** - Common issues and fixes
- **[Database](./docs/database/)** - Database documentation
- **[Development](./docs/development/)** - Technical documentation

## 🚀 Quick Start

```bash
# Install dependencies
npm run install:all

# Set up environment variables
cp backend/env.example backend/.env
# Edit backend/.env with your configuration

# Start development servers
npm run dev
```

For detailed setup instructions, see the [Setup Guide](./docs/setup/SETUP.md).

## Environment Variables

Create `.env` files (never commit real secrets). Templates:

- `backend/env.example` (copy to `backend/.env`):
  - DATABASE_* (Postgres), JWT_SECRET, JWT_EXPIRES_IN
  - SMTP_* (email), FRONTEND_URL, NOMINATIM_CONTACT_EMAIL
  - ENCRYPTION_KEY, ENCRYPTION_SALT
- `frontend/.env`:
  - REACT_APP_API_URL=http://localhost:3000

## Setup (local)

1) Install deps
```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```
(or use any workspace script you prefer)

2) Configure env vars
- backend: copy `backend/env.example` to `backend/.env` and fill values
- frontend: create `frontend/.env` with `REACT_APP_API_URL`

3) Run
```bash
# terminal A
cd backend
npm run start:dev

# terminal B
cd frontend
npm start
```
Backend on http://localhost:3000, frontend on http://localhost:3001.

## Deployment Options

### Option 1: Docker Compose (Recommended for Development)

The easiest way to run the entire stack locally:

```bash
# Start all services (backend, frontend, postgres)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

### Option 2: Kubernetes (Production)

Complete production-ready Kubernetes deployment with auto-scaling, backups, and monitoring.

**Quick Start:**

```bash
# 1. Build Docker images
docker build -t booking-backend:latest ./backend
docker build -t booking-frontend:latest ./frontend

# 2. Configure secrets
cd k8s
# Edit backend-secret.yaml with your values
# Edit frontend-configmap.yaml with your API URL

# 3. Deploy to Kubernetes
kubectl apply -f k8s/

# 4. Check deployment status
kubectl get all -n booking-platform

# 5. Access via port forwarding
kubectl port-forward -n booking-platform svc/backend 3000:3000
kubectl port-forward -n booking-platform svc/frontend 8080:80
```

**What's Included:**
- PostgreSQL StatefulSet with persistent storage
- Backend (NestJS) with 2+ replicas
- Frontend (React/Nginx) with 2+ replicas
- Nginx Ingress Controller for routing
- Horizontal Pod Autoscaling (HPA)
- Automated database backups
- Health checks and readiness probes

**Documentation:**
- [KUBERNETES_DEPLOYMENT.md](./KUBERNETES_DEPLOYMENT.md) - Complete setup guide
- [KUBERNETES_SETUP_COMPLETE.md](./KUBERNETES_SETUP_COMPLETE.md) - Post-deployment guide
- [k8s/README.md](./k8s/README.md) - Kubernetes manifests reference

**For Production Deployment:**

1. **Push images to registry:**
   ```bash
   # Using GitHub Container Registry (GHCR)
   docker build -t ghcr.io/YOUR_USERNAME/booking-backend:latest ./backend
   docker push ghcr.io/YOUR_USERNAME/booking-backend:latest

   docker build -t ghcr.io/YOUR_USERNAME/booking-frontend:latest ./frontend
   docker push ghcr.io/YOUR_USERNAME/booking-frontend:latest
   ```

   Or use the included GitHub Actions workflow (`.github/workflows/build-and-push.yml`) for automated builds.

2. **Update deployment files:**
   - Edit `k8s/backend-deployment.yaml` with your image name
   - Edit `k8s/frontend-deployment.yaml` with your image name
   - Update `k8s/ingress.yaml` with your domain

3. **Deploy to cluster:**
   ```bash
   # Deploy all resources
   kubectl apply -f k8s/

   # Or use the deployment script
   chmod +x k8s/deploy.sh
   ./k8s/deploy.sh
   ```

4. **Run database migrations:**
   ```bash
   BACKEND_POD=$(kubectl get pod -n booking-platform -l app=backend -o jsonpath="{.items[0].metadata.name}")
   kubectl exec -it $BACKEND_POD -n booking-platform -- npm run typeorm:run-migrations
   ```

5. **Configure DNS:**
   ```bash
   kubectl get ingress -n booking-platform
   # Point your domain to the ingress IP/hostname
   ```

### Option 3: Traditional Cloud Deployment

1) Push to GitHub (private recommended)
2) Provision managed Postgres (Neon/Railway/Supabase)
3) Backend (Render/Railway)
   - Build: `npm ci && npm run build`
   - Start: `node dist/main.js`
   - Set env vars from `backend/env.example`
4) Frontend (Vercel/Netlify)
   - Build: `npm ci && npm run build`
   - Set `REACT_APP_API_URL` to backend URL
5) Domains/HTTPS: point your domain to frontend host; `api.your-domain.com` to backend host

### Docker Images

Individual Docker images for backend and frontend:

**Backend:**
```bash
cd backend
docker build -t booking-backend:latest .
docker run -p 3000:3000 --env-file .env booking-backend:latest
```

**Frontend:**
```bash
cd frontend
docker build -t booking-frontend:latest .
docker run -p 80:80 booking-frontend:latest
```

Both images use multi-stage builds for optimized production size.

## Key Flows

- Email verification: `/auth/verify-email`, `/auth/resend-verification`
- Booking create → QR issued → business scans → check-in completes and trust score +10
- No-show sweep: reduces trust score (-50)
- Business geocoding: automatic via Nominatim on create/update
- Team management: invite by email; member accepts; gains access (no revenue)
- Contacts & campaigns: manage list; send HTML campaigns via SMTP
- Admin routes: protected by JWT + RolesGuard (super_admin)

## Contributing (for future developers)

- Use feature branches; keep PRs small and focused
- Maintain type-safety and add meaningful names (see code style)
- Add translations for EN/RO/RU; avoid hard-coded strings in UI
- Keep sensitive data out of logs; prefer masked output
- For new PII fields, consider encryption with `encryptedTransformer`
- Before merging:
  - Run build and linters (`npm run build` in both apps)
  - Verify translations compile
  - Smoke test core flows (auth, booking, QR, admin)

## Troubleshooting

- Email not sending: verify SMTP_* and provider limits
- Geocoding empty: set NOMINATIM_CONTACT_EMAIL; ensure valid address
- CORS errors: set FRONTEND_URL in backend env and allow it in CORS config
- 401 errors: ensure JWT_SECRET matches and token is set in frontend

## License

MIT License
