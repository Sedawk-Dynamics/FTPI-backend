import { Response } from 'express';
import { PrismaClient, MembershipStatus, PaymentStatus, Role, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { generateCertificate } from '../utils/generateCertificate';
import { logActivity } from '../utils/activityLog';

const prisma = new PrismaClient();

/* ----------------------------- MEMBERSHIPS ----------------------------- */

export const getAllMemberships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      search,
      type,
      from,
      to,
      sort = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.MembershipWhereInput = {};

    if (status && status !== 'ALL') {
      where.status = status as MembershipStatus;
    }

    if (type) {
      where.type = type as string;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from as string);
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to as string);
    }

    if (search) {
      const s = search as string;
      where.OR = [
        { membershipId: { contains: s, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: s, mode: 'insensitive' } },
              {
                profile: {
                  OR: [
                    { firstName: { contains: s, mode: 'insensitive' } },
                    { lastName: { contains: s, mode: 'insensitive' } },
                    { phone: { contains: s, mode: 'insensitive' } },
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
          user: { include: { profile: true } },
          payment: true,
        },
        orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
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
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    });
  } catch (error) {
    console.error('Get all memberships error:', error);
    sendError(res, 'Failed to fetch memberships.');
  }
};

export const getMembershipDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const membership = await prisma.membership.findUnique({
      where: { id: req.params.id },
      include: { user: { include: { profile: true } }, payment: true },
    });
    if (!membership) {
      sendError(res, 'Membership not found.', 404);
      return;
    }
    sendSuccess(res, membership);
  } catch (error) {
    console.error('Get membership detail error:', error);
    sendError(res, 'Failed to fetch membership.');
  }
};

export const approveMembership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body as { adminNote?: string };

    const membership = await prisma.membership.findUnique({
      where: { id },
      include: { user: { include: { profile: true } }, payment: true },
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
    }

    const updatedMembership = await prisma.membership.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: now,
        expiresAt,
        certificateUrl,
        adminNote: adminNote || membership.adminNote,
      },
      include: {
        user: { include: { profile: true } },
        payment: true,
      },
    });

    if (membership.payment) {
      await prisma.payment.update({
        where: { id: membership.payment.id },
        data: { status: 'COMPLETED', paidAt: membership.payment.paidAt ?? now },
      });
    }

    await logActivity({
      actorId: req.user?.id,
      action: 'APPROVE',
      entity: 'Membership',
      entityId: id,
      details: { membershipId: membership.membershipId, member: memberName },
    });

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
      include: { payment: true },
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

    if (membership.payment) {
      await prisma.payment.update({
        where: { id: membership.payment.id },
        data: { status: 'FAILED' },
      });
    }

    await logActivity({
      actorId: req.user?.id,
      action: 'REJECT',
      entity: 'Membership',
      entityId: id,
      details: { reason },
    });

    sendSuccess(res, updatedMembership, 'Membership rejected.');
  } catch (error) {
    console.error('Reject membership error:', error);
    sendError(res, 'Failed to reject membership.');
  }
};

export const extendMembership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { months = 12 } = req.body as { months?: number };

    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) {
      sendError(res, 'Membership not found.', 404);
      return;
    }

    const base = membership.expiresAt && membership.expiresAt > new Date()
      ? new Date(membership.expiresAt)
      : new Date();
    base.setMonth(base.getMonth() + Number(months));

    const updated = await prisma.membership.update({
      where: { id },
      data: {
        expiresAt: base,
        status: membership.status === 'EXPIRED' ? 'APPROVED' : membership.status,
      },
      include: { user: { include: { profile: true } }, payment: true },
    });

    await logActivity({
      actorId: req.user?.id,
      action: 'EXTEND',
      entity: 'Membership',
      entityId: id,
      details: { months, newExpiry: base.toISOString() },
    });

    sendSuccess(res, updated, `Membership extended by ${months} months.`);
  } catch (error) {
    console.error('Extend membership error:', error);
    sendError(res, 'Failed to extend membership.');
  }
};

