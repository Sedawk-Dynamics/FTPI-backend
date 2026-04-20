import { PrismaClient, MembershipStatus, PaymentStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateMembershipId } from '../src/utils/generateMembershipId';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

interface SeedUser {
  email: string;
  password: string;
  role?: Role;
  firstName: string;
  lastName: string;
  phone: string;
  fatherName?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  profession?: string;
  qualification?: string;
  gstNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  // Membership
  membershipStatus?: MembershipStatus;
  appliedDaysAgo?: number;
  expiresDays?: number;
  paymentStatus?: PaymentStatus;
  amount?: number;
  rejectionReason?: string;
}

const seedUsers: SeedUser[] = [
  {
    email: 'admin@ftpi.org',
    password: 'admin123',
    role: 'ADMIN',
    firstName: 'Admin',
    lastName: 'FTPI',
    phone: '9999999999',
  },
  {
    email: 'superadmin@ftpi.org',
    password: 'admin123',
    role: 'ADMIN',
    firstName: 'Super',
    lastName: 'Admin',
    phone: '9999988888',
  },
  // APPROVED members
  {
    email: 'rajesh.kumar@gmail.com',
    password: 'test1234',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    phone: '9876543210',
    fatherName: 'Suresh Kumar',
    city: 'Ahmedabad',
    district: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380001',
    profession: 'chartered_accountant',
    qualification: 'CA',
    gstNumber: '24ABCDE1234F1Z5',
    panNumber: 'ABCDE1234F',
    aadharNumber: '123456789012',
    membershipStatus: 'APPROVED',
    appliedDaysAgo: 90,
    expiresDays: 275,
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  {
    email: 'priya.shah@yahoo.com',
    password: 'test1234',
    firstName: 'Priya',
    lastName: 'Shah',
    phone: '9823456710',
    fatherName: 'Dinesh Shah',
    city: 'Surat',
    district: 'Surat',
    state: 'Gujarat',
    pincode: '395001',
    profession: 'tax_consultant',
    qualification: 'MBA',
    gstNumber: '24XYZAB5678C1Z9',
    membershipStatus: 'APPROVED',
    appliedDaysAgo: 120,
    expiresDays: 245,
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  {
    email: 'amit.patel@outlook.com',
    password: 'test1234',
    firstName: 'Amit',
    lastName: 'Patel',
    phone: '9898989898',
    fatherName: 'Mukesh Patel',
    city: 'Vadodara',
    district: 'Vadodara',
    state: 'Gujarat',
    pincode: '390001',
    profession: 'advocate',
    qualification: 'LLB',
    membershipStatus: 'APPROVED',
    appliedDaysAgo: 200,
    expiresDays: 165,
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  {
    email: 'sneha.mehta@gmail.com',
    password: 'test1234',
    firstName: 'Sneha',
    lastName: 'Mehta',
    phone: '9812345678',
    fatherName: 'Rakesh Mehta',
    city: 'Rajkot',
    district: 'Rajkot',
    state: 'Gujarat',
    pincode: '360001',
    profession: 'chartered_accountant',
    qualification: 'CA',
    membershipStatus: 'APPROVED',
    appliedDaysAgo: 340,
    expiresDays: 25, // expiring soon
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  {
    email: 'vikram.singh@gmail.com',
    password: 'test1234',
    firstName: 'Vikram',
    lastName: 'Singh',
    phone: '9999123456',
    fatherName: 'Rajinder Singh',
    city: 'Mumbai',
    district: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    profession: 'tax_consultant',
    qualification: 'CS',
    membershipStatus: 'APPROVED',
    appliedDaysAgo: 60,
    expiresDays: 305,
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  {
    email: 'anjali.verma@gmail.com',
    password: 'test1234',
    firstName: 'Anjali',
    lastName: 'Verma',
    phone: '9876500001',
    fatherName: 'Sushil Verma',
    city: 'Pune',
    district: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    profession: 'chartered_accountant',
    qualification: 'CA',
    membershipStatus: 'APPROVED',
    appliedDaysAgo: 30,
    expiresDays: 335,
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  // PROCESSING (paid, awaiting admin approval)
  {
    email: 'deepak.joshi@gmail.com',
    password: 'test1234',
    firstName: 'Deepak',
    lastName: 'Joshi',
    phone: '9865432100',
    fatherName: 'Harilal Joshi',
    city: 'Bengaluru',
    district: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    profession: 'tax_consultant',
    qualification: 'CMA',
    membershipStatus: 'PROCESSING',
    appliedDaysAgo: 2,
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  {
    email: 'meera.nair@gmail.com',
    password: 'test1234',
    firstName: 'Meera',
    lastName: 'Nair',
    phone: '9944332211',
    fatherName: 'Ravi Nair',
    city: 'Kochi',
    district: 'Kochi',
    state: 'Kerala',
    pincode: '682001',
    profession: 'advocate',
    qualification: 'LLM',
    membershipStatus: 'PROCESSING',
    appliedDaysAgo: 4,
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  {
    email: 'arjun.reddy@gmail.com',
    password: 'test1234',
    firstName: 'Arjun',
    lastName: 'Reddy',
    phone: '9012345678',
    fatherName: 'Krishna Reddy',
    city: 'Hyderabad',
    district: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    profession: 'chartered_accountant',
    qualification: 'CA',
    membershipStatus: 'PROCESSING',
    appliedDaysAgo: 1,
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  // PENDING (no payment yet)
  {
    email: 'kavita.bansal@gmail.com',
    password: 'test1234',
    firstName: 'Kavita',
    lastName: 'Bansal',
    phone: '9811223344',
    fatherName: 'Om Prakash Bansal',
    city: 'Jaipur',
    district: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    profession: 'tax_consultant',
    qualification: 'B.Com',
    membershipStatus: 'PENDING',
    appliedDaysAgo: 1,
    paymentStatus: 'PENDING',
    amount: 1000,
  },
  {
    email: 'rohit.sharma@gmail.com',
    password: 'test1234',
    firstName: 'Rohit',
    lastName: 'Sharma',
    phone: '9876001122',
    fatherName: 'Ashok Sharma',
    city: 'Delhi',
    district: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    profession: 'advocate',
    qualification: 'LLB',
    membershipStatus: 'PENDING',
    appliedDaysAgo: 5,
    paymentStatus: 'PENDING',
    amount: 1000,
  },
  // REJECTED
  {
    email: 'sunita.rao@gmail.com',
    password: 'test1234',
    firstName: 'Sunita',
    lastName: 'Rao',
    phone: '9087654321',
    city: 'Chennai',
    district: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    profession: 'tax_consultant',
    qualification: 'B.Com',
    membershipStatus: 'REJECTED',
    appliedDaysAgo: 20,
    paymentStatus: 'FAILED',
    amount: 1000,
    rejectionReason: 'Submitted documents were not clear. Please re-apply with legible scans.',
  },
  // EXPIRED
  {
    email: 'pradeep.gupta@gmail.com',
    password: 'test1234',
    firstName: 'Pradeep',
    lastName: 'Gupta',
    phone: '9123456780',
    fatherName: 'Brij Mohan Gupta',
    city: 'Lucknow',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226001',
    profession: 'chartered_accountant',
    qualification: 'CA',
    membershipStatus: 'EXPIRED',
    appliedDaysAgo: 400,
    expiresDays: -30,
    paymentStatus: 'COMPLETED',
    amount: 1000,
  },
  // Users without membership
  {
    email: 'naveen.khanna@gmail.com',
    password: 'test1234',
    firstName: 'Naveen',
    lastName: 'Khanna',
    phone: '9855667788',
    city: 'Kolkata',
    district: 'Kolkata',
    state: 'West Bengal',
    pincode: '700001',
    profession: 'tax_consultant',
  },
];

async function main() {
  console.log('Seeding database...');

  let createdUsers = 0;
  let createdMemberships = 0;
  let createdPayments = 0;

  for (const u of seedUsers) {
    const hashed = await hash(u.password);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: hashed,
        role: u.role ?? 'USER',
        profile: {
          create: {
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            fatherName: u.fatherName,
            city: u.city,
            district: u.district,
            state: u.state,
            pincode: u.pincode,
            profession: u.profession,
            qualification: u.qualification,
            gstNumber: u.gstNumber,
            panNumber: u.panNumber,
            aadharNumber: u.aadharNumber,
          },
        },
      },
    });
    createdUsers++;

    if (u.membershipStatus) {
      const appliedAt = u.appliedDaysAgo !== undefined ? daysAgo(u.appliedDaysAgo) : new Date();
      const expiresAt =
        u.expiresDays !== undefined
          ? u.expiresDays >= 0
            ? daysFromNow(u.expiresDays)
            : daysAgo(Math.abs(u.expiresDays))
          : null;
      const approvedAt =
        u.membershipStatus === 'APPROVED' || u.membershipStatus === 'EXPIRED'
          ? new Date(appliedAt.getTime() + 2 * 24 * 60 * 60 * 1000)
          : null;

      const membershipId = await generateMembershipId();

      const membership = await prisma.membership.create({
        data: {
          userId: user.id,
          membershipId,
          type: 'YEARLY',
          status: u.membershipStatus,
          appliedAt,
          approvedAt,
          expiresAt,
          rejectionReason: u.rejectionReason ?? null,
          payment: {
            create: {
              userId: user.id,
              amount: u.amount ?? 1000,
              currency: 'INR',
              status: u.paymentStatus ?? 'PENDING',
              paymentMethod: u.paymentStatus === 'COMPLETED' ? 'RAZORPAY' : 'ONLINE',
              transactionId:
                u.paymentStatus === 'COMPLETED'
                  ? `pay_SEED${Math.random().toString(36).slice(2, 12).toUpperCase()}`
                  : null,
              paidAt: u.paymentStatus === 'COMPLETED' ? appliedAt : null,
            },
          },
        },
      });

      createdMemberships++;
      createdPayments++;
      console.log(`  [${u.membershipStatus.padEnd(10)}] ${membership.membershipId} · ${u.email}`);
    } else {
      console.log(`  [USER       ] ${u.email}`);
    }
  }

  // News
  const newsItems = [
    {
      id: 'seed-news-1',
      title: 'Welcome to FTPI - Federation of Tax Practitioners of India',
      content:
        'We are pleased to announce the launch of our new membership portal. Tax practitioners across India can now apply for membership online, track their application status, and access exclusive resources. Join our growing community of tax professionals today!',
    },
    {
      id: 'seed-news-2',
      title: 'Annual Tax Conference 2026 - Registration Open',
      content:
        'The Federation of Tax Practitioners of India is organizing its Annual Tax Conference in New Delhi. The conference will feature renowned tax experts, panel discussions on latest tax reforms, and networking opportunities. Early bird registration is now open for all members.',
    },
    {
      id: 'seed-news-3',
      title: 'New GST Guidelines - Important Updates for Practitioners',
      content:
        'The Central Board of Indirect Taxes and Customs has released new guidelines regarding GST return filing procedures. All tax practitioners are advised to review these changes and update their practices accordingly. FTPI will be conducting webinars to explain the key changes.',
    },
  ];

  for (const n of newsItems) {
    await prisma.news.upsert({
      where: { id: n.id },
      update: {},
      create: { ...n, isPublished: true, publishedAt: new Date() },
    });
  }
  console.log(`${newsItems.length} news articles seeded`);

  // Events
  const events = [
    {
      id: 'seed-event-1',
      title: 'Annual Tax Conference 2026',
      description:
        'Join us for the premier tax conference of the year featuring expert speakers, interactive workshops, and networking sessions. Topics include Direct Tax reforms, GST updates, International Taxation, and Transfer Pricing.',
      date: new Date('2026-06-15'),
      venue: 'India Habitat Centre, New Delhi',
    },
    {
      id: 'seed-event-2',
      title: 'GST Workshop - Advanced Topics',
      description:
        'A hands-on workshop covering advanced GST topics including e-invoicing, input tax credit reconciliation, and GST audit procedures. Limited seats available.',
      date: new Date('2026-05-20'),
      venue: 'FTPI Training Centre, Mumbai',
    },
    {
      id: 'seed-event-3',
      title: 'Income Tax Filing Season Preparation Webinar',
      description:
        'Get ready for the upcoming income tax filing season with our comprehensive webinar. Learn about the latest changes in ITR forms, new tax regime updates, and common filing mistakes to avoid.',
      date: new Date('2026-05-05'),
      venue: 'Online (Zoom)',
    },
  ];

  for (const e of events) {
    await prisma.event.upsert({
      where: { id: e.id },
      update: {},
      create: { ...e, isPublished: true },
    });
  }
  console.log(`${events.length} events seeded`);

  // Default site settings
  const settings = {
    membershipPrice: '1000',
    membershipCurrency: 'INR',
    membershipDurationMonths: '12',
    siteName: 'FTPI',
    siteTagline: 'Federation of Tax Practitioners India',
    contactEmail: 'contact@ftpi.org',
    contactPhone: '+91 11 1234 5678',
    organizationAddress: 'New Delhi, India',
    razorpayMode: 'test',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSettings.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log(`${Object.keys(settings).length} settings seeded`);

  console.log('\nSeed summary:');
  console.log(`  Users:        ${createdUsers}`);
  console.log(`  Memberships:  ${createdMemberships}`);
  console.log(`  Payments:     ${createdPayments}`);
  console.log(`  News:         ${newsItems.length}`);
  console.log(`  Events:       ${events.length}`);
  console.log('\nLogin credentials:');
  console.log('  Admin:  admin@ftpi.org / admin123');
  console.log('  User:   rajesh.kumar@gmail.com / test1234');
  console.log('\nSeeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
