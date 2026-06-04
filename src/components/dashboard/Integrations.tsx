import { useState } from "react";
import { motion } from "framer-motion";
import { Plug, Webhook, Book } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WebhookSettings from "./WebhookSettings";
import ApiDocs from "./ApiDocs";

const Integrations = () => {
  const [tab, setTab] = useState("webhook");
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <Plug className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Webhook & API</h1>
            <p className="text-muted-foreground text-sm">
              Tất cả công cụ kết nối hệ thống của bạn với PayGate trong một nơi
            </p>
          </div>
        </div>
      </motion.div>

      <Card className="border-primary/10">
        <CardContent className="p-3 md:p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="webhook" className="gap-2 text-sm">
                <Webhook className="h-4 w-4" />
                Webhook SePay
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-2 text-sm">
                <Book className="h-4 w-4" />
                Tài liệu API v2
              </TabsTrigger>
            </TabsList>
            <TabsContent value="webhook" className="mt-6">
              <WebhookSettings />
            </TabsContent>
            <TabsContent value="api" className="mt-6">
              <ApiDocs />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
