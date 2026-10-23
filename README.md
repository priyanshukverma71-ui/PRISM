# PRISM — Proactive Regulatory Intelligence & Status Monitoring

> **See the Risk. Predict the Delay. Act Before the Deadline.**

PRISM is an enterprise-grade AICTE Approval Workflow Automation, Compliance Monitoring, and Deadline Alert Intelligence Platform. Designed with a **Platinum Black** aesthetic inspired by precision aerospace avionics and financial terminals, PRISM bridges statutory regulatory compliance with explainable predictive risk analytics.

---

## 💎 Platinum Black Design System & 3D PRISM Core

- **Obsidian Black (`#08090B`) & Deep Graphite (`#111316`)**: Deep, low-fatigue command centre background.
- **Brushed Platinum (`#C7CBD0`) & Silver (`#E1E4E8`)**: High-precision tactile accents and borders.
- **Restrained Status Signaling**: Success Green (`#47D7A0`), Warning Amber (`#F4B860`), Critical Red (`#FF626B`).
- **Signature 3D PRISM Core**: Real-time rotating geometric octahedron rendered via Three.js, React Three Fiber, and Drei, featuring metallic reflections, subtle volumetric lighting, orbital node activity rings, and non-WebGL SVG fallback.

---

## 🏛️ System Architecture

```
PRISM/
├── apps/
│   ├── web/                     # React 18, Vite, TypeScript, Tailwind CSS
│   │   ├── src/
│   │   │   ├── components/3d/   # PrismCore.tsx (R3F 3D Engine)
│   │   │   ├── components/layout/# AppLayout.tsx (Enterprise Command Bar & Nav)
│   │   │   ├── context/         # AuthContext.tsx (Role-based Session & Demo Switcher)
│   │   │   ├── pages/           # 15 Functional Modules
│   │   │   └── lib/api.ts       # Type-safe API Client with JWT
│   └── api/                     # Node.js, Express, TypeScript, Prisma ORM
│       ├── src/
│       │   ├── auth/            # JWT authentication, bcryptjs, session management
│       │   ├── applications/    # Application routing & dossier controllers
│       │   ├── workflow/        # Rule-driven state machine transition engine
│       │   ├── simulation/      # FutureLab counterfactual simulator engine
│       │   ├── risk/            # Deterministic, explainable delay risk calculator
│       │   ├── evc/             # Expert Visit Committee scheduling & prerequisites
│       │   ├── compliance/      # Undertakings & cryptographic evidence submissions
│       │   ├── alerts/          # Automated deadline evaluation worker & escalations
│       │   ├── audit/           # Tamper-evident flight recorder with SHA-256 hash chaining
│       │   ├── rules/           # APH regulatory handbook compiler & entity extractor
│       │   └── seed.ts          # Repeatable synthetic demo database seeder
├── prisma/
│   ├── schema.prisma            # SQLite schema (instant out-of-the-box local execution)
│   └── schema.postgresql.prisma # PostgreSQL schema (production / Docker Compose)
├── docker-compose.yml           # PostgreSQL 16 + API + Web containers
├── Dockerfile                   # Multi-stage production container build
└── .github/workflows/ci.yml     # Automated CI build & test pipeline
```

---

## 👥 Roles & Pre-configured Demo Accounts

All demo accounts use password: `Prism@2025`

| Role | Name | Email | Jurisdiction / Scope |
| :--- | :--- | :--- | :--- |
| **System Administrator** | Dr. Rajesh Verma | `admin@prism.aicte.gov.in` | Full system governance, workflow versioning & rules |
| **Regional Officer** | Sunil Deshmukh | `officer.mumbai@aicte.gov.in` | Western Region (WRO), scrutiny verification, EVC scheduling |
| **Bureau Officer** | Dr. Anita Roy | `bureau.head@aicte.gov.in` | AICTE Headquarters, stage approvals, escalations |
| **Committee Reviewer** | Prof. K. K. Sharma | `reviewer.sharma@aicte.gov.in` | Expert Visit Committee (EVC) & SAC panel evaluations |
| **Institution User** | Dr. Sachin Patil | `principal@vjti.edu.in` | Veermata Jijabai Tech. Institute (VJTI Mumbai) |
| **Read-only Auditor** | Vikramaditya Bose | `auditor.cag@gov.in` | Comptroller & Auditor General (CAG) read-only scrutiny |

> ⚡ **Quick Switcher**: Click the **Role Selector** in the top navigation bar to switch between roles in 1 click without re-logging in.

---

## 🧪 Signature Innovation: PRISM FutureLab

PRISM FutureLab is a **counterfactual compliance simulator** running on isolated data snapshots. It allows regulatory officials and institutions to ask: *"What happens if this scrutiny report is delayed by 5 days, or the land lease renewal expires before inspection?"*

