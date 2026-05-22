import { Router } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import { z } from "zod";
import { NotificationService } from "../../services/notification.service.js";

export const trackingRouter = Router();

// All tracking routes require authentication
trackingRouter.use(authenticate);

/**
 * GET /api/tracking/:orderId
 * Get real-time order tracking information
 */
trackingRouter.get("/tracking/:orderId", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        userId: req.user!.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                imageColor: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    // Calculate tracking timeline
    const timeline = getOrderTimeline(order.status, order.createdAt, order.deliveredAt);

    // Get estimated delivery time
    const estimatedDelivery = getEstimatedDelivery(order.status, order.createdAt);

    // Mock delivery partner info (in production, this would come from delivery API)
    const deliveryPartner = order.status === "OUT_FOR_DELIVERY" || order.status === "DELIVERED"
      ? {
          name: "Rajesh Kumar",
          phone: "+91 98765 43210",
          vehicle: "Bike",
          rating: 4.8,
        }
      : null;

    // Mock live location (in production, this would come from delivery partner's GPS)
    const liveLocation = order.status === "OUT_FOR_DELIVERY"
      ? {
          lat: 12.9716 + Math.random() * 0.01, // Mock location near Bangalore
          lng: 77.5946 + Math.random() * 0.01,
          lastUpdated: new Date(),
        }
      : null;

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        timeline,
        estimatedDelivery,
        deliveryAddress: order.deliveryAddress,
        deliveryPartner,
        liveLocation,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          imageColor: item.product.imageColor,
          imageUrl: item.product.imageUrl,
        })),
        totals: {
          itemTotal: order.itemTotal,
          deliveryFee: order.deliveryFee,
          discount: order.discount,
          grandTotal: order.grandTotal,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tracking/:orderId/live-location
 * Get live delivery partner location (for real-time updates)
 */
trackingRouter.get("/tracking/:orderId/live-location", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        userId: req.user!.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    if (order.status !== "OUT_FOR_DELIVERY") {
      return res.json({
        success: true,
        data: {
          available: false,
          message: "Live tracking not available for this order status",
        },
      });
    }

    // Mock live location (in production, integrate with delivery partner API)
    const liveLocation = {
      lat: 12.9716 + Math.random() * 0.01,
      lng: 77.5946 + Math.random() * 0.01,
      heading: Math.random() * 360, // Direction in degrees
      speed: 20 + Math.random() * 20, // km/h
      lastUpdated: new Date(),
      estimatedArrival: "8 mins",
    };

    res.json({
      success: true,
      data: {
        available: true,
        location: liveLocation,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tracking/:orderId/contact-delivery
 * Request callback from delivery partner
 */
trackingRouter.post("/tracking/:orderId/contact-delivery", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        userId: req.user!.id,
      },
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    if (order.status !== "OUT_FOR_DELIVERY") {
      throw new AppError(400, "Delivery partner contact only available when order is out for delivery");
    }

    // In production, this would trigger a call/SMS to delivery partner
    // For now, just send a notification
    await NotificationService.notifySystem(
      req.user!.id,
      "Contact Request Sent",
      "Delivery partner will call you shortly."
    );

    res.json({
      success: true,
      data: {
        message: "Delivery partner will contact you shortly",
        phone: "+91 98765 43210", // Mock phone
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

interface TimelineStep {
  status: string;
  label: string;
  description: string;
  timestamp?: Date;
  completed: boolean;
  active: boolean;
}

function getOrderTimeline(
  currentStatus: string,
  createdAt: Date,
  deliveredAt: Date | null
): TimelineStep[] {
  const statusOrder = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
  const currentIndex = statusOrder.indexOf(currentStatus);

  const timeline: TimelineStep[] = [
    {
      status: "CONFIRMED",
      label: "Order Confirmed",
      description: "Your order has been confirmed",
      timestamp: createdAt,
      completed: currentIndex >= 1,
      active: currentIndex === 1,
    },
    {
      status: "PREPARING",
      label: "Preparing",
      description: "Your order is being prepared",
      timestamp: currentIndex >= 2 ? new Date(createdAt.getTime() + 5 * 60000) : undefined,
      completed: currentIndex >= 2,
      active: currentIndex === 2,
    },
    {
      status: "OUT_FOR_DELIVERY",
      label: "Out for Delivery",
      description: "Your order is on the way",
      timestamp: currentIndex >= 3 ? new Date(createdAt.getTime() + 15 * 60000) : undefined,
      completed: currentIndex >= 3,
      active: currentIndex === 3,
    },
    {
      status: "DELIVERED",
      label: "Delivered",
      description: "Your order has been delivered",
      timestamp: deliveredAt || undefined,
      completed: currentIndex >= 4,
      active: currentIndex === 4,
    },
  ];

  return timeline;
}

function getEstimatedDelivery(status: string, createdAt: Date): string {
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - createdAt.getTime()) / 60000); // minutes

  switch (status) {
    case "PENDING":
      return "Waiting for confirmation";
    case "CONFIRMED":
      return "20-25 mins";
    case "PREPARING":
      return `${Math.max(15 - elapsed, 5)}-${Math.max(20 - elapsed, 10)} mins`;
    case "OUT_FOR_DELIVERY":
      return `${Math.max(10 - elapsed, 2)}-${Math.max(15 - elapsed, 5)} mins`;
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Unknown";
  }
}
