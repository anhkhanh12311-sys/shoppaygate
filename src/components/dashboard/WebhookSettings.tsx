 import { useState } from "react";
 import { useForm } from "react-hook-form";
 import { z } from "zod";
 import { zodResolver } from "@hookform/resolvers/zod";
 import { motion } from "framer-motion";
 import {
   Webhook,
   Loader2,
   Check,
   Copy,
   Eye,
   EyeOff,
   RefreshCw,
   ExternalLink,
   AlertTriangle,
   CheckCircle2,
   XCircle,
 } from "lucide-react";
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Switch } from "@/components/ui/switch";
 import {
   Form,
   FormControl,
   FormDescription,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
 } from "@/components/ui/form";
 import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
 } from "@/components/ui/accordion";
 import { useToast } from "@/hooks/use-toast";
 import { useMerchant } from "@/hooks/useMerchant";
 
 const schema = z.object({
   webhook_url: z.string().url("URL không hợp lệ").or(z.literal("")),
   webhook_enabled: z.boolean(),
 });
 
 type FormData = z.infer<typeof schema>;
 
 const generateSecret = () => {
   const array = new Uint8Array(32);
   crypto.getRandomValues(array);
   return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
     ""
   );
 };
 
 const WebhookSettings = () => {
   const { merchant, updateMerchant, loading: merchantLoading } = useMerchant();
   const [isLoading, setIsLoading] = useState(false);
   const [showSecret, setShowSecret] = useState(false);
   const [copied, setCopied] = useState<string | null>(null);
   const [testResult, setTestResult] = useState<"success" | "error" | null>(
     null
   );
   const [isTesting, setIsTesting] = useState(false);
   const { toast } = useToast();
 
   const form = useForm<FormData>({
     resolver: zodResolver(schema),
     values: {
       webhook_url: (merchant as any)?.webhook_url || "",
       webhook_enabled: (merchant as any)?.webhook_enabled || false,
     },
   });
 
   const onSubmit = async (data: FormData) => {
     setIsLoading(true);
     const { error } = await updateMerchant({
       webhook_url: data.webhook_url || null,
       webhook_enabled: data.webhook_enabled,
     } as any);
     setIsLoading(false);
 
     if (error) {
       toast({
         variant: "destructive",
         title: "Lỗi",
         description: "Không thể cập nhật cài đặt webhook",
       });
     } else {
       toast({
         title: "Thành công",
         description: "Đã lưu cài đặt webhook",
       });
     }
   };
 
   const regenerateSecret = async () => {
     const newSecret = generateSecret();
     setIsLoading(true);
     const { error } = await updateMerchant({
       webhook_secret: newSecret,
     });
     setIsLoading(false);
 
     if (error) {
       toast({
         variant: "destructive",
         title: "Lỗi",
         description: "Không thể tạo secret mới",
       });
     } else {
       toast({
         title: "Thành công",
         description: "Đã tạo webhook secret mới",
       });
     }
   };
 
   const copyToClipboard = async (text: string, label: string) => {
     await navigator.clipboard.writeText(text);
     setCopied(label);
     setTimeout(() => setCopied(null), 2000);
     toast({
       title: "Đã sao chép",
       description: `${label} đã được sao chép`,
     });
   };
 
   const testWebhook = async () => {
     const webhookUrl = form.getValues("webhook_url");
     if (!webhookUrl) {
       toast({
         variant: "destructive",
         title: "Lỗi",
         description: "Vui lòng nhập URL webhook",
       });
       return;
     }
 
     setIsTesting(true);
     setTestResult(null);
 
     try {
       const response = await fetch(webhookUrl, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "X-PayGate-Signature": "test",
           "X-PayGate-Event": "test",
         },
         body: JSON.stringify({
           event: "test",
           data: {
             message: "This is a test webhook from PayGate",
             timestamp: new Date().toISOString(),
           },
         }),
       });
 
       if (response.ok) {
         setTestResult("success");
         toast({
           title: "Webhook hoạt động!",
           description: "Đã gửi thành công đến webhook URL của bạn",
         });
       } else {
         setTestResult("error");
         toast({
           variant: "destructive",
           title: "Webhook không phản hồi",
           description: `HTTP ${response.status}: ${response.statusText}`,
         });
       }
     } catch (err) {
       setTestResult("error");
       toast({
         variant: "destructive",
         title: "Không thể kết nối",
         description: "Kiểm tra lại URL webhook của bạn",
       });
     }
 
     setIsTesting(false);
   };
 
   if (merchantLoading) {
     return (
       <Card>
         <CardContent className="py-10 text-center">
           <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
         </CardContent>
       </Card>
     );
   }
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-3xl font-bold mb-2">Webhook</h1>
         <p className="text-muted-foreground">
           Nhận thông báo realtime khi có giao dịch thành công
         </p>
       </div>
 
       <div className="grid gap-6 lg:grid-cols-2">
         {/* Configuration */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Webhook className="h-5 w-5" />
               Cấu hình Webhook
             </CardTitle>
             <CardDescription>
               Thiết lập URL để nhận thông báo khi có thanh toán
             </CardDescription>
           </CardHeader>
           <CardContent>
             <Form {...form}>
               <form
                 onSubmit={form.handleSubmit(onSubmit)}
                 className="space-y-6"
               >
                 <FormField
                   control={form.control}
                   name="webhook_enabled"
                   render={({ field }) => (
                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                       <div className="space-y-0.5">
                         <FormLabel className="text-base">
                           Bật Webhook
                         </FormLabel>
                         <FormDescription>
                           Gửi thông báo đến URL của bạn khi có giao dịch
                         </FormDescription>
                       </div>
                       <FormControl>
                         <Switch
                           checked={field.value}
                           onCheckedChange={field.onChange}
                         />
                       </FormControl>
                     </FormItem>
                   )}
                 />
 
                 <FormField
                   control={form.control}
                   name="webhook_url"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Webhook URL</FormLabel>
                       <FormControl>
                         <div className="flex gap-2">
                           <Input
                             placeholder="https://your-server.com/webhook"
                             {...field}
                           />
                           <Button
                             type="button"
                             variant="outline"
                             size="icon"
                             onClick={testWebhook}
                             disabled={isTesting || !field.value}
                           >
                             {isTesting ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                             ) : testResult === "success" ? (
                               <CheckCircle2 className="h-4 w-4 text-success" />
                             ) : testResult === "error" ? (
                               <XCircle className="h-4 w-4 text-destructive" />
                             ) : (
                               <ExternalLink className="h-4 w-4" />
                             )}
                           </Button>
                         </div>
                       </FormControl>
                       <FormDescription>
                         URL phải hỗ trợ POST requests và trả về HTTP 200
                       </FormDescription>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
 
                 {/* Webhook Secret */}
                 <div className="space-y-3">
                   <label className="text-sm font-medium">Webhook Secret</label>
                   <div className="flex gap-2">
                     <div className="flex-1 relative">
                       <Input
                         type={showSecret ? "text" : "password"}
                         value={merchant?.webhook_secret || "Chưa tạo"}
                         readOnly
                         className="pr-10 font-mono text-sm"
                       />
                       <Button
                         type="button"
                         variant="ghost"
                         size="icon"
                         className="absolute right-0 top-0 h-full"
                         onClick={() => setShowSecret(!showSecret)}
                       >
                         {showSecret ? (
                           <EyeOff className="h-4 w-4" />
                         ) : (
                           <Eye className="h-4 w-4" />
                         )}
                       </Button>
                     </div>
                     <Button
                       type="button"
                       variant="outline"
                       size="icon"
                       onClick={() =>
                         merchant?.webhook_secret &&
                         copyToClipboard(merchant.webhook_secret, "Secret")
                       }
                       disabled={!merchant?.webhook_secret}
                     >
                       {copied === "Secret" ? (
                         <Check className="h-4 w-4 text-success" />
                       ) : (
                         <Copy className="h-4 w-4" />
                       )}
                     </Button>
                     <Button
                       type="button"
                       variant="outline"
                       size="icon"
                       onClick={regenerateSecret}
                       disabled={isLoading}
                     >
                       <RefreshCw className="h-4 w-4" />
                     </Button>
                   </div>
                   <p className="text-xs text-muted-foreground">
                     Sử dụng secret để xác thực requests từ PayGate
                   </p>
                 </div>
 
                 <Button
                   type="submit"
                   className="w-full gradient-primary text-primary-foreground"
                   disabled={isLoading}
                 >
                   {isLoading ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Đang lưu...
                     </>
                   ) : (
                     <>
                       <Check className="mr-2 h-4 w-4" />
                       Lưu cài đặt
                     </>
                   )}
                 </Button>
               </form>
             </Form>
           </CardContent>
         </Card>
 
         {/* Documentation */}
         <Card>
           <CardHeader>
             <CardTitle>Hướng dẫn tích hợp</CardTitle>
             <CardDescription>
               Cách xử lý webhook từ PayGate trên server của bạn
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <Accordion type="single" collapsible className="w-full">
               <AccordionItem value="payload">
                 <AccordionTrigger>Payload mẫu</AccordionTrigger>
                 <AccordionContent>
                   <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                     {JSON.stringify(
                       {
                         event: "payment.completed",
                         data: {
                           transaction_id: "uuid",
                           payment_link_id: "uuid",
                           payment_code: "PG-ABC123",
                           amount: 100000,
                           transfer_content: "PG-ABC123",
                           bank_reference: "FT12345678",
                           paid_at: "2024-01-01T10:00:00Z",
                           merchant_id: "uuid",
                         },
                         timestamp: "2024-01-01T10:00:00Z",
                       },
                       null,
                       2
                     )}
                   </pre>
                 </AccordionContent>
               </AccordionItem>
 
               <AccordionItem value="headers">
                 <AccordionTrigger>HTTP Headers</AccordionTrigger>
                 <AccordionContent>
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between p-2 bg-muted rounded">
                       <code>Content-Type</code>
                       <code className="text-muted-foreground">
                         application/json
                       </code>
                     </div>
                     <div className="flex justify-between p-2 bg-muted rounded">
                       <code>X-PayGate-Event</code>
                       <code className="text-muted-foreground">
                         payment.completed
                       </code>
                     </div>
                     <div className="flex justify-between p-2 bg-muted rounded">
                       <code>X-PayGate-Signature</code>
                       <code className="text-muted-foreground">
                         HMAC-SHA256 hash
                       </code>
                     </div>
                   </div>
                 </AccordionContent>
               </AccordionItem>
 
               <AccordionItem value="verify">
                 <AccordionTrigger>Xác thực Signature</AccordionTrigger>
                 <AccordionContent>
                   <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                     {`// Node.js example
 const crypto = require('crypto');
 
 function verifySignature(payload, signature, secret) {
   const hash = crypto
     .createHmac('sha256', secret)
     .update(JSON.stringify(payload))
     .digest('hex');
   return hash === signature;
 }
 
 // In your webhook handler:
 app.post('/webhook', (req, res) => {
   const signature = req.headers['x-paygate-signature'];
   if (!verifySignature(req.body, signature, WEBHOOK_SECRET)) {
     return res.status(401).send('Invalid signature');
   }
   
   // Process the webhook...
   console.log('Payment received:', req.body);
   res.status(200).send('OK');
 });`}
                   </pre>
                 </AccordionContent>
               </AccordionItem>
 
               <AccordionItem value="events">
                 <AccordionTrigger>Loại sự kiện</AccordionTrigger>
                 <AccordionContent>
                   <div className="space-y-2">
                     <div className="flex items-center gap-2 p-2 bg-success/10 rounded">
                       <CheckCircle2 className="h-4 w-4 text-success" />
                       <code className="text-sm">payment.completed</code>
                       <span className="text-xs text-muted-foreground ml-auto">
                         Thanh toán thành công
                       </span>
                     </div>
                     <div className="flex items-center gap-2 p-2 bg-muted rounded">
                       <AlertTriangle className="h-4 w-4 text-warning" />
                       <code className="text-sm">test</code>
                       <span className="text-xs text-muted-foreground ml-auto">
                         Test webhook
                       </span>
                     </div>
                   </div>
                 </AccordionContent>
               </AccordionItem>
             </Accordion>
 
             <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
               <div className="flex items-start gap-2">
                 <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                 <div className="text-sm">
                   <p className="font-medium">Lưu ý bảo mật</p>
                   <p className="text-muted-foreground">
                     Luôn xác thực signature trước khi xử lý webhook. Không bao
                     giờ chia sẻ webhook secret với bất kỳ ai.
                   </p>
                 </div>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };
 
 export default WebhookSettings;