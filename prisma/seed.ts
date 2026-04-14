import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ftpi.org' },
    update: {},
    create: {
      email: 'admin@ftpi.org',
      password: adminPassword,
      role: 'ADMIN',
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'FTPI',
          phone: '9999999999',
        },
      },
    },
  });

  console.log('Admin user created:', admin.email);

  // Create sample news
  const news1 = await prisma.news.upsert({
    where: { id: 'seed-news-1' },
    update: {},
    create: {
      id: 'seed-news-1',
      title: 'Welcome to FTPI - Federation of Tax Practitioners of India',
      content:
        'We are pleased to announce the launch of our new membership portal. Tax practitioners across India can now apply for membership online, track their application status, and access exclusive resources. Join our growing community of tax professionals today!',
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  const news2 = await prisma.news.upsert({
    where: { id: 'seed-news-2' },
    update: {},
    create: {
      id: 'seed-news-2',
      title: 'Annual Tax Conference 2026 - Registration Open',
      content:
        'The Federation of Tax Practitioners of India is organizing its Annual Tax Conference in New Delhi. The conference will feature renowned tax experts, panel discussions on latest tax reforms, and networking opportunities. Early bird registration is now open for all members.',
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  const news3 = await prisma.news.upsert({
    where: { id: 'seed-news-3' },
    update: {},
    create: {
      id: 'seed-news-3',
      title: 'New GST Guidelines - Important Updates for Practitioners',
      content:
        'The Central Board of Indirect Taxes and Customs has released new guidelines regarding GST return filing procedures. All tax practitioners are advised to review these changes and update their practices accordingly. FTPI will be conducting webinars to explain the key changes.',
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  console.log('Sample news created:', news1.title, news2.title, news3.title);

  // Create sample events
  const event1 = await prisma.event.upsert({
    where: { id: 'seed-event-1' },
    update: {},
    create: {
      id: 'seed-event-1',
      title: 'Annual Tax Conference 2026',
      description:
        'Join us for the premier tax conference of the year featuring expert speakers, interactive workshops, and networking sessions. Topics include Direct Tax reforms, GST updates, International Taxation, and Transfer Pricing.',
      date: new Date('2026-06-15'),
      venue: 'India Habitat Centre, New Delhi',
      isPublished: true,
    },
  });

  const event2 = await prisma.event.upsert({
    where: { id: 'seed-event-2' },
    update: {},
    create: {
      id: 'seed-event-2',
      title: 'GST Workshop - Advanced Topics',
      description:
        'A hands-on workshop covering advanced GST topics including e-invoicing, input tax credit reconciliation, and GST audit procedures. Limited seats available.',
      date: new Date('2026-05-20'),
      venue: 'FTPI Training Centre, Mumbai',
      isPublished: true,
    },
  });

  const event3 = await prisma.event.upsert({
    where: { id: 'seed-event-3' },
    update: {},
    create: {
      id: 'seed-event-3',
      title: 'Income Tax Filing Season Preparation Webinar',
      description:
        'Get ready for the upcoming income tax filing season with our comprehensive webinar. Learn about the latest changes in ITR forms, new tax regime updates, and common filing mistakes to avoid.',
      date: new Date('2026-05-05'),
      venue: 'Online (Zoom)',
      isPublished: true,
    },
  });

  console.log('Sample events created:', event1.title, event2.title, event3.title);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
