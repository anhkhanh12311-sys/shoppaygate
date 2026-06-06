import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";
import { useToast } from "./use-toast";
import { speakAmount, primeVoices } from "@/lib/paymentVoice";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const showPush = (title: string, body: string) => {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification(title, {
        body,
        icon: "/app-icon.png",
        badge: "/app-icon.png",
        tag: "paygate-tx",
      });
      setTimeout(() => n.close(), 8000);
    }
  } catch {}
};

/**
 * Hook that subscribes to realtime transaction updates
 * and shows toast notifications when a new completed transaction arrives.
 */
export const useRealtimeNotifications = () => {
  const { merchant } = useMerchant();
  const { toast } = useToast();
  const notifiedRef = useRef(new Set<string>());

  useEffect(() => {
    primeVoices();
    if (!merchant) return;

    const channel = supabase
      .channel(`notifications-${merchant.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `merchant_id=eq.${merchant.id}`,
        },
        (payload) => {
          const tx = payload.new as any;
          if (tx.status === "completed" && !notifiedRef.current.has(tx.id)) {
            notifiedRef.current.add(tx.id);
            speakAmount(Number(tx.amount));
            const msg = `Đã nhận ${formatCurrency(tx.amount)}`;
            toast({ title: "💰 Giao dịch mới thành công!", description: msg });
            showPush("💰 Giao dịch mới!", msg);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `merchant_id=eq.${merchant.id}`,
        },
        (payload) => {
          const tx = payload.new as any;
          if (tx.status === "completed" && !notifiedRef.current.has(tx.id)) {
            notifiedRef.current.add(tx.id);
            speakAmount(Number(tx.amount));
            const msg = `Đã nhận ${formatCurrency(tx.amount)}`;
            toast({ title: "💰 Giao dịch thành công!", description: msg });
            showPush("💰 Giao dịch thành công!", msg);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchant, toast]);
};
