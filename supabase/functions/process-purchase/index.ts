import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get the authenticated user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { listing_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get listing
    const { data: listing, error: listingError } = await adminClient
      .from("id_listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Can't buy own listing
    if (listing.seller_id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot buy your own listing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already purchased
    const { data: existingPurchase } = await adminClient
      .from("purchases")
      .select("id, status")
      .eq("listing_id", listing_id)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (existingPurchase) {
      return new Response(JSON.stringify({ error: "Already purchased", purchase: existingPurchase }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get buyer profile
    const { data: buyerProfile, error: buyerError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (buyerError || !buyerProfile) {
      return new Response(JSON.stringify({ error: "Buyer profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const price = Number(listing.price);

    // Check buyer balance
    if (buyerProfile.balance < price) {
      return new Response(JSON.stringify({ error: "Insufficient balance", required: price, current: buyerProfile.balance }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get seller profile
    let sellerProfile = null;
    if (listing.seller_id) {
      const { data } = await adminClient
        .from("profiles")
        .select("*")
        .eq("user_id", listing.seller_id)
        .single();
      sellerProfile = data;
    }

    // Deduct from buyer
    const newBuyerBalance = buyerProfile.balance - price;
    const { error: deductError } = await adminClient
      .from("profiles")
      .update({ balance: newBuyerBalance })
      .eq("id", buyerProfile.id);

    if (deductError) {
      return new Response(JSON.stringify({ error: "Failed to deduct balance" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credit seller
    if (sellerProfile) {
      const newSellerBalance = Number(sellerProfile.balance) + price;
      await adminClient
        .from("profiles")
        .update({ balance: newSellerBalance })
        .eq("id", sellerProfile.id);
    }

    // Create approved purchase
    const { data: purchase, error: purchaseError } = await adminClient
      .from("purchases")
      .insert({
        listing_id,
        buyer_id: user.id,
        status: "approved",
      })
      .select()
      .single();

    if (purchaseError) {
      // Rollback buyer balance
      await adminClient
        .from("profiles")
        .update({ balance: buyerProfile.balance })
        .eq("id", buyerProfile.id);
      
      if (sellerProfile) {
        await adminClient
          .from("profiles")
          .update({ balance: sellerProfile.balance })
          .eq("id", sellerProfile.id);
      }

      return new Response(JSON.stringify({ error: "Failed to create purchase" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        purchase,
        new_balance: newBuyerBalance 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
