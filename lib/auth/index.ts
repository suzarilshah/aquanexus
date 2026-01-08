import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface Session {
  userId: string;
  email: string;
  name: string;
}

export async function createSession(userId: string, email: string, name: string) {
  const token = await new SignJWT({ userId, email, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return token;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(email: string, password: string) {
  const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (user.length === 0) {
    throw new Error('Invalid email or password');
  }

  const isValid = await verifyPassword(password, user[0].passwordHash);

  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  await createSession(user[0].id, user[0].email, user[0].name || '');

  return {
    id: user[0].id,
    email: user[0].email,
    name: user[0].name,
  };
}

export async function register(email: string, password: string, name: string) {
  // Check if user exists
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existingUser.length > 0) {
    throw new Error('Email already registered');
  }

  const passwordHash = await hashPassword(password);

  const newUser = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name,
    })
    .returning();

  await createSession(newUser[0].id, newUser[0].email, newUser[0].name || '');

  return {
    id: newUser[0].id,
    email: newUser[0].email,
    name: newUser[0].name,
  };
}

export async function logout() {
  await destroySession();
}
