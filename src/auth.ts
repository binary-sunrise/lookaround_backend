import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { prisma } from './db/client';
import dotenv from 'dotenv';

dotenv.config();

function sanitizeUrl(candidate?: string, fallback?: string): string | undefined {
  if (!candidate || candidate.includes('<') || candidate.includes('>')) {
    return fallback;
  }
  try {
    return new URL(candidate).origin;
  } catch {
    return fallback;
  }
}

// Auto-discover URL on Render or fall back safely
const backendUrl =
  sanitizeUrl(process.env.BETTER_AUTH_URL) ||
  sanitizeUrl(process.env.RENDER_EXTERNAL_URL) ||
  `http://localhost:${process.env.PORT || 3000}`;

const frontendUrl =
  sanitizeUrl(process.env.FRONTEND_URL) || 'http://localhost:5173';

const rawExtraOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const extraOrigins = rawExtraOrigins
  .map((origin) => sanitizeUrl(origin))
  .filter((origin): origin is string => Boolean(origin));

const trustedOrigins = Array.from(
  new Set([
    frontendUrl,
    ...extraOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    backendUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ])
);

// Configure optional OAuth providers if credentials are provided in env
const socialProviders: Record<string, any> = {};

if (
  process.env.GITHUB_CLIENT_ID &&
  process.env.GITHUB_CLIENT_SECRET &&
  !process.env.GITHUB_CLIENT_ID.includes('your_')
) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  !process.env.GOOGLE_CLIENT_ID.includes('your_')
) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

const authSecret =
  process.env.BETTER_AUTH_SECRET &&
  !process.env.BETTER_AUTH_SECRET.includes('<') &&
  process.env.BETTER_AUTH_SECRET.length >= 32
    ? process.env.BETTER_AUTH_SECRET
    : process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32
      ? process.env.AUTH_SECRET
      : 'lookaround_prod_auth_secret_kfri_2026_secure_key_32chars!';

export const auth = betterAuth({
  baseURL: backendUrl,
  secret: authSecret,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
  },
  socialProviders,
  user: {
    additionalFields: {
      sub: { type: 'string', required: false },
      givenName: { type: 'string', required: false },
      familyName: { type: 'string', required: false },
      role: { type: 'string', required: false },
      roles: { type: 'string[]', required: false, defaultValue: [] },
      customUserId: { type: 'string', required: false },
      avatar: { type: 'string', required: false },
      organisation: { type: 'string', required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  plugins: [
    bearer(),
  ],
});

export type Session = typeof auth.$Infer.Session;
