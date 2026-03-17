import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = Number(process.env.CRYPT_SALT) || 10;

export async function hashPassword(pass: string): Promise<string> {
  return bcrypt.hash(pass, SALT_ROUNDS);
}

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

