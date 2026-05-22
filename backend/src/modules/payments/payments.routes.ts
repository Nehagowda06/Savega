import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import { z } from "zod";
import { NotificationService } from "../../services/notification.service.js";

export const paymentsRouter = Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: env.razorpayKeyId,
  key_secret: env.razorpayKeySecret,
});

// All payment routes require authentication
paymentsRouter.use(authenticate);

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * POST /api/payments/create
 * Create Razorpay order for payment
 */
paymentsRouter.post("/payments/create", async (req, res, next) => {
  try {
    const { orderId } = createPaymentSchema.parse(req.body);

    // Get order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user!.id,
      },
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    if (order.paymentStatus === "PAID") {
      throw new AppError(400, "Order is already paid");
    }

    if (order.paymentMethod === "COD") {
      throw new AppError(400, "COD orders don't require online payment");
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.grandTotal * 100), // Amount in paise
      currency: "INR",
      receipt: order.orderNumber,
      notes: {
        orderId: order.id,
        userId: req.user!.id,
      },
    });

    // Update order with Razorpay order ID
    await prisma.order.update({
      where: { id: orderId },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: env.razorpayKeyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        orderNumber: order.orderNumber,
        // Prefill data for Razorpay checkout
        prefill: {
          name: req.user!.name || "",
          email: req.user!.email || "",
          contact: req.user!.phone || "",
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

const verifyPaymentSchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

/**
 * POST /api/payments/verify
 * Verify Razorpay payment signature
 */
paymentsRouter.post("/payments/verify", async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      verifyPaymentSchema.parse(req.body);

    // Get order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user!.id,
        razorpayOrderId,
      },
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    // Verify signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", env.razorpayKeySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      // Payment verification failed
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "FAILED",
          status: "CANCELLED",
        },
      });

      throw new AppError(400, "Payment verification failed");
    }

    // Payment successful - update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        paymentStatus: "PAID",
        status: "CONFIRMED",
      },
    });

    // Send payment success notification
    await NotificationService.notifyPaymentSuccess(
      req.user!.id,
      order.orderNumber,
      order.grandTotal
    );

    // Send order confirmed notification
    await NotificationService.notifyOrderStatusChange(
      req.user!.id,
      order.orderNumber,
      "CONFIRMED"
    );

    res.json({
      success: true,
      data: {
        message: "Payment verified successfully",
        orderNumber: order.orderNumber,
        status: "CONFIRMED",
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/:orderId/status
 * Get payment status for an order
 */
paymentsRouter.get("/payments/:orderId/status", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        userId: req.user!.id,
      },
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        paymentMethod: true,
        grandTotal: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
      },
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        amount: order.grandTotal,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/webhook
 * Razorpay webhook handler (for async payment updates)
 * Note: This should be called without authentication
 */
export async function handleRazorpayWebhook(req: any, res: any) {
  try {
    const webhookSecret = env.razorpayKeySecret;
    const signature = req.headers["x-razorpay-signature"];

    // Verify webhook signature
    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "payment.captured") {
      const paymentId = payload.payment.entity.id;
      const orderId = payload.payment.entity.notes?.orderId;

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            razorpayPaymentId: paymentId,
            paymentStatus: "PAID",
            status: "CONFIRMED",
          },
        });
      }
    }

    if (event === "payment.failed") {
      const orderId = payload.payment.entity.notes?.orderId;

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "FAILED",
          },
        });
      }
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
