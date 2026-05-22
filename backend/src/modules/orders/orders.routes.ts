import { Router } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import { z } from "zod";
import { randomBytes } from "crypto";
import { NotificationService } from "../../services/notification.service.js";

export const ordersRouter = Router();

// All order routes require authentication
ordersRouter.use(authenticate);

/**
 * Generate order number like "SV-82941"
 */
function generateOrderNumber(): string {
  const num = randomBytes(3).readUIntBE(0, 3) % 100000;
  return `SV-${num.toString().padStart(5, "0")}`;
}

/**
 * GET /api/orders
 * Get user's order history
 */
ordersRouter.get("/orders", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                imageColor: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      itemTotal: order.itemTotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      grandTotal: order.grandTotal,
      estimatedDelivery: order.estimatedDelivery,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageColor: item.product.imageColor,
        imageUrl: item.product.imageUrl,
      })),
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:id
 * Get single order details
 */
ordersRouter.get("/orders/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                imageColor: true,
                imageUrl: true,
                weight: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    const data = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      itemTotal: order.itemTotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      grandTotal: order.grandTotal,
      deliveryAddress: order.deliveryAddress,
      estimatedDelivery: order.estimatedDelivery,
      deliveredAt: order.deliveredAt,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      razorpayOrderId: order.razorpayOrderId,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        weight: item.product.weight,
        imageColor: item.product.imageColor,
        imageUrl: item.product.imageUrl,
      })),
    };

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

const createOrderSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(["UPI", "CARD", "NETBANKING", "WALLET", "COD"]),
});

/**
 * POST /api/orders
 * Create order from cart
 */
ordersRouter.post("/orders", async (req, res, next) => {
  try {
    const { addressId, paymentMethod } = createOrderSchema.parse(req.body);

    // Get cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user!.id },
      include: {
        product: true,
      },
    });

    if (cartItems.length === 0) {
      throw new AppError(400, "Cart is empty");
    }

    // Get delivery address
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: req.user!.id,
      },
    });

    if (!address) {
      throw new AppError(404, "Address not found");
    }

    // Calculate totals
    const itemTotal = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const deliveryFee = itemTotal < 199 ? 25 : 0;
    const grandTotal = itemTotal + deliveryFee;

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: req.user!.id,
          status: paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
          itemTotal,
          deliveryFee,
          grandTotal,
          deliveryAddress: {
            label: address.label,
            fullName: address.fullName,
            phone: address.phone,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            landmark: address.landmark,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },
          estimatedDelivery: "12 mins",
          paymentMethod,
          paymentStatus: paymentMethod === "COD" ? "PENDING" : "PENDING",
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              name: item.product.name,
              price: item.product.price,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Update product stock
      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { userId: req.user!.id },
      });

      return newOrder;
    });

    // Send notification
    await NotificationService.notifyOrderCreated(
      req.user!.id,
      order.orderNumber,
      order.grandTotal
    );

    res.status(201).json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        grandTotal: order.grandTotal,
        estimatedDelivery: order.estimatedDelivery,
        paymentMethod: order.paymentMethod,
        // If not COD, frontend needs to initiate payment
        requiresPayment: paymentMethod !== "COD",
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders/:id/cancel
 * Cancel an order (only if PENDING or CONFIRMED)
 */
ordersRouter.post("/orders/:id/cancel", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: { items: true },
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      throw new AppError(400, "Order cannot be cancelled at this stage");
    }

    // Cancel order and restore stock
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      // Restore stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
          },
        });
      }
    });

    // Send cancellation notification
    await NotificationService.notifyOrderStatusChange(
      req.user!.id,
      order.orderNumber,
      "CANCELLED"
    );

    res.json({
      success: true,
      data: { message: "Order cancelled successfully" },
    });
  } catch (error) {
    next(error);
  }
});
