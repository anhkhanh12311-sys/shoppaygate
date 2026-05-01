import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";
import { useToast } from "./use-toast";
import { speakAmount, primeVoices } from "@/lib/paymentVoice";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

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
            toast({
              title: "💰 Giao dịch mới thành công!",
              description: `Đã nhận ${formatCurrency(tx.amount)}`,
            });
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
            toast({
              title: "💰 Giao dịch thành công!",
              description: `Đã nhận ${formatCurrency(tx.amount)}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchant, toast]);
};
