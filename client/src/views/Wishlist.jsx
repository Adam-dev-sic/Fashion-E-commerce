import React, { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Trash2, Heart } from "lucide-react";

export default function Wishlist() {
  const session = useOutletContext(); // your other components use this pattern
  const user = session?.user;
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      // clear if no user
      setWishlist([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchWishlist() {
    setWishlistLoading(true);
    setWishlistError(null);
    try {
      const userId = user.id;
      // get wishlist (product ids)
      const { data: favRows, error: favErr } = await supabase
        .from("wishlist")
        .select("product_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (favErr) throw favErr;

      const productIds = (favRows || []).map((r) => r.product_id).filter(Boolean);
      if (productIds.length === 0) {
        setWishlist([]);
        return;
      }

      // fetch products
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds).eq("shown", true); // only shown products

      if (prodErr) throw prodErr;

      // keep original wishlist order
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

  // remove item from wishlist
  async function handleRemoveFromWishlist(productId) {
    if (!user) return;
    try {
      // optimistic UI
      setWishlist((prev) => prev.filter((p) => p.id !== productId));
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .match({ user_id: user.id, product_id: productId });

      if (error) {
        console.error("Error deleting wishlist row:", error);
        // refetch to recover
        fetchWishlist();
      }
    } catch (err) {
      console.error("Failed removing from wishlist", err);
      fetchWishlist();
    }
  }

  // optional: go to product page
  function goToProduct(productId) {
    navigate(`/product/${productId}`);
  }

  const formatPrice = (n) => {
    if (isNaN(n)) return "$0.00";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Your Wishlist</h1>
            <p className="text-sm text-gray-500 mt-1">
              Items you saved for later — {wishlist.length} {wishlist.length === 1 ? "item" : "items"}.
            </p>
          </div>

          <div>
            {user ? (
              <button
                onClick={() => fetchWishlist()}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm text-sm hover:bg-gray-50"
              >
                Refresh
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-full shadow-sm text-sm hover:bg-indigo-700"
              >
                Sign in to view wishlist
              </button>
            )}
          </div>
        </div>

        {/* Loading / error */}
        {wishlistLoading && (
          <div className="text-center py-20 text-gray-500">Loading wishlist…</div>
        )}
        {wishlistError && (
          <div className="text-center py-6 text-red-600">{wishlistError}</div>
        )}

        {/* Empty state */}
        {!wishlistLoading && wishlist.length === 0 && !wishlistError && (
          <div className="bg-white p-12 rounded-xl border border-dashed border-gray-200 text-center">
            <Heart className="mx-auto mb-4 text-indigo-600" size={36} />
            <h3 className="text-xl font-semibold text-gray-900">No items in your wishlist</h3>
            <p className="text-gray-500 mt-2">Save items from product pages and they'll appear here.</p>
            <div className="mt-6">
              <button
                onClick={() => navigate("/products")}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700"
              >
                Browse Products
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {!wishlistLoading && wishlist.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlist.map((product) => {
              const rawPrice = Number(product.price ?? 0);
              const discountPercent = Number(product.discount ?? product.sale ?? 0) || 0;
              const effectivePrice = rawPrice * (1 - discountPercent / 100);

              return (
                <article
                  key={product.id}
                  className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm flex flex-col"
                >
                  <div
                    className="h-60 bg-gray-50 flex items-center justify-center cursor-pointer"
                    onClick={() => goToProduct(product.id)}
                  >
                    <img
                      src={product.main_angle || "/images/placeholder.png"}
                      alt={product.name}
                      className="max-h-full object-contain"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/400?text=No+Image";
                      }}
                    />
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase">{product.brand}</p>
                        <h3 className="text-lg font-semibold text-gray-900 mt-1">{product.name}</h3>
                      </div>

                      <div className="text-right">
                        {discountPercent > 0 ? (
                          <>
                            <p className="text-sm text-gray-400 line-through">${formatPrice(rawPrice)}</p>
                            <p className="text-lg font-bold text-gray-900">${formatPrice(effectivePrice)}</p>
                            <span className="text-xs text-white bg-red-500 px-2 py-1 rounded-full ml-2">
                              -{discountPercent}%
                            </span>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-gray-900">${formatPrice(rawPrice)}</p>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mt-3 line-clamp-3">{product.description}</p>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        onClick={() => goToProduct(product.id)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                      >
                        View
                      </button>

                      <button
                        onClick={() => handleRemoveFromWishlist(product.id)}
                        className="px-3 py-2 rounded-lg text-sm bg-white border border-red-100 text-red-600 hover:bg-red-50"
                        title="Remove from wishlist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
