import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

// Route imports
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { foodRouter } from "./modules/food/food.routes.js";
import { cartRouter } from "./modules/cart/cart.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { listsRouter } from "./modules/lists/lists.routes.js";
import { paymentsRouter, handleRazorpayWebhook } from "./modules/payments/payments.routes.js";
import { searchRouter } from "./modules/search/search.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { trackingRouter } from "./modules/tracking/tracking.routes.js";

export function createApp() {
  const app = express();

  // ============================================
  // MIDDLEWARE
  // ============================================

  // CORS
  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    })
  );

  // Razorpay webhook needs raw body
  app.post(
    "/api/webhooks/razorpay",
    express.raw({ type: "application/json" }),
    handleRazorpayWebhook
  );

  // JSON body parser
  app.use(express.json());

  // ============================================
  // HEALTH CHECK
  // ============================================

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "savega-backend",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // API ROUTES
  // ============================================

  // Public routes (no auth required)
  app.use("/api", catalogRouter);  // GET /api/categories, /api/products
  app.use("/api", foodRouter);     // GET /api/food/categories, /api/restaurants
  app.use("/api", searchRouter);   // GET /api/search

  // Protected routes (auth required)
  app.use("/api", cartRouter);     // /api/cart
  app.use("/api", ordersRouter);   // /api/orders
  app.use("/api", usersRouter);    // /api/profile, /api/addresses
  app.use("/api", listsRouter);    // /api/lists
  app.use("/api", paymentsRouter); // /api/payments
  app.use("/api", notificationsRouter); // /api/notifications
  app.use("/api", trackingRouter); // /api/tracking
  app.use("/api", adminRouter);    // /api/admin/* (admin only)

  // ============================================
  // ERROR HANDLING
  // ============================================

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
