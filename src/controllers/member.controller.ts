import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

export const searchMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      name,
      district,
      status = 'APPROVED',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const membershipWhere: Record<string, unknown> = {
      status: status as string,
    };

    const profileWhere: Record<string, unknown>[] = [];

    if (name) {
      profileWhere.push(
        { firstName: { contains: name as string, mode: 'insensitive' } },
        { lastName: { contains: name as string, mode: 'insensitive' } }
      );
    }

    if (district) {
      profileWhere.push({
        district: { contains: district as string, mode: 'insensitive' },
      });
    }

    if (name && district) {
      membershipWhere.user = {
        profile: {
          AND: [
            {
              OR: [
                { firstName: { contains: name as string, mode: 'insensitive' } },
                { lastName: { contains: name as string, mode: 'insensitive' } },
              ],
            },
            { district: { contains: district as string, mode: 'insensitive' } },
          ],
        },
      };
    } else if (name) {
      membershipWhere.user = {
        profile: {
          OR: [
            { firstName: { contains: name as string, mode: 'insensitive' } },
            { lastName: { contains: name as string, mode: 'insensitive' } },
          ],
        },
      };
    } else if (district) {
      membershipWhere.user = {
        profile: {
          district: { contains: district as string, mode: 'insensitive' },
        },
      };
    }

    const [members, total] = await Promise.all([
      prisma.membership.findMany({
        where: membershipWhere,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  city: true,
                  district: true,
                  state: true,
                  profession: true,
                  practiceArea: true,
                  photoUrl: true,
                },
              },
            },
          },
        },
        orderBy: { approvedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.membership.count({ where: membershipWhere }),
    ]);

    sendSuccess(res, {
      members,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Search members error:', error);
    sendError(res, 'Failed to search members.');
  }
};
