import { Response } from 'express';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { generateCertificate } from '../utils/generateCertificate';

const prisma = new PrismaClient();

export const getAllMemberships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      search,
      type,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (status && status !== 'ALL') {
      where.status = status as MembershipStatus;
    }

    if (type) {
      where.type = type as string;
    }

    if (search) {
      where.OR = [
        { membershipId: { contains: search as string, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: search as string, mode: 'insensitive' } },
              {
                profile: {
                  OR: [
                    { firstName: { contains: search as string, mode: 'insensitive' } },
                    { lastName: { contains: search as string, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    const [memberships, total] = await Promise.all([
      prisma.membership.findMany({
        where,
        include: {
          user: {
            include: { profile: true },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.membership.count({ where }),
    ]);

    sendSuccess(res, {
      memberships,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all memberships error:', error);
    sendError(res, 'Failed to fetch memberships.');
  }
};

export const approveMembership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const membership = await prisma.membership.findUnique({
      where: { id },
      include: {
        user: { include: { profile: true } },
        payment: true,
      },
    });

    if (!membership) {
      sendError(res, 'Membership not found.', 404);
      return;
    }

    if (membership.status !== 'PENDING' && membership.status !== 'PROCESSING') {
      sendError(res, 'Only pending or processing memberships can be approved.', 400);
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Generate certificate
    const memberName = membership.user.profile
      ? `${membership.user.profile.firstName} ${membership.user.profile.lastName}`
      : membership.user.email;

    let certificateUrl: string | null = null;
    try {
      certificateUrl = await generateCertificate({
        memberName,
        membershipId: membership.membershipId,
        approvedDate: now,
        expiryDate: expiresAt,
        membershipType: membership.type,
      });
    } catch (certError) {
      console.error('Certificate generation failed:', certError);
      // Continue without certificate
    }

    const updatedMembership = await prisma.membership.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: now,
        expiresAt,
        certificateUrl,
      },
      include: {
        user: { include: { profile: true } },
        payment: true,
      },
    });

    // Update payment status to COMPLETED
    if (membership.payment) {
      await prisma.payment.update({
        where: { id: membership.payment.id },
        data: {
          status: 'COMPLETED',
          paidAt: now,
        },
      });
    }

    sendSuccess(res, updatedMembership, 'Membership approved successfully.');
  } catch (error) {
    console.error('Approve membership error:', error);
    sendError(res, 'Failed to approve membership.');
  }
};

export const rejectMembership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const membership = await prisma.membership.findUnique({
      where: { id },
    });

    if (!membership) {
      sendError(res, 'Membership not found.', 404);
      return;
    }

    if (membership.status !== 'PENDING' && membership.status !== 'PROCESSING') {
      sendError(res, 'Only pending or processing memberships can be rejected.', 400);
      return;
    }

    const updatedMembership = await prisma.membership.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Application rejected by admin.',
      },
      include: {
        user: { include: { profile: true } },
        payment: true,
      },
    });

    // Update payment status to FAILED
    if (updatedMembership.payment) {
      await prisma.payment.update({
        where: { id: updatedMembership.payment.id },
        data: { status: 'FAILED' },
      });
    }

    sendSuccess(res, updatedMembership, 'Membership rejected.');
  } catch (error) {
    console.error('Reject membership error:', error);
    sendError(res, 'Failed to reject membership.');
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalMemberships,
      pendingMemberships,
      approvedMemberships,
      rejectedMemberships,
      expiredMemberships,
      totalRevenue,
      recentMemberships,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.membership.count(),
      prisma.membership.count({ where: { status: 'PENDING' } }),
      prisma.membership.count({ where: { status: 'APPROVED' } }),
      prisma.membership.count({ where: { status: 'REJECTED' } }),
      prisma.membership.count({ where: { status: 'EXPIRED' } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      prisma.membership.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { include: { profile: true } },
          payment: true,
        },
      }),
    ]);

    sendSuccess(res, {
      totalUsers,
      totalMemberships,
      pendingMemberships,
      approvedMemberships,
      rejectedMemberships,
      expiredMemberships,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentMemberships,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    sendError(res, 'Failed to fetch dashboard stats.');
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        {
          profile: {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { lastName: { contains: search as string, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          profile: true,
          memberships: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    sendError(res, 'Failed to fetch users.');
  }
};
