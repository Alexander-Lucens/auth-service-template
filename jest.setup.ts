import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file if it exists
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Ensure DATABASE_URL for tests is a valid URL without ${...} placeholders
if (
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('${')
) {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/test_db?schema=public';
}

// Set default JWT secrets for tests if not provided
if (!process.env.JWT_SECRET_KEY) {
  process.env.JWT_SECRET_KEY = 'test-secret-key-change-in-production';
}
if (!process.env.JWT_SECRET_REFRESH_KEY) {
  process.env.JWT_SECRET_REFRESH_KEY = 'test-refresh-secret-key-change-in-production';
}

// This file ensures reflect-metadata and dotenv are loaded
// before any test files.
