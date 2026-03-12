# auth-service

test npm

A production-ready NestJS application with authentication, Prisma, and Docker.

## Features

- Passport.js Authentication
- Prisma ORM with PostgreSQL
- Docker & Docker Compose
- Swagger API Documentation
- Jest Testing
- Custom Logger
- Input Validation with class-validator

## Getting Started

### Prerequisites

- Node.js >= 22.14.0
- Docker & Docker Compose
- npm
- Passport.js

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Start the database with Docker:
```bash
docker compose up -d
```

4. Run Prisma migrations:
```bash
npx prisma migrate deploy
```

5. Start the development server:
```bash
npm run start:dev
```

## Scripts

- `start` - Start the application
- `start:dev` - Start in development mode with hot-reload
- `start:prod` - Start in production mode
- `build` - Build the application
- `test` - Run tests
- `test:cov` - Run tests with coverage
- `lint` - Run ESLint
- `format` - Format code with Prettier

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:3000/api

## Author

Crap

## License

UNLICENSED
