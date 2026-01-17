// src/components/CartCheckout.jsx
import { ChevronRight, ShoppingBag, Truck } from "lucide-react";
import React, { useEffect, useState } from "react";
import CartItem from "./CartItem";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useOutletContext } from "react-router-dom";

function CartCheckout({ nextStep, reload }) {
  const session = useOutletContext(); // expects parent to provide session via Outlet context
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]); // will contain normalized items for CartItem component
  const [error, setError] = useState(null);

  // Reusable: delete cart_items pointing to products with shown = false
  // requirements: supabase, session (session may be null while loading)
  // Example usage: put inside a component and call in a useEffect with [session] deps.

  useEffect(() => {
    let mounted = true;
    async function removeNotShownCartItems() {
      try {
        const currentSession =
          session ?? (await supabase.auth.getSession()).data?.session;
        const user = currentSession?.user;
        if (!user) return;

        // get user's cart id
        const { data: cartRow, error: cartErr } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (cartErr || !cartRow) return;

        const cartId = cartRow.id;

        // fetch cart_items rows
        const { data: cartItemRows, error: cartItemsErr } = await supabase
          .from("cart_items")
          .select("id, product_id")
          .eq("cart_id", cartId);

        if (cartItemsErr || !cartItemRows || cartItemRows.length === 0) return;

        const productIds = cartItemRows
          .map((r) => r.product_id)
          .filter(Boolean);
        if (productIds.length === 0) return;

        // fetch products that ARE shown
        const { data: shownProducts, error: productsErr } = await supabase
          .from("products")
          .select("id")
          .in("id", productIds)
          .eq("shown", true);

        if (productsErr) {
          console.error("Error fetching shown products", productsErr);
          return;
        }

        const shownIdsSet = new Set((shownProducts || []).map((p) => p.id));
        const productIdsToRemove = productIds.filter(
          (id) => !shownIdsSet.has(id)
        );
        if (productIdsToRemove.length === 0) return;

        // Delete all cart_items for this cart where product_id in productIdsToRemove
        const { error: deleteErr } = await supabase
          .from("cart_items")
          .delete()
          .eq("cart_id", cartId)
          .in("product_id", productIdsToRemove);

        if (deleteErr) {
          console.error("Failed deleting non-shown cart items:", deleteErr);
        }
      } catch (err) {
        console.error("Error in removeNotShownCartItems:", err);
      }
    }

    // run once when session is available
    removeNotShownCartItems();

    return () => {
      mounted = false;
    };
  }, [session]);

  useEffect(() => {
    let mounted = true;

    async function loadCartFromDb() {
      setLoading(true);
      setError(null);

      try {
        const currentUser = session?.user;
        if (!currentUser?.id) {
          if (mounted) {
            setCartItems([]);
            setLoading(false);
          }
          return;
        }

        // 1) Get user's cart row (assumes one cart per user)
        const { data: cartRow, error: cartErr } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", currentUser.id)
          .single();

        if (cartErr) {
          // if no cart, treat as empty
          if (
            cartErr.code === "PGRST116" ||
            cartErr.message?.includes("Results contain 0 rows")
          ) {
            if (mounted) {
              setCartItems([]);
              setLoading(false);
            }
            return;
          }
          throw cartErr;
        }

        if (!cartRow) {
          if (mounted) {
            setCartItems([]);
            setLoading(false);
          }
          return;
        }

        const cartId = cartRow.id;

        // 2) Fetch cart_items rows
        const { data: cartItemRows, error: cartItemsErr } = await supabase
          .from("cart_items")
          .select("id, product_id, quantity, size")
          .eq("cart_id", cartId);

        if (cartItemsErr) throw cartItemsErr;

        if (!cartItemRows || cartItemRows.length === 0) {
          if (mounted) {
            setCartItems([]);
            setLoading(false);
          }
          return;
        }

        const productIds = cartItemRows
          .map((r) => r.product_id)
          .filter(Boolean);

        // 3) Fetch product rows by ids
        const { data: products, error: productsErr } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds);

        if (productsErr) throw productsErr;

        const productsById = (products || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});

        // 4) Normalize to shape expected by CartItem (keeps existing CartItem API)
        const normalizedForCart = cartItemRows.map((ci) => {
          const prod = productsById[ci.product_id] || {};
          const mainImage =
            prod.mainAngle ||
            prod.main_angle ||
            prod.main_image ||
            prod.mainImage ||
            "";
          return {
            // CartItem expects: id, name, price, image, description, quantity
            id: prod.id || ci.product_id,
            name: prod.name || "Product",
            price: Number(prod.price || 0),
            image: mainImage || "https://via.placeholder.com/80",
            description: prod.description || "",
            size: ci.size || prod.size || "N/A",
            quantity: Number(ci.quantity || 1),
            // keep original fields for other UI (if needed)
            cart_item_id: ci.id,
            size: ci.size || null,
            rawProduct: prod,
            discount: prod.discount || 0,
          };
        });

        if (mounted) {
          setCartItems(normalizedForCart);
        }
      } catch (err) {
        console.error("Failed to load cart:", err);
        if (mounted) {
          setError(err.message || "Failed to load cart");
          setCartItems([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCartFromDb();

    return () => {
      mounted = false;
    };
  }, [session, reload]);

  // derive totals
  const subtotal = cartItems.reduce(
    (acc, it) => acc + (it.price || 0) * (it.quantity || 0),
    0
  );
  const shippingCost = subtotal > 100 ? 0 : 15;

  // Not logged in UX
  if (!session?.user?.id) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2 mb-2">
            <ShoppingBag className="text-indigo-600" size={20} />
            Your Cart
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Sign in to view and manage your cart.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate("/authentication")}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="text-indigo-600" size={20} />
            Your Cart
          </h2>
          <span className="text-sm font-medium text-slate-500">
            {cartItems.reduce((a, i) => a + (i.quantity || 0), 0)} items
          </span>
        </div>

        <div className="p-6">
          {loading && <p className="text-gray-500">Loading cart...</p>}
          {!loading && error && <p className="text-red-500">Error: {error}</p>}

          {!loading && !error && cartItems.length === 0 && (
            <p className="text-gray-500">Your cart is empty.</p>
          )}

          {!loading &&
            !error &&
            cartItems.map((item) => (
              <CartItem key={item.cart_item_id || item.id} item={item} />
            ))}
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Truck size={16} />
              <span>Free shipping on orders over $100</span>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-4">
              <div className="text-sm text-slate-700 mr-4 hidden sm:block">
                <div>
                  Subtotal:{" "}
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div>
                  Shipping:{" "}
                  <span className="font-semibold">
                    {shippingCost === 0
                      ? "Free"
                      : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="mt-1 text-base font-bold">
                  Total:{" "}
                  <span className="text-indigo-600">
                    ${(subtotal + shippingCost + subtotal * 0.08).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={nextStep}
                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                Proceed to Details <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartCheckout;
