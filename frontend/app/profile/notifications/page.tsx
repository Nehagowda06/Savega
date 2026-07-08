"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";

const settings = [
  { id: "orders", label: "Order Updates", desc: "Delivery status and confirmations" },
  { id: "offers", label: "Offers & Deals", desc: "Exclusive discounts and promotions" },
  { id: "reminders", label: "Cart Reminders", desc: "Remind me about items left in cart" },
  { id: "news", label: "News & Updates", desc: "New features and announcements" },
];

export default function NotificationsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    orders: true,
    offers: true,
    reminders: false,
    news: false,
  });

  return (
    <PageWrapper>
      <div className="p-3 pb-28">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/profile">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-brand-text">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </div>
          </Link>
          <h1 className="text-base font-black text-brand-text">Notifications</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
          {settings.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center justify-between p-3 ${i !== settings.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-xs font-black text-brand-text">{s.label}</p>
                <p className="text-[10px] text-brand-text-muted mt-0.5">{s.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled[s.id]}
                onClick={() => setEnabled((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                style={{ width: 44, height: 24, borderRadius: 12, flexShrink: 0, position: "relative", border: "none", cursor: "pointer", transition: "background 0.2s", background: enabled[s.id] ? "#6941c6" : "#d1d5db" }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: enabled[s.id] ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    transition: "left 0.2s",
                    display: "block",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

