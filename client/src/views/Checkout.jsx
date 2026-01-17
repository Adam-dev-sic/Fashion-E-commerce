import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  CreditCard,
  ChevronRight,
  Check,
  ArrowLeft,
  ShieldCheck,
  Truck,
  Package,
  Car,
} from "lucide-react";
import RenderPayment from "../components/RenderPayment";
import { useOutletContext } from "react-router-dom";
import CartCheckout from "../components/CartCheckout";
import DetailsForm from "../components/DetailsForm";
import { supabase } from "../supabaseClient";

// ---------------- STEP INDICATOR ----------------
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { number: 1, title: "Cart" },
    { number: 2, title: "Details" },
    { number: 3, title: "Payment" },
    { number: 4, title: "Done" },
  ];

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold text-sm
              ${
                currentStep === step.number
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : currentStep > step.number
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 text-slate-400 bg-white"
              }`}
            >
              {currentStep > step.number ? <Check size={16} /> : step.number}
            </div>
            <span
              className={`ml-2 text-sm font-medium hidden sm:block ${
                currentStep >= step.number ? "text-slate-800" : "text-slate-400"
              }`}
            >
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-2 sm:mx-4 ${
                  currentStep > step.number ? "bg-indigo-600" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------- ORDER SUMMARY ----------------
const OrderSummary = ({ cart, total, shipping }) => (
  <div className="bg-slate-50 p-6 rounded-xl h-fit sticky top-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h3>

    <div className="space-y-4">
      {cart.map((item) => (
        <div key={item.cart_item_id} className="flex justify-between text-sm">
          <span className="text-slate-600 w-2/3 truncate">
            {item.product?.name}
            <span className="text-xs text-slate-400"> x{item.quantity}</span>
          </span>
          <span className="font-medium text-slate-900">
            $
            {item.product.discount && item.product.discount > 0
              ? (
                  item.product.price *
                  (1 - item.product.discount / 100) *
                  item.quantity
                ).toFixed(2)
              : (item.product.price * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}

      <div className="border-t border-slate-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium text-slate-900">
            ${total.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Shipping</span>
          <span className="font-medium text-slate-900">
            {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Tax (Estimated)</span>
          <span className="font-medium text-slate-900">
            ${(total * 0.08).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 flex justify-between">
        <span className="font-bold text-slate-900">Total</span>
        <span className="text-xl font-bold text-indigo-600">
          ${(total + shipping + total * 0.08).toFixed(2)}
        </span>
      </div>
    </div>
  </div>
);

// ---------------- MAIN CHECKOUT ----------------
function Checkout() {
  const session = useOutletContext();

  const [step, setStep] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
const [reload, setReload] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    zip: "",
    country: "United States",
  });

  // -------- FETCH REAL CART --------
  useEffect(() => {
    let mounted = true;

    async function loadCart() {
      if (!session?.user) {
        setCartItems([]);
        setLoadingCart(false);
        return;
      }

      try {
        const { data: cart, error: cartErr } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", session.user.id)
          .single();

        if (cartErr || !cart) {
          setCartItems([]);
          setLoadingCart(false);
          return;
        }

        // get cart rows
        const { data: cartRows, error: cartRowsErr } = await supabase
          .from("cart_items")
          .select("id, product_id, quantity, size")
          .eq("cart_id", cart.id);

        if (cartRowsErr) {
          console.error("Error fetching cart rows:", cartRowsErr);
          setCartItems([]);
          setLoadingCart(false);
          return;
        }

        if (!cartRows || cartRows.length === 0) {
          setCartItems([]);
          setLoadingCart(false);
          return;
        }

        const productIds = cartRows.map((r) => r.product_id);

        // fetch products that belong to cart
        const { data: products } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds);

        const productsById = Object.fromEntries(
          (products || []).map((p) => [p.id, p])
        );

        // Fetch variants for all productIds (do not filter by size to avoid case/casing mismatch)
        const { data: productsVariants = [], error: variantsErr } =
          await supabase
            .from("product_variants")
            .select("*")
            .in("product_id", productIds);

        if (variantsErr) {
          console.error("Error fetching product variants:", variantsErr);
        }

        // We'll process each cart row and fix DB if needed (delete if out of stock, or adjust quantity)
        const updatedCartRows = [...cartRows]; // will mutate to reflect DB changes
        const dbOps = []; // promises for DB ops

        for (const ci of cartRows) {
          const ciSize = (ci.size ?? "").toString().trim().toLowerCase();

          // find variant case-insensitively
          const variant = productsVariants.find(
            (v) =>
              v.product_id === ci.product_id &&
              (v.size ?? "").toString().trim().toLowerCase() === ciSize
          );

          // If no variant found -> remove this cart item (cannot fulfill)
          if (!variant) {
            // remove from DB specific cart row by matching cart_id, product_id and size case-insensitively
            dbOps.push(
              supabase
                .from("cart_items")
                .delete()
                .eq("cart_id", cart.id)
                .eq("product_id", ci.product_id)
                // use ilike for case-insensitive match on size
                .ilike("size", ci.size ?? "")
            );

            // remove from updatedCartRows (do it in-place)
            const idx = updatedCartRows.findIndex((r) => r.id === ci.id);
            if (idx >= 0) updatedCartRows.splice(idx, 1);

            // notify user
            alert(
              `Item ${
                productsById[ci.product_id]?.name ?? ci.product_id
              } (size ${
                ci.size
              }) is no longer available and was removed from your cart.`
            );
            setReload((r)=>r+1);


            continue;
          }

          // If variant exists but no stock -> remove
          if (typeof variant.stock === "number" && variant.stock <= 0) {
            dbOps.push(
              supabase
                .from("cart_items")
                .delete()
                .eq("cart_id", cart.id)
                .eq("product_id", ci.product_id)
                .ilike("size", ci.size ?? "")
            );
            const idx = updatedCartRows.findIndex((r) => r.id === ci.id);
            if (idx >= 0) updatedCartRows.splice(idx, 1);

            alert(
              `Item ${
                productsById[ci.product_id]?.name ?? ci.product_id
              } (size ${
                ci.size
              }) is out of stock and was removed from your cart.`
            );
            setReload((r)=>r+1);

            continue;
          }

          // If variant stock less than requested quantity -> update quantity to available stock
          if (variant.stock < ci.quantity) {
            dbOps.push(
              supabase
                .from("cart_items")
                .update({ quantity: variant.stock })
                .eq("cart_id", cart.id)
                .eq("product_id", ci.product_id)
                .ilike("size", ci.size ?? "")
            );

            const idx = updatedCartRows.findIndex((r) => r.id === ci.id);
            if (idx >= 0)
              updatedCartRows[idx] = {
                ...updatedCartRows[idx],
                quantity: variant.stock,
              };

            alert(
              `Quantity for ${
                productsById[ci.product_id]?.name ?? ci.product_id
              } (size ${ci.size}) was reduced to available stock (${
                variant.stock
              }).`
              
            );
            setReload((r)=>r+1);

          }

          // otherwise variant.stock >= requested quantity -> nothing to do
        } // end for each cart row

        // execute DB operations (deletes/updates)
        if (dbOps.length > 0) {
          await Promise.all(dbOps);
        }

        // Re-fetch updated cart_rows after DB operations to be accurate
        const { data: freshCartRows = [] } = await supabase
          .from("cart_items")
          .select("id, product_id, quantity, size")
          .eq("cart_id", cart.id);

        // Build combined array for UI
        const freshProductsById = productsById; // we already have products fetched
        const combined = freshCartRows.map((ci) => ({
          cart_item_id: ci.id,
          product: freshProductsById[ci.product_id],
          quantity: ci.quantity,
          size: ci.size,
        }));

        if (mounted) {
          setCartItems(combined);
          setLoadingCart(false);
        }
      } catch (err) {
        console.error("Failed loading cart:", err);
        if (mounted) {
          setCartItems([]);
          setLoadingCart(false);
        }
      }
    }

    loadCart();
    return () => (mounted = false);
  }, [session]);

  const cartTotal = cartItems.reduce((acc, ci) => {
    const price =
      ci.product.discount && ci.product.discount > 0
        ? ci.product.price * (1 - ci.product.discount / 100)
        : ci.product.price;

    return acc + price * ci.quantity;
  }, 0);

  const shippingCost = 15.0;

  const nextStep = (e) => {
    e?.preventDefault();
    if (step === 3) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setStep(4);
      }, 1500);
    } else {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => step > 1 && setStep((s) => s - 1);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <StepIndicator currentStep={step} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className={`lg:col-span-8 ${step === 4 && "lg:col-span-12"}`}>
            {step === 1 && <CartCheckout nextStep={nextStep} reload={reload} />}
            {step === 2 && (
              <DetailsForm
                nextStep={nextStep}
                prevStep={prevStep}
                formData={formData}
                handleInputChange={(e) =>
                  setFormData({ ...formData, [e.target.name]: e.target.value })
                }
              />
            )}
            {step === 3 && (
              <RenderPayment
                formData={formData}
                isProcessing={isProcessing}
                prevStep={prevStep}
                nextStep={nextStep}
                session={session}
              />
            )}

            {step === 4 && (
              <div className="text-center py-20">
                <ShieldCheck
                  size={48}
                  className="mx-auto mb-4 text-green-500 animate-pop"
                />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Thank you for your purchase!
                </h2>
                <p className="text-slate-600 mb-6">
                  A confirmation email has been sent to {formData.email}.
                </p>
                <button
                  onClick={() => (window.location.href = "/")}
                  className="mt-4 inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Home
                </button>
              </div>
            )}
          </div>

          {step < 4 && !loadingCart && (
            <div className="lg:col-span-4">
              <OrderSummary
                cart={cartItems}
                total={cartTotal}
                shipping={shippingCost}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Checkout;
