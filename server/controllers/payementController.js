import paypal from "@paypal/checkout-server-sdk";
import { supabase } from "../middleware/supabaseClient.js";
// import { PayPalEnvironment } from "@paypal/checkout-server-sdk/lib/core/paypal_environment.js";
import paypalClient from "../middleware/paypalClient.js";
// import stripe from "../middleware/stripeClient.js";
import "dotenv/config"; // <<< must be first
import stripe from "../middleware/stripeClient.js";
// import { PayPalHttpClient } from "@paypal/checkout-server-sdk/lib/core/paypal_http_client.js";

async function computeCartTotalCents(userId) {
  // 1) find cart id for user
  console.log("Computing cart total for user:", userId);
  const { data: cartRow, error: cartErr } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .single();

  console.log("cartErr:", cartErr);
  console.log("cartRow:", cartRow);

  if (cartErr || !cartRow) throw new Error("No cart found");

  // 2) get cart items
  const { data: cartItems, error: itemsErr } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("cart_id", cartRow.id);

  if (itemsErr) throw itemsErr;
  if (!cartItems || cartItems.length === 0) return 0;

  // 3) fetch product prices from products table
  const productIds = cartItems.map((i) => i.product_id);
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, price, discount")
    .in("id", productIds);

  if (prodErr) throw prodErr;

  const priceMap = {};
  for (const p of products)
    priceMap[p.id] =
      p.discount && p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;

  let totalFloat = 0;
  for (const item of cartItems) {
    const price = priceMap[item.product_id];
    if (typeof price !== "number") throw new Error("Product price missing");
    totalFloat += price * Number(item.quantity || 0);
  }

  // convert to cents and round (shipping + tax)
  const totalCents =
    Math.round(totalFloat * 100) + 15 * 100 + totalFloat * 0.08 * 100; // adding fixed $15 shipping cost
  return totalCents;
}

// Utility to get user from Authorization Bearer token (optional pattern)
async function getUserFromBearer(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const token = auth.split(" ")[1];
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user ?? null;
}

async function handleStripePayementIntent(req, res) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    // Compute amount (server-side)
    let amountCents = await computeCartTotalCents(user.id);

    // Validate amount
    if (amountCents === null || amountCents === undefined) {
      console.error("computeCartTotalCents returned null/undefined for user:", user.id);
      return res.status(500).json({ error: "Failed to compute cart total" });
    }

    // Ensure numeric
    amountCents = Number(amountCents);
    if (!Number.isFinite(amountCents) || Number.isNaN(amountCents)) {
      console.error("computeCartTotalCents returned invalid number:", amountCents);
      return res.status(500).json({ error: "Invalid cart total amount" });
    }

    // Ensure integer (Stripe requires integer in smallest currency unit)
    amountCents = Math.round(amountCents);

    // Minimum sanity check (USD min 50 cents as safe guard)
    if (amountCents < 50) {
      console.error("Amount too small for Stripe:", amountCents);
      return res.status(400).json({ error: "Cart total too small to create payment" });
    }

    console.log("Creating Stripe PaymentIntent for user:", user.id, "amountCents:", amountCents);

    // defensive check: stripe client exists
    if (!stripe || typeof stripe.paymentIntents?.create !== "function") {
      console.error("Stripe client not initialized correctly:", !!stripe);
      return res.status(500).json({ error: "Stripe not configured on server" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    // Log full error for debugging (message + full object)
    console.error("Stripe Payment Intent Error:", error);
    // If Stripe Error object present, try to surface more detail
    const stripeMsg =
      error?.raw?.message || error?.message || (error?.toString && error.toString()) || "Unknown error";

    // Send safe message to client, while logging details on server
    return res.status(500).json({ error: "Failed to create payment intent", details: stripeMsg });
  }
}


async function paypalCreateOrder(req, res) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    console.log(user.id);
    // Compute amount (server-side)
    const amountCents = await computeCartTotalCents(user.id);
    if (!amountCents || amountCents <= 0)
      return res.status(400).json({ error: "Cart empty or invalid amount" });

    const amount = (amountCents / 100).toFixed(2); // e.g. "10.00"

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: "PU-1",
          description: "Order from MyStore",
          amount: {
            currency_code: "USD",
            value: amount, // e.g. "10.00"
            breakdown: {
              item_total: { currency_code: "USD", value: amount },
            },
          },
          items: [
            {
              name: "Cart subtotal",
              unit_amount: { currency_code: "USD", value: amount },
              quantity: "1",
            },
          ],
        },
      ],
    });

    const order = await paypalClient.execute(request);
    res.status(200).json({ orderID: order.result.id });
  } catch (error) {
    console.error("Paypal Create Order Error:", error);
    res.status(500).json({ error: "Failed to create PayPal order" });
  }
}
async function getOrderDetails(orderId) {
  const req = new paypal.orders.OrdersGetRequest(orderId);
  const resp = await paypalClient.execute(req);
  return resp.result;
}
async function capturePaypalOrder(req, res) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { orderID, formData } = req.body;
    console.log("Form Data Received:", formData);
    const orderDetails = await getOrderDetails(orderID);

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    const capture = await paypalClient.execute(request);

    const amountCents = await computeCartTotalCents(user.id);

    // 3) Fetch cart items snapshot
    const { data: cartRow } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const { data: cartItems } = await supabase
      .from("cart_items")
      .select("product_id, quantity, size")
      .eq("cart_id", cartRow.id);

    res
      .status(200)
      .json({ captureID: capture.result.id, capture: capture.result });

    submitOrderToDatabase({
      userId: user.id,
      formData,
      service: "paypal",
      captureID: capture.result.id,
      amountCents,
      cartItems,
    });
  } catch (error) {
    console.error("Paypal Capture Order Error:", error);
    // dump the original text if present (very useful)
    console.error(
      "Raw error text:",
      error._originalError?.text ?? error.message
    );

    console.error(
      "PayPal debug id:",
      error._originalError?.headers?.["paypal-debug-id"] ?? "N/A"
    );
    res.status(500).json({ error: "Failed to capture PayPal order" });
  }
}

