import { Router } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import { z } from "zod";

export const notificationsRouter = Router();

// All notification routes require authentication
notificationsRouter.use(authenticate);

/**
 * GET /api/notifications
 * Get user's notifications
 */
notificationsRouter.get("/notifications", async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, unreadOnly } = z.object({
      limit: z.coerce.number().min(1).max(100).optional(),
      offset: z.coerce.number().min(0).optional(),
      unreadOnly: z.coerce.boolean().optional(),
    }).parse(req.query);

    const where: any = { userId: req.user!.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user!.id, isRead: false },
      }),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: { total, limit, offset },
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
notificationsRouter.get("/notifications/unread-count", async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
notificationsRouter.patch("/notifications/:id/read", async (req, res, next) => {
  try {
    // Verify ownership
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!notification) {
      throw new AppError(404, "Notification not found");
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
notificationsRouter.post("/notifications/mark-all-read", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      data: { message: "All notifications marked as read" },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
notificationsRouter.delete("/notifications/:id", async (req, res, next) => {
  try {
    // Verify ownership
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!notification) {
      throw new AppError(404, "Notification not found");
    }

    await prisma.notification.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/notifications
 * Clear all notifications
 */
notificationsRouter.delete("/notifications", async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.user!.id },
    });

    res.json({
      success: true,
      data: { message: "All notifications cleared" },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// HELPER FUNCTIONS (used by other modules)
// ============================================

/**
 * Create notification for user
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "order" | "promo" | "system" | "delivery",
  data?: any
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        data: data || {},
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Send notification to multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  title: string,
  message: string,
  type: "order" | "promo" | "system" | "delivery",
  data?: any
) {
  try {
    return await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title,
        message,
        type,
        data: data || {},
      })),
    });
  } catch (error) {
    console.error("Failed to create bulk notifications:", error);
  }
}
