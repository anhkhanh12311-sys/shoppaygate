import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-prompt-dismissed";
const NOTIF_KEY = "notif-prompt-dismissed";

export const InstallPrompt = () => {
  const { toast } = useToast();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) return;
    const dismissed = localStorage.getItem(NOTIF_KEY);
    if (dismissed) return;
    if (Notification.permission === "default") {
      const t = setTimeout(() => setShowNotif(true), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      toast({ title: "✨ Đã cài đặt", description: "PayGate đã được thêm vào màn hình chính" });
    }
    setDeferred(null);
    setShowInstall(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const handleEnableNotif = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        toast({ title: "🔔 Đã bật thông báo", description: "Bạn sẽ nhận thông báo khi có giao dịch mới" });
        new Notification("PayGate", { body: "Thông báo đã được kích hoạt!", icon: "/app-icon.png" });
      } else {
        toast({ variant: "destructive", title: "Thông báo bị từ chối" });
      }
    } catch {}
    setShowNotif(false);
    localStorage.setItem(NOTIF_KEY, "1");
  };

  const dismissInstall = () => {
    setShowInstall(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };
  const dismissNotif = () => {
    setShowNotif(false);
    localStorage.setItem(NOTIF_KEY, "1");
  };

  return (
    <AnimatePresence>
      {showInstall && (
        <motion.div
          key="install"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:right-6 md:bottom-6 md:w-96"
        >
          <div className="glass rounded-2xl border shadow-2xl p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Cài PayGate lên điện thoại</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mở nhanh từ màn hình chính, dùng như app native.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="gradient-primary text-primary-foreground h-8" onClick={handleInstall}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Cài đặt
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={dismissInstall}>
                  Để sau
                </Button>
              </div>
            </div>
            <button onClick={dismissInstall} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {showNotif && !showInstall && (
        <motion.div
          key="notif"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:right-6 md:bottom-6 md:w-96"
        >
          <div className="glass rounded-2xl border shadow-2xl p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Bật thông báo giao dịch</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nhận thông báo tức thì khi có khách thanh toán mới.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="gradient-primary text-primary-foreground h-8" onClick={handleEnableNotif}>
                  <Bell className="h-3.5 w-3.5 mr-1" /> Cho phép
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={dismissNotif}>
                  <BellOff className="h-3.5 w-3.5 mr-1" /> Bỏ qua
                </Button>
              </div>
            </div>
            <button onClick={dismissNotif} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