/**
 * New: Capture Stripe payment (call this after the client confirms the PaymentIntent)
 * Expects: { paymentIntentId, formData } in req.body
 * User must be authenticated via Bearer token (same as PayPal flow)
 */
async function captureStripePayment(req, res) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { paymentIntentId, formData } = req.body;
    if (!paymentIntentId)
      return res.status(400).json({ error: "Missing paymentIntentId" });

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Check status
    if (
      !paymentIntent ||
      (paymentIntent.status !== "succeeded" &&
        paymentIntent.status !== "requires_capture")
    ) {
      return res.status(400).json({
        error: "Payment not completed",
        status: paymentIntent?.status,
      });
    }

    // amount on Stripe is in cents
    const stripeAmountCents =
      paymentIntent.amount_received ?? paymentIntent.amount;

    // compute server-side amount (your source of truth)
    const amountCents = await computeCartTotalCents(user.id);

    // Optional sanity check: compare computed amount to Stripe amount
    if (Number(stripeAmountCents) !== Number(amountCents)) {
      console.warn("Stripe amount mismatch:", {
        stripeAmountCents,
        computedAmountCents: amountCents,
      });
      // you can choose to reject the order here or proceed after logging.
      // For now, we'll proceed but log a warning.
    }

    // Fetch cart items snapshot
    const { data: cartRow } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const { data: cartItems } = await supabase
      .from("cart_items")
      .select("product_id, quantity, size")
      .eq("cart_id", cartRow.id);

    // Insert order and items (wait for completion)
    await submitOrderToDatabase({
      userId: user.id,
      formData,
      service: "stripe",
      captureID: paymentIntent.id,
      amountCents,
      cartItems,
    });

    return res.status(200).json({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error("Stripe capture flow error:", error);
    return res.status(500).json({ error: "Failed to verify Stripe payment" });
  }
}

