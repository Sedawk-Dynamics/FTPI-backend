import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { generateMembershipId } from '../utils/generateMembershipId';

const prisma = new PrismaClient();

export const applyForMembership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const { type = 'YEARLY', amount = 1000, paymentMethod } = req.body;

    // Check if user has a profile
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    });

    if (!profile) {
      sendError(res, 'Please complete your profile before applying for membership.', 400);
      return;
    }

    // Check for existing pending or approved membership
    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['PENDING', 'PROCESSING', 'APPROVED'] },
      },
    });

    if (existingMembership) {
      sendError(
        res,
        'You already have an active or pending membership application.',
        400
      );
      return;
    }

    // Handle uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const aadharFile = files?.aadhar?.[0];
    const panFile = files?.pan?.[0];
    const photoFile = files?.photo?.[0];

    // Update profile with uploaded document URLs
    const profileUpdate: Record<string, string> = {};
    if (aadharFile) profileUpdate.aadharDocUrl = `/uploads/documents/${aadharFile.filename}`;
    if (panFile) profileUpdate.panDocUrl = `/uploads/documents/${panFile.filename}`;
    if (photoFile) profileUpdate.photoUrl = `/uploads/photos/${photoFile.filename}`;

    if (Object.keys(profileUpdate).length > 0) {
      await prisma.profile.update({
        where: { userId: req.user.id },
        data: profileUpdate,
      });
    }

    const membershipId = await generateMembershipId();

    const membership = await prisma.membership.create({
      data: {
        userId: req.user.id,
        membershipId,
        type,
        status: 'PENDING',
        payment: {
          create: {
            userId: req.user.id,
            amount: parseFloat(String(amount)),
            currency: 'INR',
            status: 'PENDING',
            paymentMethod: paymentMethod || 'ONLINE',
          },
        },
      },
      include: {
        payment: true,
      },
    });

    sendSuccess(res, membership, 'Membership application submitted successfully.', 201);
  } catch (error) {
    console.error('Apply membership error:', error);
    sendError(res, 'Failed to submit membership application.');
  }
};

export const getMyMemberships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: req.user.id },
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, memberships);
  } catch (error) {
    console.error('Get memberships error:', error);
    sendError(res, 'Failed to fetch memberships.');
  }
};

export const getMembershipById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const { id } = req.params;

    const membership = await prisma.membership.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
      include: {
        payment: true,
        user: {
          include: { profile: true },
        },
      },
    });

    if (!membership) {
      sendError(res, 'Membership not found.', 404);
      return;
    }

    sendSuccess(res, membership);
  } catch (error) {
    console.error('Get membership error:', error);
    sendError(res, 'Failed to fetch membership details.');
  }
};

export const renewMembership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const { id } = req.params;
    const { amount = 1000, paymentMethod } = req.body;

    const existingMembership = await prisma.membership.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existingMembership) {
      sendError(res, 'Membership not found.', 404);
      return;
    }

    if (existingMembership.status !== 'EXPIRED' && existingMembership.status !== 'APPROVED') {
      sendError(res, 'Only expired or approved memberships can be renewed.', 400);
      return;
    }

    const newMembershipId = await generateMembershipId();

    const newMembership = await prisma.membership.create({
      data: {
        userId: req.user.id,
        membershipId: newMembershipId,
        type: 'YEARLY',
        status: 'PENDING',
        payment: {
          create: {
            userId: req.user.id,
            amount: parseFloat(String(amount)),
            currency: 'INR',
            status: 'PENDING',
            paymentMethod: paymentMethod || 'ONLINE',
          },
        },
      },
      include: {
        payment: true,
      },
    });

    sendSuccess(res, newMembership, 'Membership renewal application submitted.', 201);
  } catch (error) {
    console.error('Renew membership error:', error);
    sendError(res, 'Failed to renew membership.');
  }
};