export const revokeMembership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) {
      sendError(res, 'Membership not found.', 404);
      return;
    }

    const updated = await prisma.membership.update({
      where: { id },
      data: {
        status: 'EXPIRED',
        adminNote: reason ? `Revoked: ${reason}` : 'Revoked by admin',
        expiresAt: new Date(),
      },
      include: { user: { include: { profile: true } }, payment: true },
    });

    await logActivity({
      actorId: req.user?.id,
      action: 'REVOKE',
      entity: 'Membership',
      entityId: id,
      details: { reason },
    });

    sendSuccess(res, updated, 'Membership revoked.');
  } catch (error) {
    console.error('Revoke membership error:', error);
    sendError(res, 'Failed to revoke membership.');
  }
};

export const updateMembership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, expiresAt, adminNote, type } = req.body as {
      status?: MembershipStatus;
      expiresAt?: string;
      adminNote?: string;
      type?: string;
    };

    const data: Prisma.MembershipUpdateInput = {};
    if (status) data.status = status;
    if (expiresAt) data.expiresAt = new Date(expiresAt);
    if (adminNote !== undefined) data.adminNote = adminNote;
    if (type) data.type = type;

    const updated = await prisma.membership.update({
      where: { id },
      data,
      include: { user: { include: { profile: true } }, payment: true },
    });

    await logActivity({
      actorId: req.user?.id,
      action: 'UPDATE',
      entity: 'Membership',
      entityId: id,
      details: { ...data },
    });

    sendSuccess(res, updated, 'Membership updated.');
  } catch (error) {
    console.error('Update membership error:', error);
    sendError(res, 'Failed to update membership.');
  }
};

export const deleteMembership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) {
      sendError(res, 'Membership not found.', 404);
      return;
    }
    await prisma.membership.delete({ where: { id } });

    await logActivity({
      actorId: req.user?.id,
      action: 'DELETE',
      entity: 'Membership',
      entityId: id,
      details: { membershipId: membership.membershipId },
    });

    sendSuccess(res, null, 'Membership deleted.');
  } catch (error) {
    console.error('Delete membership error:', error);
    sendError(res, 'Failed to delete membership.');
  }
};

export const bulkMembershipAction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids, action, reason } = req.body as {
      ids: string[];
      action: 'approve' | 'reject' | 'delete' | 'revoke';
      reason?: string;
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      sendError(res, 'No membership ids provided.', 400);
      return;
    }

    let count = 0;
    for (const id of ids) {
      try {
        if (action === 'approve') {
          await approveInternal(id, req.user?.id);
          count++;
        } else if (action === 'reject') {
          await prisma.membership.update({
            where: { id },
            data: { status: 'REJECTED', rejectionReason: reason || 'Bulk rejected' },
          });
          count++;
        } else if (action === 'delete') {
          await prisma.membership.delete({ where: { id } });
          count++;
        } else if (action === 'revoke') {
          await prisma.membership.update({
            where: { id },
            data: { status: 'EXPIRED', adminNote: reason || 'Bulk revoked', expiresAt: new Date() },
          });
          count++;
        }
      } catch (e) {
        console.error('Bulk op failed for', id, e);
      }
    }

    await logActivity({
      actorId: req.user?.id,
      action: `BULK_${action.toUpperCase()}`,
      entity: 'Membership',
      details: { count, ids },
    });

    sendSuccess(res, { count }, `${count} memberships ${action}d.`);
  } catch (error) {
    console.error('Bulk membership action error:', error);
    sendError(res, 'Bulk action failed.');
  }
};

