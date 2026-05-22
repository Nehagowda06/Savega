# Savega - Q-Commerce App

A fast, responsive Quick Commerce application for groceries and food delivery.

**Live Demo:** [https://savega.vercel.app](https://savega.vercel.app)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand |
| Backend | Node.js, Express.js 5, TypeScript, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (Email, Phone OTP, Google) |
| Payments | Razorpay (UPI, Cards, Wallets, COD) |
| Hosting | Vercel (Frontend), Render (Backend) |

## Project Structure

```
q-commerce/
├── frontend/          # Next.js frontend app
│   ├── app/          # App router pages
│   ├── components/   # UI components
│   ├── store/        # Zustand state management
│   └── data/         # Mock data (will be replaced by API)
│
├── backend/          # Express.js backend API
│   ├── prisma/       # Database schema
│   └── src/
│       ├── modules/  # API routes (catalog, cart, orders, etc.)
│       ├── middleware/
│       └── config/
```

## Features

### Customer Features
- 🛒 Browse groceries by category/subcategory
- 🍕 Order food from restaurants
- 🔍 Search products, categories, restaurants
- 📝 Create shopping lists
- 🛍️ Cart management
- 📦 Order tracking
- 👤 User profile & addresses
- 💳 Multiple payment options (UPI, Cards, COD)

### Coming Soon
- 📱 Push notifications
- 🎁 Coupons & offers
- ⭐ Reviews & ratings

## Quick Start

### Frontend (Already Deployed)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Backend

```bash
cd backend
npm install

# Setup environment (need Supabase & Razorpay keys)
cp .env.example .env

# Setup database
npm run db:generate
npm run db:push
npm run db:seed

# Run server
npm run dev
```

API runs at [http://localhost:4000](http://localhost:4000)

## API Endpoints

### Public
- `GET /api/categories` - Grocery categories
- `GET /api/products` - Products with filters
- `GET /api/restaurants` - Restaurants
- `GET /api/search?q=` - Global search

### Protected (Auth Required)
- `GET/POST /api/cart` - Cart operations
- `GET/POST /api/orders` - Order management
- `GET/PATCH /api/profile` - User profile
- `GET/POST /api/addresses` - Delivery addresses
- `GET/POST /api/lists` - Shopping lists
- `POST /api/payments/create` - Payment initiation

## Environment Variables

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
RAZORPAY_KEY_ID=xxx
RAZORPAY_KEY_SECRET=xxx
FRONTEND_URL=http://localhost:3000
```

## Deployment

### Frontend → Vercel
Already deployed at [q-commerce-delta.vercel.app](https://q-commerce-delta.vercel.app)

### Backend → Render
1. Connect GitHub repo to Render
2. Create Web Service pointing to `/backend`
3. Set environment variables
4. Deploy

## Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT
