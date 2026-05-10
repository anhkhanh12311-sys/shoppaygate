 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface SepayTransaction {
   id: string;
   bank_brand_name: string;
   account_number: string;
   transaction_date: string;
   amount_out: number;
   amount_in: number;
   accumulated: number;
   transaction_content: string;
   reference_number: string;
   code: string | null;
   sub_account: string | null;
   bank_account_id: string;
 }
 
 interface SepayResponse {
   status: number;
   messages: {
     success: boolean;
   };
   transactions: SepayTransaction[];
 }
 
 Deno.serve(async (req) => {
   // Handle CORS preflight requests
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   console.log("Check pending transactions started");
 
   try {
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
     );
 
     // Parse request body for merchant_id (optional, if not provided check all)
     let merchantId: string | null = null;
     let paymentLinkId: string | null = null;
     
     try {
       const body = await req.json();
       merchantId = body.merchant_id || null;
       paymentLinkId = body.payment_link_id || null;
     } catch {
       // No body provided, check all merchants
     }
 
      // Get merchants with SePay API key configured (from merchant_secrets)
      let merchantsQuery = supabase
        .from("merchant_secrets")
        .select("merchant_id, sepay_api_key, merchants!inner(id, bank_account_number)")
        .not("sepay_api_key", "is", null);

      if (merchantId) {
        merchantsQuery = merchantsQuery.eq("merchant_id", merchantId);
      }

      const { data: secretRows, error: merchantsError } = await merchantsQuery;
      const merchants = (secretRows || []).map((r: any) => ({
        id: r.merchant_id,
        sepay_api_key: r.sepay_api_key,
        bank_account_number: r.merchants?.bank_account_number,
      }));
 
    if (merchantsError) {
      console.error("Error fetching merchants:", merchantsError);
      return new Response(
        JSON.stringify({ success: false, error: "Unable to fetch merchants" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
 
     if (!merchants || merchants.length === 0) {
       console.log("No merchants with SePay API key found");
       return new Response(
         JSON.stringify({ success: true, message: "No merchants to check" }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const results: any[] = [];
 
     for (const merchant of merchants) {
       console.log(`Checking merchant: ${merchant.id}`);
 
       // Get pending payment links for this merchant
       let linksQuery = supabase
         .from("payment_links")
         .select("id, code, amount")
         .eq("merchant_id", merchant.id)
         .eq("status", "active");
 
       if (paymentLinkId) {
         linksQuery = linksQuery.eq("id", paymentLinkId);
       }
 
       const { data: pendingLinks, error: linksError } = await linksQuery;
 
       if (linksError || !pendingLinks || pendingLinks.length === 0) {
         console.log(`No pending links for merchant ${merchant.id}`);
         continue;
       }
 
       console.log(`Found ${pendingLinks.length} pending links`);
 
       // Fetch recent transactions from SePay API
       try {
         const sepayResponse = await fetch(
           "https://my.sepay.vn/userapi/transactions/list",
           {
             method: "GET",
             headers: {
               Authorization: `Bearer ${merchant.sepay_api_key}`,
               "Content-Type": "application/json",
             },
           }
         );
 
         if (!sepayResponse.ok) {
           console.error(
             `SePay API error for merchant ${merchant.id}:`,
             sepayResponse.status
           );
           results.push({
             merchant_id: merchant.id,
             success: false,
             error: `SePay API error: ${sepayResponse.status}`,
           });
           continue;
         }
 
         const sepayData: SepayResponse = await sepayResponse.json();
 
         if (!sepayData.messages?.success || !sepayData.transactions) {
           console.log(`No transactions from SePay for merchant ${merchant.id}`);
           continue;
         }
 
         console.log(
           `Received ${sepayData.transactions.length} transactions from SePay`
         );
 
         // Match transactions with pending payment links
         for (const link of pendingLinks) {
           const matchingTransaction = sepayData.transactions.find((tx) => {
             const contentUpper = tx.transaction_content.toUpperCase();
             const codeMatch = contentUpper.includes(link.code.toUpperCase());
             const amountMatch = tx.amount_in >= link.amount * 0.99; // 1% tolerance
             return codeMatch && amountMatch;
           });
 
           if (matchingTransaction) {
             console.log(
               `Found matching transaction for payment link ${link.id}`
             );
 
             // Check if transaction already exists
             const { data: existingTx } = await supabase
               .from("transactions")
               .select("id")
               .eq("bank_reference", matchingTransaction.reference_number)
               .single();
 
             if (!existingTx) {
               // Insert new transaction
               const { data: newTxId, error: insertError } = await supabase.rpc(
                 "insert_transaction_from_webhook",
                 {
                   p_payment_link_id: link.id,
                   p_merchant_id: merchant.id,
                   p_amount: matchingTransaction.amount_in,
                   p_transfer_content: matchingTransaction.transaction_content,
                   p_bank_reference: matchingTransaction.reference_number,
                   p_status: "completed",
                   p_paid_at: new Date(
                     matchingTransaction.transaction_date
                   ).toISOString(),
                 }
               );
 
               if (insertError) {
                 console.error("Error inserting transaction:", insertError);
               } else {
                 console.log("Transaction created:", newTxId);
 
                 // Update payment link status
                 await supabase
                   .from("payment_links")
                   .update({ status: "completed" })
                   .eq("id", link.id);
 
                 results.push({
                   merchant_id: merchant.id,
                   payment_link_id: link.id,
                   transaction_id: newTxId,
                   success: true,
                 });
               }
             } else {
               console.log(`Transaction already exists: ${existingTx.id}`);
             }
           }
         }
       } catch (apiError) {
       const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
       console.error(`Error calling SePay API for merchant ${merchant.id}:`, errorMessage);
       results.push({
         merchant_id: merchant.id,
         success: false,
         error: errorMessage,
       });
       }
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         results,
         checked_merchants: merchants.length,
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error checking pending transactions:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
 });