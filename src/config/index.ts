import dotenv from 'dotenv';
dotenv.config();

const defaultOrigins = [
  'http://localhost:3000',
  'https://ftpi.in',
  'https://www.ftpi.in',
];

const envOrigins = [process.env.FRONTEND_URL, process.env.CORS_ORIGINS]
  .filter((v): v is string => Boolean(v))
  .flatMap((v) => v.split(','))
  .map((o) => o.trim())
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  corsOrigins: Array.from(new Set([...defaultOrigins, ...envOrigins])),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayMode: process.env.RAZORPAY_MODE || 'test',
};
