// src/components/SlideBar.jsx
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";

import {
  A11y,
  Navigation,
  Pagination,
  Scrollbar,
  Autoplay,
} from "swiper/modules";

import "swiper/css";
import "swiper/css/bundle";
import { supabase } from "../supabaseClient.js";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

/**
 * SlideBar
 * Props:
 *  - today (bool) : sort by newest
 *  - popular (bool) : sort by sales
 *  - session (object) : supabase session from App
 */
function SlideBar({ today, popular, session }) {
  const [products, setProducts] = useState([]); // products fetched from DB
  const [loadingProducts, setLoadingProducts] = useState(true);

  // favoritedIds is a Set of product ids for fast lookup
  const [favoritedIds, setFavoritedIds] = useState(new Set());
  const [loadingFavs, setLoadingFavs] = useState(false);
  const navigate = useNavigate(); // HOOK ADDED

  const prevRef = useRef(null);
  const nextRef = useRef(null);

  // 1) Fetch products from Supabase (server-side sorting)
  useEffect(() => {
    let mounted = true;
    setLoadingProducts(true);

    async function loadProducts() {
      try {
        // Choose ordering depending on props
        // Note: adjust column names if your table uses different names
        let query = supabase.from("products").select("*").eq("shown", true);

        if (popular) {
          query = query.order("salesCount", { ascending: false });
        } else if (today) {
          // created_at or createdAt depending on your schema
          query = query.order("created_at", { ascending: false });
        } else {
          query = query.order("created_at", { ascending: false });
        }

        // limit to a reasonable number (we'll slice to 12 anyway)
        query = query.limit(100);

        const { data, error } = await query;
        if (error) throw error;
        if (!mounted) return;

        // data is an array of product rows
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load products:", err);
        setProducts([]);
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    }

    loadProducts();
    return () => {
      mounted = false;
    };
  }, [popular, today]);

  // 2) Fetch wishlist product_ids for the logged-in user (one call)
  useEffect(() => {
    let mounted = true;
    async function loadWishlistIds() {
      setLoadingFavs(true);
      try {
        const currentSession =
          session ?? (await supabase.auth.getSession()).data?.session;
        const user = currentSession?.user;
        if (!user) {
          if (mounted) setFavoritedIds(new Set());
          return;
        }

        // fetch only product_id column
        const { data, error } = await supabase
          .from("wishlist")
          .select("product_id")
          .eq("user_id", user.id);

        if (error) throw error;
        const ids = new Set((data || []).map((r) => r.product_id));
        if (mounted) setFavoritedIds(ids);
      } catch (err) {
        console.error("Failed to load wishlist ids:", err);
        if (mounted) setFavoritedIds(new Set());
      } finally {
        if (mounted) setLoadingFavs(false);
      }
    }

    // run only if drawer/page loads and when session changes
    loadWishlistIds();
    return () => {
      mounted = false;
    };
  }, [session]);

  // 3) toggleFavorite: accepts productId, optimistic UI update, then DB call
  const toggleFavorite = useCallback(
    async (productId) => {
      // get session (either prop or runtime)
      const currentSession =
        session ?? (await supabase.auth.getSession()).data?.session;
      const user = currentSession?.user;
      if (!user) {
        // not logged in
        window.location.href = "/authentication"; // or open your auth modal
        return;
      }

      const currentlyFavorited = favoritedIds.has(productId);

      // Optimistic update
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        if (currentlyFavorited) next.delete(productId);
        else next.add(productId);
        return next;
      });

      try {
        if (!currentlyFavorited) {
          // insert favourite
          const { error } = await supabase
            .from("wishlist")
            .insert([{ user_id: user.id, product_id: productId }]);
          toast.info("Added to wishlist", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          });

          if (error) throw error;
        } else {
          // delete favourite
          const { error } = await supabase
            .from("wishlist")
            .delete()
            .match({ user_id: user.id, product_id: productId });
          toast.info("Removed from wishlist", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
          });
          if (error) throw error;
        }

        // success, UI already updated
      } catch (err) {
        console.error("Toggle favorite failed:", err);
        // rollback optimistic update
        setFavoritedIds((prev) => {
          const next = new Set(prev);
          if (currentlyFavorited) next.add(productId);
          else next.delete(productId);
          return next;
        });
        alert("Could not update wishlist. Please try again.");
      }
    },
    [favoritedIds, session]
  );

  // small utility: get product image attr safely (mainAngle vs main_angle)
  const getImage = (p) =>
    p.mainAngle ||
    p.main_angle ||
    p.main_angle ||
    p.main_angle_url ||
    p.main_angle_url ||
    p.main_angle_src ||
    p.main_angle_src ||
    p.main_angle_file ||
    p.main_angle_file ||
    p.main_angle;

  // ---------- PRICE HELPERS ----------
  const parseNumber = (v) => {
    if (v === undefined || v === null || v === "") return NaN;
    return Number(v);
  };

  const formatPrice = (value) =>
    `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const computeSale = (item) => {
    // determine base price (support price, price_cents)
    let base = parseNumber(item.price);
    if (isNaN(base) && item.price_cents) base = Number(item.price_cents) / 100;
    if (isNaN(base)) base = 0;

    // look for explicit sale_price
    let sale = null;
    if (!isNaN(parseNumber(item.sale_price))) {
      sale = parseNumber(item.sale_price);
    } else if (!isNaN(parseNumber(item.discount_percent))) {
      const pct = parseNumber(item.discount_percent);
      sale = base * (1 - pct / 100);
    } else if (!isNaN(parseNumber(item.discount))) {
      const d = parseNumber(item.discount);
      // if discount looks like percent (<=100) treat as percent
      if (d > 0 && d <= 100) sale = base * (1 - d / 100);
      else sale = base - d;
    }

    // sanitize sale value
    if (sale !== null && (!isFinite(sale) || sale >= base)) sale = null;
    return {
      base: Number(base),
      sale: sale === null ? null : Number(sale),
    };
  };

  // Render
  if (loadingProducts) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <p className="text-gray-500">Loading products…</p>
      </div>
    );
  }

  // If products array is empty
  if (!products || products.length === 0) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <p className="text-gray-500">No products available.</p>
      </div>
    );
  }

  return (
    <div className="w-full justify-center py-4 relative flex items-center">
      <div className="w-[90%]">
        <div
          ref={prevRef}
          className="absolute top-[30%] left-0 w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-200 hover:cursor-pointer p-2 z-50"
        >
          <img
            src="/images/arrowleft.svg"
            alt="prev"
            className="w-full h-full"
          />
        </div>
        <div
          ref={nextRef}
          className="absolute top-[30%] right-0 w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-200 hover:cursor-pointer p-2 z-50"
        >
          <img
            src="/images/arrowright.svg"
            alt="next"
            className="w-full h-full"
          />
        </div>

        <Swiper
          modules={[Navigation, Pagination, Scrollbar, A11y, Autoplay]}
          spaceBetween={20}
          loop
          autoplay
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onBeforeInit={(swiper) => {
            // attach refs safely
            // this helps Swiper know about external navigation elements
            // (refs may be null on first render but Swiper will pick them up)
            try {
              // eslint-disable-next-line no-param-reassign
              swiper.params.navigation.prevEl = prevRef.current;
              // eslint-disable-next-line no-param-reassign
              swiper.params.navigation.nextEl = nextRef.current;
            } catch (e) {
              /* ignore */
            }
          }}
          pagination={{ clickable: true }}
          breakpoints={{
            320: { slidesPerView: 1 },
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 4 },
          }}
        >
          {products.slice(0, 12).map((item) => {
            const productImage =
              getImage(item) ||
              item.main_angle ||
              item.mainAngle ||
              item.mainAngleUrl;
            const imgSrc =
              productImage && productImage.startsWith("http")
                ? productImage
                : productImage
                ? `/images/${productImage}`
                : "https://via.placeholder.com/300";

            // compute sale/base
            const { base, sale } = computeSale(item);
            const isOnSale = sale !== null && sale < base;

            return (
              <SwiperSlide key={item.id} className="pb-8">
                <div className="flex flex-col space-y-10 relative hover:cursor-pointer p-2">
                  {/* Heart / Wishlist button */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation(); // prevents navigating to product page
                      toggleFavorite(item.id);
                    }}
                    className="absolute z-50 rounded-full bg-gray-50 hover:bg-gray-200 w-13 h-13 p-1 top-0 right-0 cursor-pointer"
                  >
                    {favoritedIds.has(item.id) ? (
                      <img
                        src="/images/heart-fill-svgrepo-com.svg"
                        alt="favorited"
                        className="w-full h-full object-cover animate-fade-in animate-duration-600 "
                      />
                    ) : (
                      <img
                        src="/images/heart.svg"
                        alt="add to wishlist"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Clickable area for image + name + brand + price */}
                  <div
                    onClick={() => navigate(`/product/${item.id}`)}
                    className="group"
                  >
                    {/* Image container */}
                    <div
                      className="w-[90%] shrink-0 relative rounded-md overflow-hidden mx-auto"
                      style={{ height: 300 }} // fixed height — keeps cards uniform
                    >
                      {item.angle2 ? (
                        <>
                          <img
                            src={imgSrc}
                            alt={item.name}
                            className="object-cover w-full h-full rounded-md block group-hover:hidden"
                          />
                          <img
                            src={
                              item.angle2 &&
                              (item.angle2.startsWith("http")
                                ? item.angle2
                                : `/images/${item.angle2}`)
                            }
                            alt={item.name}
                            className="object-cover w-full h-full rounded-md hidden group-hover:block"
                          />
                        </>
                      ) : (
                        <img
                          src={imgSrc}
                          alt={item.name}
                          className="object-cover w-full h-full rounded-md block"
                        />
                      )}
                    </div>

                    {/* Product meta */}
                    <div className="text-center md:text-left mt-2 md:mt-0 md:ml-4">
                      <h1 className="text-2xl font-bold">{item.name}</h1>
                      <h2 className="text-xl">{item.brand}</h2>

                      {/* Price display */}
                      <div className="mt-2">
                        {isOnSale ? (
                          <div className="flex items-baseline justify-center md:justify-start gap-3">
                            <span className="text-lg text-gray-400 line-through">
                              {formatPrice(base)}
                            </span>
                            <span className="text-xl font-bold text-red-600">
                              {formatPrice(sale)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-lg text-gray-600">
                            {formatPrice(base)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </div>
  );
}

export default SlideBar;
