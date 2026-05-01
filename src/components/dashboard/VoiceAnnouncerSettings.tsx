import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Play, Bell, Sparkles, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  loadVoiceSettings,
  saveVoiceSettings,
  speakAmount,
  playTingSound,
  primeVoices,
  numberToVietnamese,
  DEFAULT_VOICE_SETTINGS,
  type VoiceSettings,
} from "@/lib/paymentVoice";

const PRESET_AMOUNTS = [10000, 50000, 100000, 1500000];

const VoiceAnnouncerSettings = () => {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [previewAmount, setPreviewAmount] = useState<number>(100000);
  const [hasVietnameseVoice, setHasVietnameseVoice] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSettings(loadVoiceSettings());
    primeVoices();
    const checkVoices = () => {
      const voices = speechSynthesis.getVoices();
      setHasVietnameseVoice(voices.some((v) => /^vi/i.test(v.lang)));
    };
    checkVoices();
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.onvoiceschanged = checkVoices;
    }
  }, []);

  const update = (patch: Partial<VoiceSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveVoiceSettings(next);
  };

  const handlePreview = () => {
    speakAmount(previewAmount, settings);
    toast({
      title: "🔊 Đang phát thử",
      description: `"${settings.template.replace("{amount}", numberToVietnamese(previewAmount))}"`,
    });
  };

  const handleReset = () => {
    setSettings(DEFAULT_VOICE_SETTINGS);
    saveVoiceSettings(DEFAULT_VOICE_SETTINGS);
    toast({ title: "Đã đặt lại", description: "Đã khôi phục cài đặt mặc định" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <Volume2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Loa thông báo thanh toán</h1>
            <p className="text-muted-foreground text-sm">
              Tự động đọc số tiền bằng giọng tiếng Việt khi có giao dịch mới
            </p>
          </div>
        </div>
      </motion.div>

      {!hasVietnameseVoice && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400">
              ⚠️ Trình duyệt chưa có giọng tiếng Việt
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Hệ thống sẽ dùng giọng mặc định. Để có giọng tiếng Việt tự nhiên, hãy dùng Chrome/Edge mới nhất hoặc cài thêm giọng tiếng Việt trong cài đặt hệ điều hành.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Trạng thái loa
            </span>
            <Badge variant={settings.enabled ? "default" : "secondary"} className={settings.enabled ? "gradient-primary text-primary-foreground" : ""}>
              {settings.enabled ? "Đang bật" : "Đã tắt"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Khi bật, mọi giao dịch thành công sẽ được đọc to ngay lập tức trên thiết bị này.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              {settings.enabled ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="font-medium text-sm">Bật loa thông báo</p>
                <p className="text-xs text-muted-foreground">Phát giọng đọc khi có tiền vào</p>
              </div>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Âm chuông trước khi đọc</p>
                <p className="text-xs text-muted-foreground">Hai nốt nhạc nhẹ "ting"</p>
              </div>
            </div>
            <Switch checked={settings.playSound} onCheckedChange={(v) => update({ playSound: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tùy chỉnh giọng đọc</CardTitle>
          <CardDescription>Điều chỉnh âm lượng, tốc độ và độ cao của giọng nói</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Âm lượng</Label>
              <span className="text-xs font-mono text-muted-foreground">{Math.round(settings.volume * 100)}%</span>
            </div>
            <Slider value={[settings.volume]} min={0} max={1} step={0.05}
              onValueChange={(v) => update({ volume: v[0] })} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Tốc độ đọc</Label>
              <span className="text-xs font-mono text-muted-foreground">{settings.rate.toFixed(2)}x</span>
            </div>
            <Slider value={[settings.rate]} min={0.5} max={2} step={0.05}
              onValueChange={(v) => update({ rate: v[0] })} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Cao độ</Label>
              <span className="text-xs font-mono text-muted-foreground">{settings.pitch.toFixed(2)}</span>
            </div>
            <Slider value={[settings.pitch]} min={0} max={2} step={0.05}
              onValueChange={(v) => update({ pitch: v[0] })} />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Mẫu câu thông báo</Label>
            <Input
              value={settings.template}
              onChange={(e) => update({ template: e.target.value })}
              placeholder="Đã nhận {amount} đồng"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Dùng <code className="px-1 py-0.5 rounded bg-muted text-primary">{"{amount}"}</code> để chèn số tiền (đọc bằng chữ).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="gradient-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" /> Nghe thử
          </CardTitle>
          <CardDescription>Chọn số tiền mẫu để kiểm tra giọng đọc</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_AMOUNTS.map((a) => (
              <Button
                key={a}
                variant={previewAmount === a ? "default" : "outline"}
                size="sm"
                className={previewAmount === a ? "gradient-primary text-primary-foreground" : ""}
                onClick={() => setPreviewAmount(a)}
              >
                {new Intl.NumberFormat("vi-VN").format(a)}đ
              </Button>
            ))}
          </div>
          <Input
            type="number"
            value={previewAmount}
            min={1000}
            step={1000}
            onChange={(e) => setPreviewAmount(Number(e.target.value) || 0)}
            placeholder="Số tiền tùy chỉnh"
          />
          <div className="rounded-lg p-3 bg-background border text-sm">
            <span className="text-muted-foreground">Sẽ đọc: </span>
            <span className="font-medium">"{settings.template.replace("{amount}", numberToVietnamese(previewAmount))}"</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handlePreview} className="flex-1 gradient-primary text-primary-foreground">
              <Play className="mr-2 h-4 w-4" /> Phát thử
            </Button>
            <Button variant="outline" onClick={() => playTingSound(settings.volume)}>
              <Bell className="mr-2 h-4 w-4" /> Chỉ âm chuông
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" /> Mặc định
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceAnnouncerSettings;
