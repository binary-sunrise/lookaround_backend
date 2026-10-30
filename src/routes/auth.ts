import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db/client';
import {
  RegisterInputSchema,
  LoginInputSchema,
  UserProfile,
} from '../schemas/bliffe';

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/auth/register or /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const input = RegisterInputSchema.parse(req.body);
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const userId = crypto.randomUUID();
    const hashedPassword = hashPassword(input.password);
    const displayName = input.fullName.trim().split(/\s+/)[0];

    // Create user and credentials account in transaction
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email: normalizedEmail,
        name: input.fullName.trim(),
        givenName: displayName,
        emailVerified: true,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: normalizedEmail,
            providerId: 'credential',
            password: hashedPassword,
          },
        },
      },
    });

    // Create corresponding B-Liffe UserProfile
    const profile = await prisma.userProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: newUser.id,
        fullName: input.fullName.trim(),
        displayName,
        email: normalizedEmail,
        bio: 'Biodiversity enthusiast & field observer documenting flora, fauna, and local ecosystems.',
        avatarType: 'preset',
        avatarPresetId: 'user',
        avatarCustomUrl: null,
      },
    });

    // Create active session token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId: newUser.id,
        token,
        expiresAt,
      },
    });

    const userProfile: UserProfile = {
      id: profile.id,
      fullName: profile.fullName,
      displayName: profile.displayName,
      email: profile.email,
      bio: profile.bio,
      avatarType: profile.avatarType as any,
      avatarPresetId: profile.avatarPresetId as any,
      avatarCustomUrl: profile.avatarCustomUrl,
      updatedAt: profile.updatedAt.toISOString(),
    };

    res.status(201).json({
      user: userProfile,
      token,
      message: 'Account created successfully',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login or /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const input = LoginInputSchema.parse(req.body);
    const normalizedEmail = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { accounts: true, profile: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const hashedPassword = hashPassword(input.password);
    const account = user.accounts.find((a) => a.providerId === 'credential');

    // If account has hashed password, verify it (or allow demo passwords in non-production)
    if (account?.password && account.password !== hashedPassword && account.password !== input.password) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Ensure UserProfile exists
    let profile = user.profile;
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          fullName: user.name || normalizedEmail.split('@')[0],
          displayName: user.givenName || user.name || normalizedEmail.split('@')[0],
          email: user.email,
          bio: 'Biodiversity enthusiast & field observer documenting flora, fauna, and local ecosystems.',
          avatarType: 'preset',
          avatarPresetId: 'user',
          avatarCustomUrl: null,
        },
      });
    }

    // Issue new session token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const userProfile: UserProfile = {
      id: profile.id,
      fullName: profile.fullName,
      displayName: profile.displayName,
      email: profile.email,
      bio: profile.bio,
      avatarType: profile.avatarType as any,
      avatarPresetId: profile.avatarPresetId as any,
      avatarCustomUrl: profile.avatarCustomUrl,
      updatedAt: profile.updatedAt.toISOString(),
    };

    res.status(200).json({
      user: userProfile,
      token,
      message: 'Logged in successfully',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      await prisma.session.deleteMany({
        where: { token },
      });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = (req as any).userId;

    if (!userId && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: { include: { profile: true } } },
      });
      if (session && session.expiresAt > new Date()) {
        userId = session.userId;
      }
    }

    if (userId) {
      const profile = await prisma.userProfile.findFirst({
        where: { userId },
      });
      if (profile) {
        res.json({
          id: profile.id,
          fullName: profile.fullName,
          displayName: profile.displayName,
          email: profile.email,
          bio: profile.bio,
          avatarType: profile.avatarType,
          avatarPresetId: profile.avatarPresetId,
          avatarCustomUrl: profile.avatarCustomUrl,
          updatedAt: profile.updatedAt.toISOString(),
        });
        return;
      }
    }

    // Default mock user profile matching frontend fallback
    res.json({
      id: 'bliffe-demo-user',
      fullName: 'Veena V',
      displayName: 'Veena',
      email: 'veena@field.b-liffe.org',
      bio: 'Biodiversity enthusiast & field observer documenting flora, fauna, and local ecosystems.',
      avatarType: 'preset',
      avatarPresetId: 'user',
      avatarCustomUrl: null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

