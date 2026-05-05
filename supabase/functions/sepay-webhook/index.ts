import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

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
  code: string | null;
  content: string;
  transferType: string;
  description?: string;
  transferAmount: number;
  referenceCode: string;
  accumulated: number;
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("SePay webhook received");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Identify merchant via API key or query param ---
    const url = new URL(req.url);
    const queryMerchantId = url.searchParams.get("merchant_id");
    const authHeader = req.headers.get("authorization") || "";
    // SePay sends "Apikey <key>" header
    const apiKeyMatch = authHeader.match(/^Apikey\s+(.+)$/i);
    const webhookApiKey = apiKeyMatch?.[1] || null;

    let merchant: any = null;

    if (webhookApiKey) {
      // Lookup merchant via merchant_secrets (secret table)
      const { data: secretRow } = await supabase
        .from("merchant_secrets")
        .select("merchant_id")
        .eq("webhook_api_key", webhookApiKey)
        .maybeSingle();
      if (!secretRow) {
        console.error("Invalid webhook API key");
        return jsonResponse({ success: false, error: "Unauthorized" }, 401);
      }
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", secretRow.merchant_id)
        .maybeSingle();
      if (error || !data) {
        return jsonResponse({ success: false, error: "Merchant not found" }, 404);
      }
      merchant = data;
      console.log("Merchant identified via API key:", merchant.id);
    } else if (queryMerchantId) {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", queryMerchantId)
        .maybeSingle();
      if (error || !data) {
        console.error("Merchant not found:", queryMerchantId);
        return jsonResponse({ success: false, error: "Merchant not found" }, 404);
      }
      merchant = data;
      console.log("Merchant identified via query param:", merchant.id);
    }

    // Parse webhook payload
    const payload: SepayWebhookPayload = await req.json();
    console.log("Webhook payload:", JSON.stringify(payload));

    // Validate required fields with proper bounds
    if (
      !payload.content ||
      typeof payload.transferAmount !== "number" ||
      payload.transferAmount <= 0 ||
      payload.transferAmount > 10_000_000_000 ||
      !payload.accountNumber ||
      payload.content.length > 1000
    ) {
      return jsonResponse({ success: false, error: "Invalid payload" }, 400);
    }

    // Only process incoming transfers
    if (payload.transferType !== "in") {
      console.log("Skipping outgoing transfer");
      return jsonResponse({ success: true, message: "Skipped outgoing transfer" });
    }

    // Extract payment code from transfer content
    const contentUpper = payload.content.toUpperCase();
    const codeMatch = contentUpper.match(/PG-[A-Z0-9]{6,}/);

    if (!codeMatch && !merchant) {
      console.log("No payment code and no merchant identified");
      return jsonResponse({ success: true, message: "No payment code found" });
    }

    let paymentLink: any = null;

    if (codeMatch) {
      const paymentCode = codeMatch[0];
      console.log("Found payment code:", paymentCode);

      // Find the payment link by code
      const query = supabase
        .from("payment_links")
        .select("*, merchants!inner(*)")
        .eq("code", paymentCode);

      // If merchant is known, scope to that merchant
      if (merchant) {
        query.eq("merchant_id", merchant.id);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        console.error("Payment link not found:", paymentCode, error);
        return jsonResponse({ success: false, error: "Payment link not found" }, 404);
      }
      paymentLink = data;
      if (!merchant) merchant = data.merchants;
    } else if (merchant) {
      // No payment code but merchant identified — try matching by amount & recent pending links
      console.log("No payment code, trying amount match for merchant:", merchant.id);
      const { data } = await supabase
        .from("payment_links")
        .select("*, merchants!inner(*)")
        .eq("merchant_id", merchant.id)
        .eq("status", "active")
        .eq("amount", payload.transferAmount)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        return jsonResponse({ success: true, message: "No matching payment link" });
      }
      paymentLink = data;
    }

    if (!paymentLink || !merchant) {
      return jsonResponse({ success: true, message: "Could not match transaction" });
    }

    console.log("Found payment link:", paymentLink.id);

    // Check for duplicate transaction (by SePay transaction ID or referenceCode)
    const dupCheck = payload.referenceCode || String(payload.id);
    const { data: existingTransaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("bank_reference", dupCheck)
      .maybeSingle();

    if (existingTransaction) {
      console.log("Transaction already exists:", existingTransaction.id);
      return jsonResponse({ success: true, message: "Transaction already processed" });
    }

    // Insert the transaction
    const { data: transactionId, error: insertError } = await supabase.rpc(
      "insert_transaction_from_webhook",
      {
        p_payment_link_id: paymentLink.id,
        p_merchant_id: merchant.id,
        p_amount: payload.transferAmount,
        p_transfer_content: payload.content,
        p_bank_reference: dupCheck,
        p_status: "completed",
        p_paid_at: new Date(payload.transactionDate).toISOString(),
      }
    );

    if (insertError) {
      console.error("Error inserting transaction:", insertError);
      return jsonResponse({ success: false, error: insertError.message }, 500);
    }

    console.log("Transaction created:", transactionId);

    // Update payment link status if not static
    if (!paymentLink.is_static) {
      await supabase
        .from("payment_links")
        .update({ status: "completed" })
        .eq("id", paymentLink.id);
    }

    // Send merchant webhook notification if enabled
    if (merchant.webhook_enabled && merchant.webhook_url) {
      console.log("Sending merchant webhook to:", merchant.webhook_url);

      const webhookPayload = {
        event: "payment.completed",
        data: {
          transaction_id: transactionId,
          payment_link_id: paymentLink.id,
          payment_code: paymentLink.code,
          amount: payload.transferAmount,
          transfer_content: payload.content,
          bank_reference: dupCheck,
          paid_at: new Date(payload.transactionDate).toISOString(),
          merchant_id: merchant.id,
        },
        timestamp: new Date().toISOString(),
      };

      let signature = "";
      const { data: secretRow } = await supabase
        .from("merchant_secrets")
        .select("webhook_secret")
        .eq("merchant_id", merchant.id)
        .maybeSingle();
      if (secretRow?.webhook_secret) {
        signature = createHmac("sha256", secretRow.webhook_secret)
          .update(JSON.stringify(webhookPayload))
          .digest("hex");
      }

      try {
        await fetch(merchant.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PayGate-Event": "payment.completed",
            "X-PayGate-Signature": signature,
          },
          body: JSON.stringify(webhookPayload),
        });
      } catch (webhookError) {
        console.error("Merchant webhook error:", webhookError);
      }
    }

    // SePay expects {"success": true} with 200
    return jsonResponse({
      success: true,
      transaction_id: transactionId,
      message: "Payment confirmed successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Webhook processing error:", errorMessage);
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
});