async function approveInternal(id: string, actorId?: string) {
  const membership = await prisma.membership.findUnique({
    where: { id },
    include: { user: { include: { profile: true } }, payment: true },
  });
  if (!membership) return;
  if (membership.status !== 'PENDING' && membership.status !== 'PROCESSING') return;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
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
  } catch {
    /* noop */
  }
  await prisma.membership.update({
    where: { id },
    data: { status: 'APPROVED', approvedAt: now, expiresAt, certificateUrl },
  });
  if (membership.payment) {
    await prisma.payment.update({
      where: { id: membership.payment.id },
      data: { status: 'COMPLETED', paidAt: membership.payment.paidAt ?? now },
    });
  }
  await logActivity({
    actorId,
    action: 'APPROVE',
    entity: 'Membership',
    entityId: id,
    details: { via: 'bulk' },
  });
}

export const exportMembershipsCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, from, to } = req.query;
    const where: Prisma.MembershipWhereInput = {};
    if (status && status !== 'ALL') where.status = status as MembershipStatus;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from as string);
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to as string);
    }

    const memberships = await prisma.membership.findMany({
      where,
      include: { user: { include: { profile: true } }, payment: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Membership ID', 'Status', 'Type', 'Name', 'Email', 'Phone', 'City', 'District', 'State',
      'Profession', 'Applied At', 'Approved At', 'Expires At', 'Amount', 'Payment Status', 'Transaction ID',
    ];
    const rows = memberships.map((m) => [
      m.membershipId,
      m.status,
      m.type,
      m.user.profile ? `${m.user.profile.firstName} ${m.user.profile.lastName}` : '',
      m.user.email,
      m.user.profile?.phone || '',
      m.user.profile?.city || '',
      m.user.profile?.district || '',
      m.user.profile?.state || '',
      m.user.profile?.profession || '',
      m.appliedAt?.toISOString() || '',
      m.approvedAt?.toISOString() || '',
      m.expiresAt?.toISOString() || '',
      m.payment?.amount ?? '',
      m.payment?.status ?? '',
      m.payment?.transactionId || '',
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=memberships-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    sendError(res, 'Export failed.');
  }
};

/* ----------------------------- USERS ----------------------------- */

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search, role, isActive } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.UserWhereInput = {};

    if (role && role !== 'ALL') where.role = role as Role;
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    if (search) {
      const s = search as string;
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        {
          profile: {
            OR: [
              { firstName: { contains: s, mode: 'insensitive' } },
              { lastName: { contains: s, mode: 'insensitive' } },
              { phone: { contains: s, mode: 'insensitive' } },
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
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          profile: true,
          memberships: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, membershipId: true, status: true, expiresAt: true },
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
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    sendError(res, 'Failed to fetch users.');
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        memberships: {
          include: { payment: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }
    sendSuccess(res, user);
  } catch (error) {
    console.error('Get user error:', error);
    sendError(res, 'Failed to fetch user.');
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, isActive, email, password } = req.body as {
      role?: Role;
      isActive?: boolean;
      email?: string;
      password?: string;
    };

    const data: Prisma.UserUpdateInput = {};
    if (role) data.role = role;
    if (typeof isActive === 'boolean') data.isActive = isActive;
    if (email) data.email = email;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, role: true, isActive: true, profile: true,
      },
    });

    await logActivity({
      actorId: req.user?.id,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      details: { role, isActive, emailChanged: !!email, passwordChanged: !!password },
    });

    sendSuccess(res, user, 'User updated.');
  } catch (error) {
    console.error('Update user error:', error);
    sendError(res, 'Failed to update user.');
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      sendError(res, 'You cannot delete your own account.', 400);
      return;
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }
    await prisma.user.delete({ where: { id } });
    await logActivity({
      actorId: req.user?.id,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: id,
      details: { email: user.email },
    });
    sendSuccess(res, null, 'User deleted.');
  } catch (error) {
    console.error('Delete user error:', error);
    sendError(res, 'Failed to delete user.');
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, role = 'USER', firstName, lastName, phone } = req.body as {
      email: string; password: string; role?: Role; firstName?: string; lastName?: string; phone?: string;
    };

    if (!email || !password) {
      sendError(res, 'Email and password are required.', 400);
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'Email already in use.', 400);
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: role as Role,
        profile: firstName || lastName || phone ? {
          create: {
            firstName: firstName || '',
            lastName: lastName || '',
            phone: phone || '',
          },
        } : undefined,
      },
      select: { id: true, email: true, role: true, isActive: true, profile: true },
    });

    await logActivity({
      actorId: req.user?.id,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user.id,
      details: { email, role },
    });

    sendSuccess(res, user, 'User created.', 201);
  } catch (error) {
    console.error('Create user error:', error);
    sendError(res, 'Failed to create user.');
  }
};