async function submitOrderToDatabase({
  userId,
  formData,
  service,
  captureID,
  amountCents,
  cartItems,
}) {
  console.log(
    "Submitting order to database:",
    formData,
    service,
    captureID,
    amountCents,
    cartItems
  );
  try {
    // IMPORTANT: store transaction id (captureID) on order so we can refund later
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert([
        {
          user_id: userId,
          payment_reference: service,
          transaction_id: captureID, // <-- new: store capture / payment intent id
          // payement_reference: service,
          // transaction_id: captureID,
          total_amount: (amountCents / 100).toFixed(2),
          status: "Processing",
          currency: "USD",
          shipping_name: `${formData.firstName} ${formData.lastName}`,
          shipping_address_line1: formData.address,
          shipping_city: formData.city,
          shipping_postal_code: formData.postalCode,
          shipping_country: formData.country,
          shipping_email: formData.email,
        },
      ])
      .select()
      .single();

    if (orderErr) throw orderErr;

    const productIds = cartItems.map((i) => i.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price,salesCount")
      .in("id", productIds);

    const orderItemsPayload = cartItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      console.log("Mapping order item for product:", item.size);
      return {
        order_id: order.id,
        size: item.size || "N/A",
        product_id: item.product_id,
        quantity: item.quantity,
        product_name_snapshot: product?.name || "Unknown",
        price_snapshot: product?.price || 0,
      };
    });
    const updateSalesPromises = cartItems.map(async (item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) {
        console.warn(`No product found for product ID ${item.product_id}`);
        return;
      }
      const newSalesCount = (product.salesCount || 0) + item.quantity;
      const { data: updatedProduct, error: updateSalesErr } = await supabase
        .from("products")
        .update({ salesCount: newSalesCount })
        .eq("id", item.product_id);

      if (updateSalesErr) {
        console.error(
          `Failed to update sales count for product ${item.product_id}:`,
          updateSalesErr
        );
      } else {
        console.log(
          `Updated sales count for product ${item.product_id}:`,
          updatedProduct
        );
      }
    });

    await Promise.all(updateSalesPromises);

    const { data: sizeQuantity, error: sizeQuantityErr } = await supabase
      .from("product_variants")
      .select("size, stock, product_id")
      .in("product_id", productIds);

    if (sizeQuantityErr) throw sizeQuantityErr;

    const updateSizePromises = cartItems.map(async (item) => {
      const variant = sizeQuantity.find(
        (sq) =>
          sq.size?.toLowerCase() === item.size?.toLowerCase() &&
          sq.product_id === item.product_id
      );
      if (!variant) {
        console.warn(
          `No variant found for product ${item.product_id} and size ${item.size}`
        );
        return;
      }
      const newStock = variant.stock - item.quantity;
      const { data: updatedSizes, error: updateSizeErr } = await supabase
        .from("product_variants")
        .update({ stock: newStock >= 0 ? newStock : 0 })
        .eq("product_id", item.product_id)
        .eq("size", item.size.toUpperCase());

      if (updateSizeErr) {
        console.error(
          `Failed to update stock for product ${item.product_id} size ${item.size}:`,
          updateSizeErr
        );
      } else {
        console.log(
          `Updated stock for product ${item.product_id} size ${item.size}:`,
          updatedSizes
        );
      }
    });

    await Promise.all(updateSizePromises);
    // const { data: updatedSizes, error: updateSizeErr } =

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsErr) throw itemsErr;

    // --- NEW: clear user's cart items after order is successfully created ---
    try {
      const { data: userCart } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (userCart && userCart.id) {
        const { error: delErr } = await supabase
          .from("cart_items")
          .delete()
          .eq("cart_id", userCart.id);

        if (delErr) {
          console.error(
            "Failed to clear cart items after order:",
            delErr
          );
        } else {
          console.log("Cleared cart items for cart", userCart.id);
        }
      } else {
        console.warn("No cart found to clear for user", userId);
      }
    } catch (clearErr) {
      console.error("Error while clearing cart items after order:", clearErr);
    }
    // --- end clear cart ---

    console.log("Order and items inserted successfully:", order.id);
  } catch (error) {
    console.error("Submit Order to Database Error:", error);
  }
}

/**
 * Revert sales counts and restore variant stock for an order.
 * This assumes order_items contains product_id, quantity, size.
 */
async function revertSalesAndRestoreStock(orderId) {
  try {
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("product_id, quantity, size")
      .eq("order_id", orderId);

    if (itemsErr) {
      console.error("Failed to fetch order_items for revert:", itemsErr);
      throw itemsErr;
    }
    if (!items || items.length === 0) return;

    const productIds = [...new Set(items.map((i) => i.product_id))];

    // fetch current products to adjust salesCount
    const { data: products } = await supabase
      .from("products")
      .select("id, salesCount")
      .in("id", productIds);

    // Build promises to update salesCount and variants
    const salesPromises = items.map(async (it) => {
      const prod = products.find((p) => p.id === it.product_id);
      const currentSales = prod?.salesCount || 0;
      const newSales = currentSales - it.quantity;
      await supabase
        .from("products")
        .update({ salesCount: newSales >= 0 ? newSales : 0 })
        .eq("id", it.product_id);
    });

    const variantPromises = items.map(async (it) => {
      // increase stock back for that size/ product
      const sizeUpper = (it.size || "").toUpperCase();
      if (!sizeUpper) return;
      // fetch current variant
      const { data: variant } = await supabase
        .from("product_variants")
        .select("stock")
        .eq("product_id", it.product_id)
        .eq("size", sizeUpper)
        .single();

      // if variant doesn't exist, skip
      if (!variant) {
        console.warn(
          `Variant not found while reverting stock for product ${it.product_id} size ${sizeUpper}`
        );
        return;
      }

      const updatedStock = (variant.stock || 0) + it.quantity;

      const { error: updateErr } = await supabase
        .from("product_variants")
        .update({ stock: updatedStock })
        .eq("product_id", it.product_id)
        .eq("size", sizeUpper);

      if (updateErr) {
        console.error(
          `Failed to update variant stock for product ${it.product_id} size ${sizeUpper}:`,
          updateErr
        );
      }
    });

    await Promise.all([...salesPromises, ...variantPromises]);
    console.log(`Reverted salesCount and restored stock for order ${orderId}`);
  } catch (err) {
    console.error("Error reverting sales/stock:", err);
    throw err;
  }
}

