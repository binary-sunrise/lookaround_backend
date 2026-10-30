import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db/client';
import {
  ProfileUpdateInputSchema,
  UserProfile,
} from '../schemas/bliffe';

const router = Router();

const DEFAULT_PROFILE: UserProfile = {
  id: 'bliffe-demo-user',
  fullName: 'Veena V',
  displayName: 'Veena',
  email: 'veena@field.b-liffe.org',
  bio: 'Biodiversity enthusiast & field observer documenting flora, fauna, and local ecosystems.',
  avatarType: 'preset',
  avatarPresetId: 'user',
  avatarCustomUrl: null,
  updatedAt: new Date().toISOString(),
};

// GET /api/profile or /api/v1/profile
router.get('/', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
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

    // Fall back to first available user profile or default mock profile
    const anyProfile = await prisma.userProfile.findFirst();
    if (anyProfile) {
      res.json({
        id: anyProfile.id,
        fullName: anyProfile.fullName,
        displayName: anyProfile.displayName,
        email: anyProfile.email,
        bio: anyProfile.bio,
        avatarType: anyProfile.avatarType,
        avatarPresetId: anyProfile.avatarPresetId,
        avatarCustomUrl: anyProfile.avatarCustomUrl,
        updatedAt: anyProfile.updatedAt.toISOString(),
      });
      return;
    }

    res.json(DEFAULT_PROFILE);
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile or /api/v1/profile
const handleUpdateProfile = async (req: any, res: any, next: any) => {
  try {
    const input = ProfileUpdateInputSchema.parse(req.body);
    const userId = req.userId;

    const trimmedFullName = input.fullName.trim();
    const displayName = input.displayName
      ? input.displayName.trim()
      : trimmedFullName.split(/\s+/)[0];
    const bio = (input.bio || '').trim();

    let profile = userId
      ? await prisma.userProfile.findFirst({ where: { userId } })
      : await prisma.userProfile.findFirst();

    if (profile) {
      profile = await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          fullName: trimmedFullName,
          displayName,
          bio,
          avatarType: input.avatarType,
          avatarPresetId: input.avatarPresetId,
          avatarCustomUrl: input.avatarType === 'upload' ? input.avatarCustomUrl : null,
        },
      });
    } else {
      profile = await prisma.userProfile.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId || null,
          fullName: trimmedFullName,
          displayName,
          email: DEFAULT_PROFILE.email,
          bio,
          avatarType: input.avatarType,
          avatarPresetId: input.avatarPresetId,
          avatarCustomUrl: input.avatarType === 'upload' ? input.avatarCustomUrl : null,
        },
      });
    }

    const updatedProfile: UserProfile = {
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

    res.json(updatedProfile);
  } catch (err) {
    next(err);
  }
};

router.put('/', handleUpdateProfile);
router.patch('/', handleUpdateProfile);

export default router;

