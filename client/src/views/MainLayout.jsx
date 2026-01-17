import React, { useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import SlideBar from "../components/SlideBar";
import Offers from "../components/Offers";
import Brands from "../components/Brands";
import { use } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../supabaseClient";
Link;
function MainLayout() {
  const isMobile = useMediaQuery({ maxWidth: 1024 });
  const session = useOutletContext();
  const navigaste = useNavigate();

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

  return (
    <div className="w-full">
      <main className="w-full">
        {/* HERO SECTION */}
        <section className="relative h-[95vh] w-full bg-[url('./images/19639.jpg')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative z-10 flex h-full items-center">
            <div className="px-6 sm:px-12 lg:px-24 max-w-3xl space-y-6">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight">
                Redefine Your Style
              </h1>

              <p className="text-white/90 text-base sm:text-lg max-w-xl">
                Discover the latest arrivals in fashion, curated for every
                season and every moment.
              </p>

              <div className="flex gap-4">
                <Link to={`/products?${new URLSearchParams({ tags: "New" })}`}>
                  <button className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition">
                    Shop New Arrivals
                  </button>
                </Link>
                <Link to="/products">
                  <button className="border border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white hover:text-black transition">
                    Explore Collections
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* NEW ARRIVALS */}
        <section className="w-full px-4 sm:px-10 xl:px-32 mt-16">
          <h1 className="text-3xl font-bold mb-8">New Arrivals</h1>
          <SlideBar today={true} session={session} />
        </section>

        {/* OFFERS */}
        <section className="w-full px-4 sm:px-10 xl:px-32 mt-16">
          <Offers />
        </section>

        {/* POPULAR */}
        <section className="w-full px-4 sm:px-10 xl:px-32 mt-20">
          <h1 className="text-3xl font-bold mb-8">Most Popular</h1>
          <SlideBar popular={true} session={session} />
        </section>

        {/* BRANDS */}
        <section className="mt-24">
          <Brands />
        </section>
      </main>
    </div>
  );
}

export default MainLayout;