/**
 * cancelOrder controller
 * body: { orderId }
 * Authenticated user required.
 * - Owner can cancel while order.status === 'Processing'
 * - Admins can cancel at any time
 * On cancel:
 * - Refund via Stripe or PayPal (full refund) if possible
 * - Update order.status -> 'Canceled', set canceled_at and refund_transaction_id
 * - Revert salesCount and restore variant stock
 */
async function cancelOrder(req, res) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    // fetch order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error("Order fetch error:", orderErr);
      return res.status(404).json({ error: "Order not found" });
    }

    // determine if requester is admin
    const { data: dbUser, error: dbUserErr } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const isAdmin = !!dbUser?.is_admin;

    // authorization: owner or admin
    const isOwner = user.id === order.user_id;
    if (!isOwner && !isAdmin)
      return res.status(403).json({ error: "Not allowed to cancel this order" });

    // business rule: if not admin, only allow cancel when Processing (you said this earlier)
    const cancellableStatusesForUser = ["Processing"];
    if (!isAdmin && !cancellableStatusesForUser.includes(order.status)) {
      return res.status(400).json({
        error:
          "Order cannot be canceled at this stage. Only orders with status 'Processing' can be canceled by the customer.",
      });
    }

    if (order.status === "Canceled") {
      return res.status(400).json({ error: "Order already canceled" });
    }

    // attempt refund if we have transaction_id and payment_reference
    const paymentMethod = order.payment_reference; // 'stripe' or 'paypal'
    const transactionId = order.transaction_id; // stored earlier

    let refundResult = null;
    let refundTransactionId = null;

    if (transactionId && paymentMethod) {
      if (paymentMethod === "stripe") {
        // refund via Stripe using payment_intent id
        try {
          const refund = await stripe.refunds.create({
            payment_intent: transactionId,
          });
          refundResult = refund;
          refundTransactionId = refund.id;
          console.log("Stripe refund successful:", refund.id);
        } catch (err) {
          console.error("Stripe refund failed:", err);
          return res
            .status(500)
            .json({ error: "Stripe refund failed", details: err.message });
        }
      } else if (paymentMethod === "paypal") {
        // For PayPal we expect transactionId to be captureId
        try {
          // Using PayPal SDK - refunds are under payments.capture.refund
          const request = new paypal.payments.CapturesRefundRequest(transactionId);
          request.requestBody({}); // empty => full refund
          const resp = await paypalClient.execute(request);
          refundResult = resp.result;
          // PayPal returns id in resp.result.id
          refundTransactionId = resp.result.id;
          console.log("PayPal refund successful:", resp.result.id);
        } catch (err) {
          console.error("PayPal refund failed:", err);
          return res
            .status(500)
            .json({ error: "PayPal refund failed", details: err.message });
        }
      } else {
        console.warn("Unknown payment method for refund:", paymentMethod);
      }
    } else {
      // no transaction id: admin can still cancel (no refund), owner cannot (because money has been taken)
      if (!isAdmin) {
        return res.status(400).json({
          error:
            "No transaction id found to refund. Contact support or admin to cancel and refund this order.",
        });
      }
      console.warn("No transaction id available for order", orderId);
    }

    // 1) mark order canceled (and keep it)
    const updatePayload = {
      status: "Canceled",
      canceled_at: new Date().toISOString(),
    };
    if (refundTransactionId) updatePayload.refund_transaction_id = refundTransactionId;

    const { error: updateErr } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (updateErr) {
      console.error("Failed to update order status to Canceled:", updateErr);
      return res
        .status(500)
        .json({ error: "Failed to update order status", details: updateErr });
    }

    // 2) revert salesCount and restore variant stock
    try {
      await revertSalesAndRestoreStock(orderId);
    } catch (err) {
      // we already set order Canceled; just warn
      console.error("Failed to revert sales/stock after cancel:", err);
    }

    return res.status(200).json({
      message: "Order canceled and refunded (if applicable).",
      orderId,
      refund: refundResult || null,
    });
  } catch (err) {
    console.error("cancelOrder error:", err);
    return res.status(500).json({ error: "Failed to cancel order" });
  }
}

export default {
  handleStripePayementIntent,
  paypalCreateOrder,
  capturePaypalOrder,
  captureStripePayment, // exported new endpoint
  cancelOrder, // newly added cancel endpoint handler
};
