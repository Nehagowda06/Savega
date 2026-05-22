import { Router } from "express";
import { prisma } from "../../config/database.js";
import { authenticate, requireAdmin } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import { z } from "zod";
import { NotificationService } from "../../services/notification.service.js";

export const adminRouter = Router();

// All admin routes require authentication + admin role
adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

// ============================================
// DASHBOARD STATS
// ============================================

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
adminRouter.get("/admin/stats", async (_req, res, next) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
      todayOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { grandTotal: true },
        where: { paymentStatus: "PAID" },
      }),
      prisma.order.count({
        where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING"] } },
      }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.grandTotal || 0,
        pendingOrders,
        todayOrders,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PRODUCT MANAGEMENT
// ============================================

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  weight: z.string().min(1),
  price: z.number().positive(),
  originalPrice: z.number().positive().optional(),
  imageColor: z.string().default("from-gray-100 to-gray-50"),
  imageUrl: z.string().url().optional(),
  tag: z.string().optional(),
  brand: z.string().optional(),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  details: z.array(z.string()).default([]),
  nutrition: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
  inStock: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).default(100),
});

/**
 * POST /api/admin/products
 * Create new product
 */
adminRouter.post("/admin/products", async (req, res, next) => {
  try {
    const data = createProductSchema.parse(req.body);

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new AppError(404, "Category not found");
    }

    const product = await prisma.product.create({
      data,
      include: {
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/products/:id
 * Update product
 */
adminRouter.patch("/admin/products/:id", async (req, res, next) => {
  try {
    const data = createProductSchema.partial().parse(req.body);

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: {
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
      },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete product
 */
adminRouter.delete("/admin/products/:id", async (req, res, next) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/products/:id/stock
 * Update product stock
 */
adminRouter.patch("/admin/products/:id/stock", async (req, res, next) => {
  try {
    const { stockQuantity, inStock } = z.object({
      stockQuantity: z.number().int().min(0).optional(),
      inStock: z.boolean().optional(),
    }).parse(req.body);

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(stockQuantity !== undefined && { stockQuantity }),
        ...(inStock !== undefined && { inStock }),
      },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ORDER MANAGEMENT
// ============================================

/**
 * GET /api/admin/orders
 * List all orders with filters
 */
adminRouter.get("/admin/orders", async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = z.object({
      status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional(),
      limit: z.coerce.number().min(1).max(100).optional(),
      offset: z.coerce.number().min(0).optional(),
    }).parse(req.query);

    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true, email: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 * Update order status
 */
adminRouter.patch("/admin/orders/:id/status", async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
    }).parse(req.body);

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === "DELIVERED" && { deliveredAt: new Date() }),
      },
      include: {
        user: { select: { id: true } },
      },
    });

    // Send notification to user
    await NotificationService.notifyOrderStatusChange(
      order.user.id,
      order.orderNumber,
      status
    );

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /api/admin/users
 * List all users
 */
adminRouter.get("/admin/users", async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = z.object({
      limit: z.coerce.number().min(1).max(100).optional(),
      offset: z.coerce.number().min(0).optional(),
    }).parse(req.query);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update user role
 */
adminRouter.patch("/admin/users/:id/role", async (req, res, next) => {
  try {
    const { role } = z.object({
      role: z.enum(["CUSTOMER", "ADMIN"]),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CATEGORY MANAGEMENT
// ============================================

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().min(1),
  image: z.string().url(),
  color: z.string(),
  ring: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

/**
 * POST /api/admin/categories
 * Create category
 */
adminRouter.post("/admin/categories", async (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);

    const category = await prisma.category.create({ data });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/categories/:id
 * Update category
 */
adminRouter.patch("/admin/categories/:id", async (req, res, next) => {
  try {
    const data = createCategorySchema.partial().parse(req.body);

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/categories/:id/subcategories
 * Add subcategory
 */
adminRouter.post("/admin/categories/:id/subcategories", async (req, res, next) => {
  try {
    const { name, image, sortOrder } = z.object({
      name: z.string().min(1).max(100),
      image: z.string().url(),
      sortOrder: z.number().int().default(0),
    }).parse(req.body);

    const subcategory = await prisma.subcategory.create({
      data: {
        name,
        image,
        sortOrder,
        categoryId: req.params.id,
      },
    });

    res.status(201).json({ success: true, data: subcategory });
  } catch (error) {
    next(error);
  }
});

// ============================================
// RESTAURANT MANAGEMENT
// ============================================

const createRestaurantSchema = z.object({
  name: z.string().min(1).max(200),
  cuisine: z.string().min(1),
  rating: z.number().min(0).max(5).default(4.0),
  eta: z.string(),
  distance: z.string(),
  image: z.string(),
  offer: z.string().optional(),
  popular: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

/**
 * POST /api/admin/restaurants
 * Create restaurant
 */
adminRouter.post("/admin/restaurants", async (req, res, next) => {
  try {
    const data = createRestaurantSchema.parse(req.body);

    const restaurant = await prisma.restaurant.create({ data });

    res.status(201).json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/restaurants/:id
 * Update restaurant
 */
adminRouter.patch("/admin/restaurants/:id", async (req, res, next) => {
  try {
    const data = createRestaurantSchema.partial().parse(req.body);

    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/restaurants/:id/menu
 * Add menu item
 */
adminRouter.post("/admin/restaurants/:id/menu", async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      imageUrl: z.string().url().optional(),
      isVeg: z.boolean().default(true),
      category: z.string().optional(),
      inStock: z.boolean().default(true),
    }).parse(req.body);

    const menuItem = await prisma.menuItem.create({
      data: {
        ...data,
        restaurantId: req.params.id,
      },
    });

    res.status(201).json({ success: true, data: menuItem });
  } catch (error) {
    next(error);
  }
});
