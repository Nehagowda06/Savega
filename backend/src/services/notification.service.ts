import { createNotification } from "../modules/notifications/notifications.routes.js";
import { OrderStatus } from "@prisma/client";

/**
 * Notification Service
 * Handles sending notifications for various events
 */

export class NotificationService {
  /**
   * Send notification when order is created
   */
  static async notifyOrderCreated(userId: string, orderNumber: string, grandTotal: number) {
    await createNotification(
      userId,
      "Order Placed Successfully! 🎉",
      `Your order ${orderNumber} for ₹${grandTotal} has been placed successfully.`,
      "order",
      { orderNumber, grandTotal }
    );
  }

  /**
   * Send notification when order status changes
   */
  static async notifyOrderStatusChange(
    userId: string,
    orderNumber: string,
    status: OrderStatus
  ) {
    const messages: Record<OrderStatus, { title: string; message: string }> = {
      PENDING: {
        title: "Order Pending",
        message: `Your order ${orderNumber} is pending payment confirmation.`,
      },
      CONFIRMED: {
        title: "Order Confirmed! ✅",
        message: `Your order ${orderNumber} has been confirmed and is being prepared.`,
      },
      PREPARING: {
        title: "Preparing Your Order 👨‍🍳",
        message: `Your order ${orderNumber} is being prepared. It will be ready soon!`,
      },
      OUT_FOR_DELIVERY: {
        title: "Out for Delivery! 🚚",
        message: `Your order ${orderNumber} is on its way! Track your delivery in real-time.`,
      },
      DELIVERED: {
        title: "Order Delivered! 🎊",
        message: `Your order ${orderNumber} has been delivered. Enjoy your items!`,
      },
      CANCELLED: {
        title: "Order Cancelled",
        message: `Your order ${orderNumber} has been cancelled. Refund will be processed if applicable.`,
      },
    };

    const notification = messages[status];
    await createNotification(
      userId,
      notification.title,
      notification.message,
      "order",
      { orderNumber, status }
    );
  }

  /**
   * Send notification when payment is successful
   */
  static async notifyPaymentSuccess(
    userId: string,
    orderNumber: string,
    amount: number
  ) {
    await createNotification(
      userId,
      "Payment Successful! 💳",
      `Payment of ₹${amount} for order ${orderNumber} was successful.`,
      "order",
      { orderNumber, amount }
    );
  }

  /**
   * Send notification when payment fails
   */
  static async notifyPaymentFailed(userId: string, orderNumber: string) {
    await createNotification(
      userId,
      "Payment Failed ❌",
      `Payment for order ${orderNumber} failed. Please try again.`,
      "order",
      { orderNumber }
    );
  }

  /**
   * Send promotional notification
   */
  static async notifyPromotion(
    userId: string,
    title: string,
    message: string,
    promoData?: any
  ) {
    await createNotification(userId, title, message, "promo", promoData);
  }

  /**
   * Send system notification
   */
  static async notifySystem(userId: string, title: string, message: string) {
    await createNotification(userId, title, message, "system");
  }

  /**
   * Send delivery update notification
   */
  static async notifyDeliveryUpdate(
    userId: string,
    orderNumber: string,
    message: string,
    location?: { lat: number; lng: number }
  ) {
    await createNotification(
      userId,
      `Delivery Update - ${orderNumber}`,
      message,
      "delivery",
      { orderNumber, location }
    );
  }

  /**
   * Send low stock alert to user (if they have items in cart)
   */
  static async notifyLowStock(
    userId: string,
    productName: string,
    stockLeft: number
  ) {
    await createNotification(
      userId,
      "Low Stock Alert! ⚠️",
      `Only ${stockLeft} units of "${productName}" left in stock. Order now!`,
      "system",
      { productName, stockLeft }
    );
  }

  /**
   * Send back in stock notification
   */
  static async notifyBackInStock(userId: string, productName: string) {
    await createNotification(
      userId,
      "Back in Stock! 🎉",
      `"${productName}" is now back in stock. Order before it runs out!`,
      "system",
      { productName }
    );
  }

  /**
   * Send order reminder (if cart has items for too long)
   */
  static async notifyCartReminder(userId: string, itemCount: number) {
    await createNotification(
      userId,
      "Complete Your Order! 🛒",
      `You have ${itemCount} items waiting in your cart. Complete your order now!`,
      "system",
      { itemCount }
    );
  }
}
