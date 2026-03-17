# Auth Service Template

A production-ready NestJS backend template with **JWT authentication**, **role-based authorization (RBAC)**, **Prisma ORM**, and **Docker** support.

## Features

- **JWT Authentication** — Access + Refresh token flow
- **Role-Based Access Control** — `@Roles('admin')` decorator + `RolesGuard`
- **Repository Pattern** — Clean architecture with `IUserRepository` interface
- **Prisma ORM** — PostgreSQL with migrations
- **Rate Limiting** — `@nestjs/throttler` to prevent brute-force
- **Security** — Helmet, CORS, bcrypt password hashing
- **Swagger API Documentation** — OpenAPI 3.0 specification
- **Structured Logging** — JSON logs compatible with Loki/Promtail
- **Docker & Docker Compose** — Multi-stage build + PostgreSQL
- **Testing** — Unit tests + E2E tests with Jest & Supertest
- **Input Validation** — class-validator + class-transformer
- **Health Check** — `GET /health` endpoint for Docker/K8s probes

## Getting Started

### Prerequisites

- Node.js >= 22.14.0
- Docker & Docker Compose
- npm

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start the database with Docker
docker compose up -d

# Run Prisma migrations
npx prisma migrate deploy

# Start the development server
npm run start:dev
```

### Docker (Full Stack)

```bash
npm run docker:build
```

## API Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/health` | ❌ | — | Health check |
| `POST` | `/auth/signup` | ❌ | — | Register a new user |
| `POST` | `/auth/login` | ❌ | — | Login and get tokens |
| `POST` | `/auth/refresh` | ❌ | — | Refresh access token |
| `GET` | `/user` | ✅ | admin | Get all users |
| `GET` | `/user/:id` | ✅ | admin, user | Get user by ID |
| `POST` | `/user` | ✅ | admin | Create user (admin) |
| `PUT` | `/user/:id/password` | ✅ | admin, user | Update password |
| `DELETE` | `/user/:id` | ✅ | admin | Delete user |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `JWT_SECRET_KEY` | JWT access token secret | — |
| `JWT_SECRET_REFRESH_KEY` | JWT refresh token secret | — |
| `TOKEN_EXPIRE_TIME` | Access token expiry | `1h` |
| `TOKEN_REFRESH_EXPIRE_TIME` | Refresh token expiry | `24h` |
| `CRYPT_SALT` | Bcrypt salt rounds | `10` |
| `LOG_LEVEL` | Log level (0=error..4=verbose) | `2` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `DATABASE_URL` | PostgreSQL connection string | — |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in development mode with hot-reload |
| `npm run start:prod` | Start in production mode |
| `npm run build` | Build the application |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run docker:build` | Build and start with Docker Compose |
| `npm run docker:down` | Stop Docker Compose |

## API Documentation

Once the server is running, visit:
- **Swagger UI**: [http://localhost:4000/doc](http://localhost:4000/doc)

## Architecture

```
src/
├── auth/               # Authentication module
│   ├── decorators/      # @Public(), @Roles() decorators
│   ├── dto/             # Login, Refresh DTOs
│   ├── auth.controller  # Auth endpoints
│   ├── auth.service      # Auth business logic
│   ├── jwt.strategy      # Passport JWT strategy
│   ├── jwt-auth.guard    # Global JWT guard
│   └── roles.guard       # Role-based access guard
├── user/               # User module
│   ├── dto/             # User DTOs with validation
│   ├── user.controller   # User CRUD endpoints
│   └── user.service      # User business logic
├── db/                 # Database layer
│   └── user/            # User repository (interface + Prisma impl)
├── prisma/             # Prisma service
├── crypto/             # Password hashing utilities
├── logger/             # Structured JSON logger + middleware
├── app.module           # Root module
├── main                 # Bootstrap
└── exceptions.filter    # Global exception handler
```

## License

MIT
