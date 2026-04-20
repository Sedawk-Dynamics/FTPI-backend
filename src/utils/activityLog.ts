import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LogArgs {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}

export const logActivity = async (args: LogArgs): Promise<void> => {
  try {
    const details =
      typeof args.details === 'object' && args.details !== null
        ? JSON.stringify(args.details)
        : (args.details as string | null | undefined) ?? null;

    await prisma.activityLog.create({
      data: {
        actorId: args.actorId ?? null,
        action: args.action,
        entity: args.entity,
        entityId: args.entityId ?? null,
        details,
        ipAddress: args.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error('Activity log failed:', err);
  }
};
