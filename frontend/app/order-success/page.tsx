"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, ClipboardList, Truck } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/Button";
import { useOrderStore, type Order, type OrderStatus } from "@/store/orderStore";
import { MANDYA_CENTER } from "@/components/ui/LeafletMap";

const LeafletMap = dynamic(() => import("@/components/ui/LeafletMap"), { ssr: false });

const STATUS_STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: "confirmed", label: "Order Confirmed", desc: "We've received your order" },
  { key: "preparing", label: "Preparing", desc: "Your items are being packed" },
  { key: "picked_up", label: "Out for Delivery", desc: "Rider is on the way" },
  { key: "delivered", label: "Delivered", desc: "Enjoy your order!" },
];

const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 37) % 90}%`,
  duration: `${2 + (i % 4) * 0.4}s`,
  delay: `${(i % 7) * 0.3}s`,
  color: ["#6941c6", "#00b761", "#facc15", "#3b82f6", "#f43f5e"][i % 5],
  size: 6 + (i % 3) * 3,
  rotate: i % 2 === 0 ? "360deg" : "-360deg",
}));

function OrderTracker({ order }: { order: Order }) {
  const advanceStatus = useOrderStore((s) => s.advanceStatus);
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);

  // Auto-advance through statuses for demo
  useEffect(() => {
    if (order.status === "delivered") return;
    const delays: Record<OrderStatus, number> = {
      confirmed: 4000,
      preparing: 7000,
      picked_up: 10000,
      delivered: 0,
    };
    const t = setTimeout(() => advanceStatus(order.id), delays[order.status]);
    return () => clearTimeout(t);
  }, [order.status, order.id, advanceStatus]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-4 w-full text-left">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-wider">Live Tracking</p>
        {order.status !== "delivered" && (
          <span className="text-[10px] font-black text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full animate-pulse">
            Live
          </span>
        )}
      </div>

      <div className="space-y-0">
        {STATUS_STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          const active = idx === currentIdx;
          const isLast = idx === STATUS_STEPS.length - 1;
          return (
            <div key={step.key} className="flex gap-3">
              {/* Dot + line */}
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{
                    backgroundColor: done ? (active ? "var(--color-brand-accent)" : "var(--color-brand-primary)") : "#e5e7eb",
                    scale: active ? 1.2 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                >
                  {done && !active && <Check size={9} strokeWidth={3} className="text-white" />}
                  {active && <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 h-2 rounded-full bg-white" />}
                </motion.div>
                {!isLast && (
                  <motion.div
                    animate={{ backgroundColor: idx < currentIdx ? "var(--color-brand-primary)" : "#e5e7eb" }}
                    className="w-0.5 flex-1 my-1 min-h-[20px]"
                  />
                )}
              </div>
              {/* Text */}
              <div className="pb-3 min-w-0">
                <p className={`text-xs font-black leading-tight ${done ? "text-brand-text" : "text-brand-text-muted"}`}>
                  {step.label}
                </p>
                <p className={`text-[10px] mt-0.5 ${active ? "text-brand-accent font-bold" : "text-brand-text-muted"}`}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {order.status !== "delivered" && (
        <div className="mt-2 pt-3 border-t border-gray-50 flex items-center gap-2">
          <Truck size={14} className="text-brand-primary" strokeWidth={2.5} />
          <p className="text-[11px] font-black text-brand-text">
            Arriving in ~<span className="text-brand-accent">{order.estimatedMins} mins</span>
          </p>
        </div>
      )}

      {/* Delivery map */}
      <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
        <LeafletMap
          center={MANDYA_CENTER}
          zoom={14}
          markers={[
            { lat: MANDYA_CENTER[0], lng: MANDYA_CENTER[1], label: "Store", color: "purple" },
            { lat: 12.5218, lng: 76.8951, label: "Your location", color: "green" },
          ]}
          className="h-36"
        />
      </div>
    </div>
  );
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orders = useOrderStore((s) => s.orders);
  const order = orders.find((o) => o.id === orderId) ?? orders[0];

  if (!order) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] px-6 py-8 text-center">
          <p className="text-sm font-black text-brand-text mb-4">Order not found</p>
          <Link href="/"><Button fullWidth size="lg">Go Home</Button></Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="relative flex flex-col items-center px-4 py-6 pb-32 overflow-hidden">
        {/* Confetti — pure CSS fall animation, no Framer Motion transform issues */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <style>{`
            @keyframes confetti-fall {
              0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              80%  { opacity: 1; }
              100% { transform: translateY(100vh) rotate(var(--r)); opacity: 0; }
            }
          `}</style>
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: p.left,
                top: 0,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: p.id % 3 === 0 ? "50%" : "2px",
                animationName: "confetti-fall",
                animationDuration: p.duration,
                animationDelay: p.delay,
                animationTimingFunction: "linear",
                animationIterationCount: "infinite",
                animationFillMode: "both",
                ["--r" as string]: p.rotate,
              }}
            />
          ))}
        </div>

        {/* Check */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
          className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-accent/30 mb-4 z-10"
        >
          <Check size={32} strokeWidth={4} />
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="z-10 text-center mb-4 w-full">
          <h1 className="text-xl font-black text-brand-text mb-0.5">Order Placed!</h1>
          <p className="text-[11px] text-brand-text-muted font-medium">
            Order ID: <span className="text-brand-text font-black">#{order.orderId}</span>
          </p>
        </motion.div>

        {/* Items summary */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          className="z-10 w-full bg-white rounded-2xl border border-gray-100 shadow-soft p-3 mb-3">
          <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-wider mb-2">
            {order.items.length} item{order.items.length !== 1 ? "s" : ""} · Rs.{order.total}
          </p>
          <div className="space-y-1">
            {order.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-xs text-brand-text truncate flex-1">{item.name}</span>
                <span className="text-xs font-bold text-brand-text-muted ml-2 flex-shrink-0">×{item.quantity}</span>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-[10px] text-brand-text-muted">+{order.items.length - 3} more items</p>
            )}
          </div>
        </motion.div>

        {/* Live tracker */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
          className="z-10 w-full mb-4">
          <OrderTracker order={order} />
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
          className="z-10 w-full flex flex-col gap-3">
          <Link href="/orders">
            <button className="w-full h-11 rounded-xl border border-brand-primary text-brand-primary text-xs font-black flex items-center justify-center gap-2">
              <ClipboardList size={16} strokeWidth={2.5} />
              View My Orders
            </button>
          </Link>
          <Link href="/">
            <Button fullWidth size="lg" className="shadow-medium group">
              Continue Shopping
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-4 z-10">
          Thank you for choosing Savega
        </p>
      </div>
    </PageWrapper>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" /></div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
