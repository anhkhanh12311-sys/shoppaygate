 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface SepayWebhookPayload {
   id: number;
   gateway: string;
   transactionDate: string;
   accountNumber: string;
   subAccount?: string;
   code: string;
   content: string;
   transferType: string;
   description?: string;
   transferAmount: number;
   referenceCode: string;
   accumulated: number;
 }
 
 Deno.serve(async (req) => {
   // Handle CORS preflight requests
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   console.log("SePay webhook received");
 
   try {
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
     );
 
     // Parse webhook payload
     const payload: SepayWebhookPayload = await req.json();
     console.log("Webhook payload:", JSON.stringify(payload));
 
     // Validate required fields
     if (!payload.content || !payload.transferAmount || !payload.accountNumber) {
       console.error("Missing required fields in webhook payload");
       return new Response(
         JSON.stringify({ success: false, error: "Missing required fields" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Only process incoming transfers (not outgoing)
     if (payload.transferType !== "in") {
       console.log("Skipping outgoing transfer");
       return new Response(
         JSON.stringify({ success: true, message: "Skipped outgoing transfer" }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Extract payment code from transfer content
     // Format expected: "PG-XXXXXX" or similar pattern
     const contentUpper = payload.content.toUpperCase();
     const codeMatch = contentUpper.match(/PG-[A-Z0-9]{6,}/);
     
     if (!codeMatch) {
       console.log("No valid payment code found in content:", payload.content);
       return new Response(
         JSON.stringify({ success: true, message: "No payment code found" }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const paymentCode = codeMatch[0];
     console.log("Found payment code:", paymentCode);
 
     // Find the payment link by code
     const { data: paymentLink, error: linkError } = await supabase
       .from("payment_links")
       .select("*, merchants!inner(*)")
       .eq("code", paymentCode)
       .single();
 
     if (linkError || !paymentLink) {
       console.error("Payment link not found:", paymentCode, linkError);
       return new Response(
         JSON.stringify({ success: false, error: "Payment link not found" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log("Found payment link:", paymentLink.id);
 
     // Verify the amount matches (with some tolerance for bank fees)
     const expectedAmount = paymentLink.amount;
     const receivedAmount = payload.transferAmount;
     const amountDifference = Math.abs(expectedAmount - receivedAmount);
     const tolerancePercent = 0.01; // 1% tolerance
 
     if (amountDifference > expectedAmount * tolerancePercent && amountDifference > 1000) {
       console.warn(
         `Amount mismatch: expected ${expectedAmount}, received ${receivedAmount}`
       );
       // Still process but log the mismatch
     }
 
     // Verify bank account matches
     if (
       paymentLink.merchants.bank_account_number &&
       !payload.accountNumber.includes(paymentLink.merchants.bank_account_number)
     ) {
       console.warn(
         `Bank account mismatch: expected ${paymentLink.merchants.bank_account_number}, received ${payload.accountNumber}`
       );
     }
 
     // Check for duplicate transaction
     const { data: existingTransaction } = await supabase
       .from("transactions")
       .select("id")
       .eq("bank_reference", payload.referenceCode)
       .single();
 
     if (existingTransaction) {
       console.log("Transaction already exists:", existingTransaction.id);
       return new Response(
         JSON.stringify({ success: true, message: "Transaction already processed" }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Insert the transaction using the security definer function
     const { data: transactionId, error: insertError } = await supabase.rpc(
       "insert_transaction_from_webhook",
       {
         p_payment_link_id: paymentLink.id,
         p_merchant_id: paymentLink.merchant_id,
         p_amount: receivedAmount,
         p_transfer_content: payload.content,
         p_bank_reference: payload.referenceCode,
         p_status: "completed",
         p_paid_at: new Date(payload.transactionDate).toISOString(),
       }
     );
 
     if (insertError) {
       console.error("Error inserting transaction:", insertError);
       return new Response(
         JSON.stringify({ success: false, error: insertError.message }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log("Transaction created:", transactionId);
 
     // Update payment link status if not static
     if (!paymentLink.is_static) {
       await supabase
         .from("payment_links")
         .update({ status: "completed" })
         .eq("id", paymentLink.id);
       console.log("Payment link marked as completed");
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         transaction_id: transactionId,
         message: "Payment confirmed successfully",
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     const errorMessage = error instanceof Error ? error.message : String(error);
     console.error("Webhook processing error:", errorMessage);
     return new Response(
       JSON.stringify({ success: false, error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });