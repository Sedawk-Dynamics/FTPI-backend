import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const generateMembershipId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  let membershipId: string;
  let exists = true;

  do {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    membershipId = `FTPI-${year}-${randomNum}`;
    const existing = await prisma.membership.findUnique({
      where: { membershipId },
    });
    exists = !!existing;
  } while (exists);

  return membershipId;
};
