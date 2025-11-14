# NLQDB - Natural Language Query Database

A production-ready web application that allows users to query MongoDB databases using natural language. The system leverages LLM (OpenAI/local) to translate natural language questions into safe MongoDB queries with RBAC, audit logging, and a Supabase-inspired UI.

## 🎯 Features

- **Natural Language Queries**: Ask questions in plain English, get MongoDB queries
- **Safety-First**: Read-only queries, strict validation, disallows destructive operations
- **Role-Based Access Control**: Admin, Analyst, and Viewer roles with granular permissions
- **Real-time Translation**: Instant query translation with LLM (OpenAI GPT-4 or local)
- **Audit Logging**: Complete audit trail of all queries and executions
- **Modern UI**: Clean, Supabase-like interface built with React + Tailwind CSS
- **Query History**: Track and re-run past queries
- **Schema Browser**: Explore database collections and sample data
- **Rate Limiting**: Redis-backed rate limiting per user and IP
- **Docker Ready**: Full Docker Compose setup for local development

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- OpenAI API key (or local LLM endpoint)

### 1. Clone Repository

```bash
git clone https://github.com/PavitraDeepak/NLQDB.git
cd NLQDB
```

### 2. Set Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and add your OpenAI API key

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Start with Docker Compose

```bash
cd infra
docker-compose up --build
```

This starts MongoDB, Redis, Backend API (port 5000), and Frontend (port 3000).

### 4. Seed Database

```bash
cd ../backend
npm install
npm run seed
```

### 5. Access Application

Open **http://localhost:3000**

**Demo Accounts:**
- Admin: `admin@example.com` / `admin123`
- Analyst: `analyst@example.com` / `analyst123`
- Viewer: `viewer@example.com` / `viewer123`

## 📖 Documentation

- **API Reference**: See [docs/API.md](docs/API.md)
- **Deployment Guide**: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 🏗️ Tech Stack

- **Backend**: Node.js + Express + Mongoose + OpenAI + Redis
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: MongoDB 7.0
- **Infrastructure**: Docker Compose, GitHub Actions

## 📊 Example Queries

Try these:
1. "Show customers from New York with lifetime value over 5000"
2. "Top 5 products by revenue last quarter"
3. "Orders delivered in the last 30 days"

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend E2E tests
cd frontend && npm run test:e2e
```

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📝 License

MIT License

---

**Built with ❤️ for the data community**