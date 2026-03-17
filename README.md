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
npm run docker
```

Shortcut alias:

```bash
npm run docker
```

This command now starts both `db` and `app` **without Docker image build** in development mode, then runs Prisma generate + migrate inside the app container.

### Docker Modes

Development mode (hot reload + bind mounts):

```bash
npm run docker:up
```

If images are already built and you only need to start containers:

```bash
npm run docker:up:no-build
```

If you explicitly want to build the production-like app image:

```bash
npm run docker:up:build
```

Production-like mode (runner image, no source mounts):

```bash
npm run docker:prod:up
npm run docker:prod:migrate
```

One-shot production-like deploy:

```bash
npm run docker:prod:deploy
```

Both app and db containers expose Docker healthchecks (`/health` for app and `pg_isready` for db).

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
| `npm run typecheck` | Run TypeScript checks without build output |
| `npm run build` | Build the application |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:all` | Run unit and E2E tests sequentially |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:cov:unit` | Coverage for unit tests only (stable, fast) |
| `npm run test:cov:e2e` | Coverage for e2e tests only (serialized) |
| `npm run test:cov:all` | Coverage for all tests in-band (no DB race) |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run prisma:generate` | Regenerate Prisma Client after schema changes |
| `npm run prisma:migrate:deploy` | Apply production-safe Prisma migrations |
| `npm run prisma:migrate:dev` | Create/apply migration in development |
| `npm run prisma:migrate:reset` | Reset database and re-apply migrations |
| `npm run docker:build` | Compatibility shortcut: build+up and apply migrations |
| `npm run docker` | Alias for `docker:build` |
| `npm run docker:up` | Start dev stack with Docker Compose |
| `npm run docker:up:build` | Start production-like stack with image build |
| `npm run docker:up:no-build` | Start dev stack without rebuilding images |
| `npm run docker:image:build` | Build only production-like app image |
| `npm run docker:rebuild` | Force rebuild and recreate containers |
| `npm run docker:migrate` | Run Prisma migrate deploy in container/local fallback |
| `npm run docker:logs` | Follow app and db logs |
| `npm run docker:shell` | Open shell in app container |
| `npm run docker:prod:up` | Start production-like stack (runner stage) |
| `npm run docker:prod:up:no-build` | Start production-like stack without rebuild |
| `npm run docker:prod:migrate` | Run migration in production-like stack |
| `npm run docker:prod:deploy` | Production-like up + migration |
| `npm run docker:down` | Stop Docker Compose |
| `npm run docker:down:volumes` | Stop Docker Compose and delete volumes |
| `npm run docker:clean:project` | Remove project containers/networks/volumes |
| `npm run docker:clean:builder` | Remove dangling Docker build cache |
| `npm run docker:clean:unused` | Remove unused Docker objects (images/networks/cache) |
| `npm run docker:recover` | Clean project docker state and start dev stack (no build) |

If Docker reports `ENOSPC` or `No space left on device`, run this first:

```bash
npm run docker:recover
```

If the error still persists, free global Docker space:

```bash
npm run docker:clean:builder
npm run docker:clean:unused
npm run docker:recover
```

## Makefile Shortcuts

If you prefer `make` commands:

```bash
make help
make docker-build
make docker-prod-deploy
make test-all
```

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