/* ----------------------------- PAYMENTS ----------------------------- */

export const getAllPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, search, from, to } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.PaymentWhereInput = {};

    if (status && status !== 'ALL') where.status = status as PaymentStatus;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from as string);
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to as string);
    }

    if (search) {
      const s = search as string;
      where.OR = [
        { transactionId: { contains: s, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: s, mode: 'insensitive' } },
              {
                profile: {
                  OR: [
                    { firstName: { contains: s, mode: 'insensitive' } },
                    { lastName: { contains: s, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    const [payments, total, totalRevenueAgg] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          membership: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { ...where, status: 'COMPLETED' } }),
    ]);

    sendSuccess(res, {
      payments,
      totalRevenue: totalRevenueAgg._sum.amount || 0,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    });
  } catch (error) {
    console.error('Get payments error:', error);
    sendError(res, 'Failed to fetch payments.');
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: PaymentStatus };

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status,
        paidAt: status === 'COMPLETED' ? new Date() : null,
      },
      include: { membership: true, user: true },
    });

    await logActivity({
      actorId: req.user?.id,
      action: 'UPDATE_PAYMENT',
      entity: 'Payment',
      entityId: id,
      details: { status },
    });

    sendSuccess(res, payment, 'Payment updated.');
  } catch (error) {
    console.error('Update payment error:', error);
    sendError(res, 'Failed to update payment.');
  }
};

export const refundPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'REFUNDED' },
      include: { membership: true },
    });

    if (payment.membership) {
      await prisma.membership.update({
        where: { id: payment.membership.id },
        data: { status: 'EXPIRED', adminNote: `Refunded: ${reason || 'by admin'}` },
      });
    }

    await logActivity({
      actorId: req.user?.id,
      action: 'REFUND_PAYMENT',
      entity: 'Payment',
      entityId: id,
      details: { reason },
    });

    sendSuccess(res, payment, 'Payment refunded.');
  } catch (error) {
    console.error('Refund error:', error);
    sendError(res, 'Failed to refund payment.');
  }
};