- **Isolated Snapshot**: Never mutates live production database records.
- **Deterministic Downstream Cascades**: Calculates exact delays across downstream stages (e.g. EVC windows, SAC hearings).
- **Newly Blocked Stages**: Identifies stages blocked by incomplete prerequisites (e.g. Missing Fire Safety NOC blocks EVC scheduling).
- **Risk Score Shifts**: Projects score changes (e.g. Low Risk 18 $\rightarrow$ Critical Risk 82).
- **Explainable Interventions**: Generates concrete administrative remedies (e.g. Fast-track central panel roster, provisional escrow undertaking).
- **Mandatory Compliance Disclaimer**: Strictly marked *"SIMULATION — NOT AN OFFICIAL DECISION"*.

---

## 🛡️ Compliance Flight Recorder (Tamper-Evident Audit Trail)

Every consequential action—state transition, EVC appointment, compliance verification, or return note—is recorded into an append-only audit ledger with cryptographic SHA-256 hash chaining:

$$\text{CurrentHash} = \text{SHA-256}(\text{PreviousHash} \parallel \text{Sequence} \parallel \text{Timestamp} \parallel \text{Actor} \parallel \text{Payload})$$

- **Cryptographic Chain Verification**: Click *"Verify Crypto Chain Integrity"* on the `/audit` page to run a sequential validation of all audit records.
- **Formula-Safe CSV Export**: Automatically neutralizes spreadsheet injection attacks (`=`, `+`, `-`, `@` characters prefixed with `'`).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- npm 10+

### Installation & Run

```bash
# 1. Clone the repository
git clone <repo-url>
cd PRISM

# 2. Install all dependencies across workspaces
npm install

# 3. Synchronize database schema (SQLite zero-dependency mode)
npx prisma db push

# 4. Seed synthetic regulatory demonstration database
npm run seed

# 5. Execute all integration tests
npm test

# 6. Start full stack development server (API: :5000, Web: :3000)
npm run dev
```

Visit `http://localhost:3000` to access the PRISM Platform.

---

## 🚢 Production Deployment (Docker Compose)

To run with PostgreSQL 16:

```bash
docker compose up --build -d
```

- Web UI: `http://localhost:3000`
- API Backend: `http://localhost:5000/api/health`
- PostgreSQL 16: `localhost:5432`

---

## 📋 12-Step Final Demonstration Scenario (Section 23)

1. **Step 1 — Submit Application**: Sign in as Institution User (`principal@vjti.edu.in`) and navigate to `/applications/new`. File an Extension of Approval (EoA) case.
2. **Step 2 — Workflow Routing**: The case routes into `SUBMITTED` stage under the `FULL_CYCLE` rule template.
3. **Step 3 — Regional Officer Scrutiny / Return**: Switch to Regional Officer (`officer.mumbai@aicte.gov.in`). Advance the case to `UNDER_SCRUTINY`, or click *"Return with Deficiency"* and record statutory citations.
4. **Step 4 — Prerequisite Detection**: Navigate to `/evc`. Notice that EVC scheduling is blocked for cases with outstanding scrutiny deficiencies.
5. **Step 5 — Schedule EVC**: Clear prerequisites or pick an eligible case (`APP-2025-NRO-1188`), assign panel members, and confirm the inspection date.
6. **Step 6 — Expiry Proximity Detection**: View case `APP-2025-WRO-0491`. Notice that the Land Lease Agreement expires in 8 days.
7. **Step 7 — Automated Alerts**: Navigate to `/alerts`. PRISM generates automated `DOCUMENT_EXPIRY` and `DEADLINE_WARNING` notifications with multi-channel dispatch logs.
8. **Step 8 — PRISM FutureLab Simulation**: Go to `/futurelab`. Select `APP-2025-WRO-0491`, increase scrutiny delay by 5 days and set lease timing to `LATE_15_DAYS`. Observe the downstream bottleneck timeline and risk score jump without altering the live database.
9. **Step 9 — Submit Evidence**: Switch back to Institution User. Go to `/compliance`, select the lease obligation, and submit evidence. A deterministic SHA-256 checksum is calculated.
10. **Step 10 — Verify Evidence**: Switch to Regional Officer. Click *"Verify Evidence"* and mark the obligation as `VERIFIED`.
11. **Step 11 — Recalculate Risk**: The Command Centre Dashboard (`/dashboard`) recalculates status and drops the risk score.
12. **Step 12 — Flight Recorder Audit**: Visit `/audit`. Inspect the complete chronological timeline and click *"Verify Crypto Chain Integrity"* to prove zero tampering.

---

## ⚖️ Regulatory Notice

**PRISM is a decision-support, predictive risk monitoring, and workflow automation platform. It is designed to assist statutory officials and higher education institutions. It must never replace statutory scrutiny, formal inspections, regulatory verification, or decisions reserved for competent AICTE authorities.**
