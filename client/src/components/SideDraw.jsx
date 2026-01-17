// src/components/SideDrawer.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; // adjust path if needed
import { apiFetch } from "../utils/api";

export default function SideDrawer({ activeDrawer, setActiveDrawer, session }) {
  const navigate = useNavigate();

  // --- SEARCH STATES & LOGIC (unchanged) ---
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  // cart simple ids set (used for badges or quick checks)
  const [cartitemsIds, setCartitemsIds] = useState(new Set());
  const [loadingCartItems, setLoadingCartItems] = useState(false);

  // detailed cart items
  const [cartItems, setCartItems] = useState([]); // { cart_item_id, product_id, quantity, size, product }
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);

  // -------------------------------
  // Load cart item ids (only for shown products) + keep items in sync
  // -------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadCartitemIds() {
      setLoadingCartItems(true);
      try {
        const currentSession =
          session ?? (await supabase.auth.getSession()).data?.session;
        const user = currentSession?.user;
        if (!user) {
          if (mounted) setCartitemsIds(new Set());
          return;
        }

        // get cart id
        const { data: cartRow, error: cartErr } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (cartErr || !cartRow) {
          if (mounted) setCartitemsIds(new Set());
          return;
        }

        // fetch cart_item rows
        const { data: cartItemRows, error: cartItemsErr } = await supabase
          .from("cart_items")
          .select("product_id")
          .eq("cart_id", cartRow.id);

        if (cartItemsErr) throw cartItemsErr;

        const productIds = (cartItemRows || [])
          .map((r) => r.product_id)
          .filter(Boolean);

        if (productIds.length === 0) {
          if (mounted) setCartitemsIds(new Set());
          return;
        }

        // fetch products that are shown (filter out not-shown)
        const { data: shownProducts, error: productsErr } = await supabase
          .from("products")
          .select("id")
          .in("id", productIds)
          .eq("shown", true);

        if (productsErr) throw productsErr;

        const shownIds = new Set((shownProducts || []).map((p) => p.id));
        if (mounted) setCartitemsIds(shownIds);
      } catch (err) {
        console.error("Failed to load cart item ids:", err);
        if (mounted) setCartitemsIds(new Set());
      } finally {
        if (mounted) setLoadingCartItems(false);
      }
    }

    loadCartitemIds();
    return () => {
      mounted = false;
    };
  }, [session]);

  // -------------------------------
  // Fetch cart details when cart drawer opens
  //   - deletes cart_items whose product is NOT shown
  // -------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadCartDetails() {
      setCartLoading(true);
      setCartError(null);

      try {
        const currentSession =
          session ?? (await supabase.auth.getSession()).data?.session;
        const user = currentSession?.user;
        if (!user) {
          if (mounted) setCartItems([]);
          return;
        }

        // 1) get the user's cart id
        const { data: cartRow, error: cartErr } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (cartErr || !cartRow) {
          if (cartErr) throw cartErr;
          if (mounted) setCartItems([]);
          return;
        }

        const cartId = cartRow.id;

        // 2) fetch cart_items rows (we want the row id, product_id, quantity, size)
        const { data: cartItemRows, error: cartItemsErr } = await supabase
          .from("cart_items")
          .select("id, product_id, quantity, size")
          .eq("cart_id", cartId);

        if (cartItemsErr) throw cartItemsErr;

        if (!cartItemRows || cartItemRows.length === 0) {
          if (mounted) setCartItems([]);
          return;
        }

        const productIds = cartItemRows
          .map((r) => r.product_id)
          .filter(Boolean);
        if (productIds.length === 0) {
          if (mounted) setCartItems([]);
          return;
        }

        // 3) fetch product details for those ids BUT only products with shown = true
        const { data: shownProducts, error: productsErr } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds)
          .eq("shown", true);

        if (productsErr) throw productsErr;

        const shownIdsSet = new Set((shownProducts || []).map((p) => p.id));

        // 4) find cart items that reference NOT-shown products
        const removedCartItemRows = cartItemRows.filter(
          (ci) => !shownIdsSet.has(ci.product_id)
        );

        if (removedCartItemRows.length > 0) {
          // Delete these cart_items from DB (we keep operation server-side atomic as possible)
          try {
            const removedProductIds = removedCartItemRows
              .map((r) => r.product_id)
              .filter(Boolean);

            // Delete rows where cart_id matches and product_id in removedProductIds
            const { error: deleteErr } = await supabase
              .from("cart_items")
              .delete()
              .eq("cart_id", cartId)
              .in("product_id", removedProductIds);

            if (deleteErr) {
              // log but continue — we still won't display non-shown items locally
              console.error("Failed to delete removed cart items:", deleteErr);
            } else {
              console.log(
                "Deleted cart_items for not-shown products:",
                removedProductIds
              );
            }
          } catch (delErr) {
            console.error(
              "Error deleting cart items for not-shown products",
              delErr
            );
          }
        }

        // 5) Build map of shown products by id (only these will show)
        const productsById = (shownProducts || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});

        // 6) build combined list preserving cart_items order, only include shown products
        const combined = cartItemRows
          .map((ci) => {
            if (!productsById[ci.product_id]) return null;
            return {
              cart_item_id: ci.id,
              product_id: ci.product_id,
              quantity: ci.quantity ?? 1,
              size: ci.size ?? null,
              product: productsById[ci.product_id],
            };
          })
          .filter(Boolean);

        if (mounted) setCartItems(combined);
      } catch (err) {
        console.error("Failed to load cart details:", err);
        if (mounted) {
          setCartError(err.message || "Failed to load cart");
          setCartItems([]);
        }
      } finally {
        if (mounted) setCartLoading(false);
      }
    }

    if (activeDrawer === "cart") {
      loadCartDetails();
    }

    return () => {
      mounted = false;
    };
  }, [activeDrawer, session]);

  // ---------------------------------
  // Remove item from cart (client + db)
  // ---------------------------------
  async function removeFromCart(cartItemId) {
    try {
      // optimistic update
      setCartItems((prev) =>
        prev.filter((ci) => ci.cart_item_id !== cartItemId)
      );

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to remove cart item:", err);
      alert("Could not remove item from cart. Try again.");

      // quick refetch fallback to re-sync UI
      if (activeDrawer === "cart") {
        try {
          const currentSession =
            session ?? (await supabase.auth.getSession()).data?.session;
          const user = currentSession?.user;
          if (!user) return;
          const { data: cartRow } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", user.id)
            .single();
          if (!cartRow) return;
          const { data: cartItemRows } = await supabase
            .from("cart_items")
            .select("id, product_id, quantity, size")
            .eq("cart_id", cartRow.id);

          const productIds = (cartItemRows || []).map((r) => r.product_id);
          const { data: products } = await supabase
            .from("products")
            .select("*")
            .in("id", productIds)
            .eq("shown", true);

          const productsById = (products || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});

          const combined = (cartItemRows || [])
            .map((ci) => {
              const prod = productsById[ci.product_id] || null;
              if (!prod) return null;
              return {
                cart_item_id: ci.id,
                product_id: ci.product_id,
                quantity: ci.quantity ?? 1,
                size: ci.size ?? null,
                product: prod,
              };
            })
            .filter(Boolean);

          setCartItems(combined);
        } catch (e) {
          console.error("Refetch after failed delete also failed", e);
        }
      }
    }
  }

  // -------------------------------
  // Search effect
  // -------------------------------
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }
    

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(
          `/api/products?search=${encodeURIComponent(searchTerm.trim())}`
        );
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  const handleKeyDown = (e) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      if (searchTerm.trim()) {
        setActiveDrawer(null);
        const q = encodeURIComponent(searchTerm.trim());
        setSearchTerm("");
        navigate(`/products/?search=${q}`);
      }
    }
  };

  // --- AUTH (logout) ---
  const handleLogout = async () => {
    setActiveDrawer(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout Error:", error.message);
    } else {
      navigate("/");
    }
  };

  // derive user info if session exists
  const user = session?.user;
  const userEmail = user?.email;
  const userName =
    user?.user_metadata?.name || (userEmail ? userEmail.split("@")[0] : null);

  // -------------------------------
  // Wishlist (unchanged behavior - only fetch shown products)
  // -------------------------------
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState(null);

  useEffect(() => {
    if (activeDrawer === "wishlist") {
      if (!user) {
        setWishlist([]);
        return;
      }
      fetchWishlist();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDrawer, user]);

  async function fetchWishlist() {
    setWishlistLoading(true);
    setWishlistError(null);
    try {
      const userId = user.id;
      const { data: favRows, error: favErr } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", userId);

      if (favErr) throw favErr;

      const productIds = (favRows || [])
        .map((r) => r.product_id)
        .filter(Boolean);
      if (productIds.length === 0) {
        setWishlist([]);
        setWishlistLoading(false);
        return;
      }

      // Fetch products by ids from 'products' table AND only shown products
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds)
        .eq("shown", true);

      if (prodErr) throw prodErr;

      const productsById = (products || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
      const ordered = productIds.map((id) => productsById[id]).filter(Boolean);

      setWishlist(ordered);
    } catch (err) {
      console.error("Failed to load wishlist", err);
      setWishlistError(err.message || "Failed to load wishlist");
      setWishlist([]);
    } finally {
      setWishlistLoading(false);
    }
  }

  async function removeFromWishlist(productId) {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .match({ user_id: user.id, product_id: productId });

      if (error) throw error;

      setWishlist((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.error("Failed to remove from wishlist", err);
      alert("Could not remove item. Try again.");
    }
  }

  // ---------------------------------
  // Render
  // ---------------------------------
  if (!activeDrawer) return null;

  return (
    <div className="fixed inset-0 z-[600] flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={() => setActiveDrawer(null)}
      ></div>

      <div className="relative w-full lg:w-150 border-l-gray-500 border-l-2 h-full bg-white shadow-2xl p-8 flex flex-col animate-fade-in-left animate-duration-600">
        <button
          onClick={() => setActiveDrawer(null)}
          className="absolute top-5 right-5 text-2xl font-bold hover:text-gray-500 z-10"
        >
          &times;
        </button>

        {/* SEARCH */}
        {activeDrawer === "search" && (
          <div className="mt-10 flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-6">Search</h2>

            <div className="flex items-center border-b-2 border-black py-2 mb-4">
              <img
                src="/images/search.svg"
                className="h-5 w-5 mr-2 opacity-50"
                alt="search"
              />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type to search..."
                className="w-full outline-none text-xl placeholder:text-gray-300"
              />
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Press{" "}
              <kbd className="font-mono bg-gray-100 px-1 rounded">TAB</kbd> to
              see all results
            </p>

            <div className="flex-1 overflow-y-auto">
              {loading && (
                <p className="text-gray-400 animate-pulse">Searching...</p>
              )}

              {!loading && results.length > 0 && (
                <div className="space-y-4">
                  {results.slice(0, 5).map((product) => (
                    <div
                      key={product.id}
                      onClick={() => {
                        navigate(`/product/${product.id}`);
                        setActiveDrawer(null);
                      }}
                      className="flex items-center gap-4 p-2 hover:bg-gray-50 cursor-pointer rounded-lg transition"
                    >
                      <img
                        src={
                          product.main_angle || "https://via.placeholder.com/50"
                        }
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div>
                        <h4 className="font-bold text-sm">{product.name}</h4>
                        <p className="text-xs text-gray-500 uppercase">
                          {product.brand}
                        </p>
                        <span className="text-sm font-mono">
                          ${product.price}
                        </span>
                      </div>
                    </div>
                  ))}
                  {results.length > 5 && (
                    <button
                      onClick={() => {
                        setActiveDrawer(null);
                        navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                      }}
                      className="w-full text-center text-sm font-bold text-blue-600 mt-2 hover:underline"
                    >
                      View all {results.length} results
                    </button>
                  )}
                </div>
              )}
              {!loading && searchTerm && results.length === 0 && (
                <p className="text-gray-500">No matches found.</p>
              )}
            </div>
          </div>
        )}

        {/* PROFILE */}
        {activeDrawer === "profile" && (
          <div className="mt-10 flex flex-col space-y-4">
            <h2 className="text-2xl font-bold mb-6">Account</h2>

            {user ? (
              // LOGGED IN UI
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold">Hello, {userName}</p>
                  <p className="text-sm text-gray-500">{userEmail}</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setActiveDrawer(null);
                      navigate("/orders");
                    }}
                    className="w-full text-left py-2 hover:text-blue-600 transition border-b"
                  >
                    Order History
                  </button>
                  <button
                    onClick={() => {
                      setActiveDrawer(null);
                      navigate("/account");
                    }}
                    className="w-full text-left py-2 hover:text-blue-600 transition border-b"
                  >
                    Account Settings
                  </button>

                  {/* Admin link: adjust condition according to how you store admin flags */}
                  {user.app_metadata?.claims_admin && (
                    <button
                      onClick={() => {
                        setActiveDrawer(null);
                        navigate("/interface");
                      }}
                      className="w-full text-left py-2 font-bold text-red-600 transition border-b"
                    >
                      Admin Interface
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveDrawer(null);
                      navigate("/wishlist");
                    }}
                    className="w-full text-left py-2 hover:text-blue-600 transition border-b"
                  >
                    My Wishlist
                  </button>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white py-3 rounded hover:bg-red-700 font-semibold mt-4"
                >
                  Log Out
                </button>
              </div>
            ) : (
              // LOGGED OUT UI
              <>
                <button
                  onClick={() => {
                    setActiveDrawer(null);
                    navigate("/authentication");
                  }}
                  className="bg-black text-white py-3 rounded hover:bg-gray-800 font-semibold"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setActiveDrawer(null);
                    navigate("/authentication");
                  }}
                  className="border border-black py-3 rounded hover:bg-gray-100 font-semibold"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        )}

        {/* CART */}
        {activeDrawer === "cart" && (
          <div className="mt-10 flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-6">
              Shopping Bag ({cartItems.length})
            </h2>

            {!user && (
              <div className="text-sm text-gray-500">
                Sign in to view your bag.
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setActiveDrawer(null);
                      navigate("/authentication");
                    }}
                    className="bg-black text-white px-4 py-2 rounded"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {user && (
              <div className="flex-1 overflow-y-auto">
                {cartLoading && <p className="text-gray-500">Loading bag...</p>}
                {cartError && <p className="text-red-500">{cartError}</p>}

                {!cartLoading && cartItems.length === 0 && (
                  <div className="text-gray-500">
                    Your bag is empty.
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setActiveDrawer(null);
                          navigate("/");
                        }}
                        className="text-black underline"
                      >
                        Start Shopping
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {cartItems.map((ci) => (
                    <div
                      key={ci.cart_item_id}
                      className="flex items-center gap-4 p-2 rounded hover:bg-gray-50"
                    >
                      <img
                        src={
                          (ci.product &&
                            (ci.product.mainAngle || ci.product.main_angle)) ||
                          "https://via.placeholder.com/60"
                        }
                        alt={ci.product?.name || "product"}
                        className="w-16 h-16 object-cover rounded-md cursor-pointer"
                        onClick={() => {
                          setActiveDrawer(null);
                          navigate(`/product/${ci.product_id}`);
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{ci.product?.name}</div>
                        <div className="text-xs text-gray-500">
                          {ci.product?.brand}
                        </div>
                        <div className="text-sm font-mono">
                          ${ci.product?.price} • Qty: {ci.quantity}
                          {ci.size ? ` • Size: ${ci.size}` : ""}
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => removeFromCart(ci.cart_item_id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout area */}
                {!cartLoading && cartItems.length > 0 && (
                  <div className="mt-6 border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="font-semibold">Subtotal</div>
                      <div className="font-mono">
                        $
                        {cartItems
                          .reduce((acc, ci) => {
                            const price = Number(ci.product?.price || 0);
                            return acc + price * (ci.quantity || 1);
                          }, 0)
                          .toFixed(2)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setActiveDrawer(null);
                          navigate("/checkout");
                        }}
                        className="flex-1 bg-black text-white py-3 rounded font-semibold"
                      >
                        Checkout
                      </button>
                      <button
                        onClick={() => {
                          setActiveDrawer(null);
                          navigate("/checkout");
                        }}
                        className="flex-1 border border-black py-3 rounded font-semibold"
                      >
                        View Cart
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WISHLIST */}
        {activeDrawer === "wishlist" && (
          <div className="mt-10 flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-6">Wishlist</h2>

            {!user && (
              <div className="text-sm text-gray-500">
                Sign in to view and manage your wishlist.
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setActiveDrawer(null);
                      navigate("/authentication");
                    }}
                    className="bg-black text-white px-4 py-2 rounded"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {user && (
              <div className="flex-1 overflow-y-auto">
                {wishlistLoading && (
                  <p className="text-gray-500">Loading wishlist...</p>
                )}
                {wishlistError && (
                  <p className="text-red-500">{wishlistError}</p>
                )}

                {!wishlistLoading && wishlist.length === 0 && (
                  <div className="text-gray-500">
                    No items in your wishlist yet.
                  </div>
                )}

                <div className="space-y-3">
                  {wishlist.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 p-2 rounded hover:bg-gray-50"
                    >
                      <img
                        src={p.main_angle || "https://via.placeholder.com/60"}
                        alt={p.name}
                        className="w-16 h-16 object-cover rounded-md cursor-pointer"
                        onClick={() => {
                          setActiveDrawer(null);
                          navigate(`/product/${p.id}`);
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.brand}</div>
                        <div className="text-sm font-mono">${p.price}</div>
                      </div>
                      <div>
                        <button
                          onClick={() => removeFromWishlist(p.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* any other drawers... */}
      </div>
    </div>
  );
}