/* ----------------------------- ANALYTICS ----------------------------- */

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const expiringSoon = new Date(now);
    expiringSoon.setDate(expiringSoon.getDate() + 30);

    const [
      totalUsers,
      totalMemberships,
      pendingMemberships,
      processingMemberships,
      approvedMemberships,
      rejectedMemberships,
      expiredMemberships,
      revenueAgg,
      revenueThisMonthAgg,
      revenueLastMonthAgg,
      membershipsLast30,
      membershipsPrev30,
      expiringSoonCount,
      recentMemberships,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.membership.count(),
      prisma.membership.count({ where: { status: 'PENDING' } }),
      prisma.membership.count({ where: { status: 'PROCESSING' } }),
      prisma.membership.count({ where: { status: 'APPROVED' } }),
      prisma.membership.count({ where: { status: 'REJECTED' } }),
      prisma.membership.count({ where: { status: 'EXPIRED' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED', paidAt: { gte: thirtyDaysAgo } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED', paidAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      prisma.membership.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.membership.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      prisma.membership.count({
        where: {
          status: 'APPROVED',
          expiresAt: { lte: expiringSoon, gte: now },
        },
      }),
      prisma.membership.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { include: { profile: true } }, payment: true },
      }),
    ]);

    const totalRevenue = revenueAgg._sum.amount || 0;
    const revenueThisMonth = revenueThisMonthAgg._sum.amount || 0;
    const revenueLastMonth = revenueLastMonthAgg._sum.amount || 0;

    sendSuccess(res, {
      totalUsers,
      totalMembers: totalUsers,
      totalMemberships,
      pendingMemberships,
      pendingApprovals: pendingMemberships + processingMemberships,
      processingMemberships,
      approvedMembers: approvedMemberships,
      approvedMemberships,
      rejectedMemberships,
      expiredMemberships,
      expiringSoonCount,
      totalRevenue,
      revenueThisMonth,
      revenueLastMonth,
      membershipsLast30,
      membershipsPrev30,
      recentMemberships,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    sendError(res, 'Failed to fetch dashboard stats.');
  }
};

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const months = Math.min(24, parseInt((req.query.months as string) || '12', 10));
    const now = new Date();

    const series: { month: string; revenue: number; count: number; approved: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      const [revenueRow, countRow, approvedRow] = await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'COMPLETED', paidAt: { gte: start, lt: end } },
        }),
        prisma.membership.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.membership.count({
          where: { status: 'APPROVED', approvedAt: { gte: start, lt: end } },
        }),
      ]);

      series.push({
        month: label,
        revenue: revenueRow._sum.amount || 0,
        count: countRow,
        approved: approvedRow,
      });
    }

    const statusBreakdown = await prisma.membership.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    // District/state distribution from profiles of users with memberships
    const usersWithMembership = await prisma.user.findMany({
      where: { memberships: { some: {} } },
      select: { profile: { select: { state: true, district: true, profession: true } } },
    });

    const stateCounts: Record<string, number> = {};
    const professionCounts: Record<string, number> = {};
    for (const u of usersWithMembership) {
      const state = u.profile?.state || 'Unknown';
      stateCounts[state] = (stateCounts[state] || 0) + 1;
      const profession = u.profile?.profession || 'Unknown';
      professionCounts[profession] = (professionCounts[profession] || 0) + 1;
    }

    const topStates = Object.entries(stateCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topProfessions = Object.entries(professionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    sendSuccess(res, {
      series,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count._all,
      })),
      topStates,
      topProfessions,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    sendError(res, 'Failed to fetch analytics.');
  }
};

/* ----------------------------- ACTIVITY LOG ----------------------------- */

export const getActivityLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', entity, action } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ActivityLogWhereInput = {};
    if (entity) where.entity = entity as string;
    if (action) where.action = action as string;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { actor: { select: { email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.activityLog.count({ where }),
    ]);

    sendSuccess(res, {
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    });
  } catch (error) {
    console.error('Activity log error:', error);
    sendError(res, 'Failed to fetch activity log.');
  }
};

/* ----------------------------- SETTINGS ----------------------------- */

export const getSettings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await prisma.siteSettings.findMany();
    const obj: Record<string, string> = {};
    for (const s of settings) obj[s.key] = s.value;
    sendSuccess(res, obj);
  } catch (error) {
    console.error('Get settings error:', error);
    sendError(res, 'Failed to fetch settings.');
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updates = req.body as Record<string, string>;
    const keys = Object.keys(updates);

    for (const key of keys) {
      const value = String(updates[key]);
      await prisma.siteSettings.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    await logActivity({
      actorId: req.user?.id,
      action: 'UPDATE_SETTINGS',
      entity: 'SiteSettings',
      details: { keys },
    });

    const all = await prisma.siteSettings.findMany();
    const obj: Record<string, string> = {};
    for (const s of all) obj[s.key] = s.value;
    sendSuccess(res, obj, 'Settings updated.');
  } catch (error) {
    console.error('Update settings error:', error);
    sendError(res, 'Failed to update settings.');
  }
};
