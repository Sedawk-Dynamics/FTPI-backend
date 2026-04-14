import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import razorpayInstance from '../utils/razorpay';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();
const router = Router();

// GET /payments/config - Public: returns Razorpay key and mode
router.get('/config', (_req: Request, res: Response) => {
  sendSuccess(res, {
    keyId: config.razorpayKeyId,
    mode: config.razorpayMode,
  });
});

// POST /payments/create-order - Create a Razorpay order
router.post('/create-order', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const { amount, membershipId } = req.body;

    if (!amount || !membershipId) {
      sendError(res, 'Amount and membershipId are required.', 400);
      return;
    }

    // Verify membership belongs to the user
    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, userId: req.user.id },
      include: { payment: true },
    });

    if (!membership) {
      sendError(res, 'Membership not found.', 404);
      return;
    }

    if (membership.payment?.status === 'COMPLETED') {
      sendError(res, 'Payment already completed for this membership.', 400);
      return;
    }

    // Create Razorpay order (amount in paise)
    const order = await razorpayInstance.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      receipt: `rcpt_${String(membershipId).replace(/-/g, '').slice(0, 35)}`,
      notes: {
        membershipId,
        userId: req.user.id,
      },
    });

    // Store order ID in payment record
    if (membership.payment) {
      await prisma.payment.update({
        where: { id: membership.payment.id },
        data: { transactionId: order.id },
      });
    }

    sendSuccess(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.razorpayKeyId,
      mode: config.razorpayMode,
    });
  } catch (error) {
    console.error('Create order error:', error);
    sendError(res, 'Failed to create payment order.');
  }
});

// POST /payments/verify - Verify Razorpay payment signature
router.post('/verify', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, membershipId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !membershipId) {
      sendError(res, 'Missing payment verification parameters.', 400);
      return;
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      sendError(res, 'Payment verification failed. Invalid signature.', 400);
      return;
    }

    // Verify membership belongs to the user
    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, userId: req.user.id },
      include: { payment: true },
    });

    if (!membership || !membership.payment) {
      sendError(res, 'Membership or payment not found.', 404);
      return;
    }

    // Update payment to COMPLETED
    await prisma.payment.update({
      where: { id: membership.payment.id },
      data: {
        status: 'COMPLETED',
        transactionId: razorpay_payment_id,
        paidAt: new Date(),
        paymentMethod: 'RAZORPAY',
      },
    });

    // Update membership status to PROCESSING (payment done, waiting for admin approval)
    await prisma.membership.update({
      where: { id: membershipId },
      data: { status: 'PROCESSING' },
    });

    sendSuccess(res, {
      membershipId,
      paymentId: razorpay_payment_id,
      status: 'PROCESSING',
    }, 'Payment verified successfully. Your membership is now being processed.');
  } catch (error) {
    console.error('Payment verification error:', error);
    sendError(res, 'Payment verification failed.');
  }
});

export default router;
