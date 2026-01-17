// src/pages/Product.jsx
import React, { useState, useRef, useEffect } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import SlideBar from "../components/SlideBar";
import { supabase } from "../supabaseClient.js";
import { useCallback } from "react";
import { toast } from "react-toastify";

function Product() {
  const session = useOutletContext();
  const [angle, setAngle] = useState(0);
  const prevAngleRef = useRef(angle);
  const [favoritedIds, setFavoritedIds] = useState(new Set());
  const [loadingFavs, setLoadingFavs] = useState(false);
  const [currentproduct, setCurrentproduct] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const addTocart = useCallback(
    async (productId, size) => {
      if (!session) {
        alert("Please log in to add items to your cart.");
        return;
      }
      // const usableSize = size.toLowerCase()
      // console.log(currentproduct);
      const quantityAvailable = await currentproduct.quantity[size];
      // console.log(size)
      // console.log("size",quantityAvailable)
      // console.log("current",currentproduct.quantity)
      if (quantityAvailable <= 0) {
        alert("Selected size is out of stock. Please choose another size.");
        return;
      }

      try {
        // 1) Get or create user's cart
        let { data: cartRows, error: cartErr } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", session.user.id);

        if (cartErr) throw cartErr;

        let cartId;
        if (!cartRows || cartRows.length === 0) {
          // No cart yet — create one
          const { data: newCart, error: createErr } = await supabase
            .from("carts")
            .insert({ user_id: session.user.id })
            .select("id")
            .single();
          if (createErr) throw createErr;
          cartId = newCart.id;
        } else {
          cartId = cartRows[0].id;
        }

        // 2) Check if the cart item already exists (same product & size)
        const { data: existingItems, error: fetchErr } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", cartId)
          .eq("product_id", productId)
          .eq("size", size); // include size if you track it; remove if you don't

        if (fetchErr) throw fetchErr;

        if (existingItems && existingItems.length > 0) {
          // 3a) Item exists -> update quantity (+1)
          if (existingItems[0].quantity + 1 <= quantityAvailable) {
            // console.log(existingItems[0].quantity, quantityAvailable);
            const item = existingItems[0];
            const { error: updateErr } = await supabase
              .from("cart_items")
              .update({ quantity: (item.quantity || 0) + 1 })
              .eq("id", item.id);

            if (updateErr) throw updateErr;
            // optional: optimistic UI update hook here
            toast.success("Product Added", {
              position: "top-right",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "colored",
            });
          } else {
            alert(
              "Cannot add more of this item. Reached available stock limit."
            );
          }
        } else {
          // 3b) Item doesn't exist -> insert new with quantity = 1
          const { error: insertErr } = await supabase
            .from("cart_items")
            .insert([
              {
                product_id: productId,
                size: size,
                quantity: 1,
                cart_id: cartId,
              },
            ]);

          if (insertErr) throw insertErr;
          toast.success("Product Added", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
        }
      } catch (error) {
        console.error("Error adding to cart:", error);
        alert("Failed to add item to cart. Please try again.");
      }
    },
    [session, currentproduct]
  );

  // NEW: product state (replaces itemsData)

  // State for the sliders
  const [deliveryOpen, setDeliveryOpen] = useState(false); // Renamed for clarity
  const [descOpen, setDescOpen] = useState(false); // New state for Description
  const [policyOpen, setPolicyOpen] = useState(false); // New state for Policy

  const { id } = useParams(); // optional route param

  const [stock, setStock] = useState("xs");

  const renderStock = () => {
    const qty = currentproduct.quantity[stock];
    if (qty <= 0)
      return <span className="opacity-50 line-through">Out of Stock</span>;
    if (qty <= 8) return <span className="text-red-600">Only {qty} Left</span>;
    return <span>Currently {qty} Left</span>;
  };
  // session.user.is_admin
  // useEffect(() =>{
  //
  //console.log(session?.user)}
  // , [session])

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function loadProduct() {
      try {
        // Resolve session (use passed session or runtime)
        const currentSession =
          session ?? (await supabase.auth.getSession()).data?.session;
        const user = currentSession?.user;

        // Determine if current user is admin by checking users table is_admin column
        let isAdmin = false;
        if (user) {
          try {
            const { data: dbUser, error: dbErr } = await supabase
              .from("users")
              .select("is_admin")
              .eq("id", user.id)
              .single();
            if (!dbErr && dbUser) isAdmin = !!dbUser.is_admin;
          } catch (e) {
            console.warn("Error checking is_admin:", e);
            isAdmin = false;
          }
        }

        // If an id param exists, fetch that product, otherwise fetch most recent product
        if (id) {
          const { data, error } = await supabase
            .from("products")
            .select(
              `
              *,
              product_variants (*)
            `
            )
            .eq("id", id)
            .single();

          if (error) throw error;

          // If product exists but is not shown and user is not admin, treat as not found
          if (data && data.shown === false && !isAdmin) {
            if (mounted) setCurrentproduct(null);
            return;
          }

          if (!mounted) return;
          normalizeAndSet(data);
        } else {
          // fetch newest product as fallback
          let query = supabase
            .from("products")
            .select(
              `
              *,
              product_variants (*)
            `
            )
            .order("created_at", { ascending: false })
            .limit(1);

          // restrict to shown products for non-admins
          if (!isAdmin) query = query.eq("shown", true);

          const { data, error } = await query;

          if (error) throw error;
          if (!mounted) return;
          normalizeAndSet((data && data[0]) || null);
        }
      } catch (err) {
        console.error("Failed to load product:", err);
        if (mounted) setCurrentproduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProduct();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Normalize DB product to the shape your UI expects
  function normalizeAndSet(dbProduct) {
    if (!dbProduct) {
      setCurrentproduct(null);
      return;
    }

    // pick image field names flexibly (support mainAngle or main_angle)
    const mainAngle =
      dbProduct.mainAngle ||
      dbProduct.main_angle ||
      dbProduct.main_angle_url ||
      dbProduct.main_angle_src ||
      dbProduct.main_image ||
      dbProduct.mainImage ||
      "";

    const angle2 =
      dbProduct.angle2 || dbProduct.angle_2 || dbProduct.angle_2_url || "";
    const angle3 =
      dbProduct.angle3 || dbProduct.angle_3 || dbProduct.angle_3_url || "";
    const angle4 =
      dbProduct.angle4 || dbProduct.angle_4 || dbProduct.angle_4_url || "";

    // map variants into size array and quantity object
    const variants = dbProduct.product_variants || [];
    const sizeArr = variants.map((v) => v.size);
    const quantity = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };
    variants.forEach((v) => {
      const key = v.size ? v.size.toLowerCase() : null;
      if (key && Object.prototype.hasOwnProperty.call(quantity, key)) {
        quantity[key] = Number(v.stock || 0);
      } else if (key) {
        // if other sizes exist, just set on the object
        quantity[key] = Number(v.stock || 0);
      }
    });

    const normalized = {
      id: dbProduct.id,
      name: dbProduct.name,
      brand: dbProduct.brand,
      price: dbProduct.price,
      description: dbProduct.description,
      color: dbProduct.color,
      gender: dbProduct.gender,
      quality: dbProduct.quality,
      madeIn: dbProduct.made_in || dbProduct.madeIn || dbProduct.made,
      mainAngle,
      angle2,
      angle3,
      angle4,
      size: sizeArr.length > 0 ? sizeArr : ["XS", "S", "M", "L", "XL", "XXL"], // fallback sizes
      quantity,
      // include raw dbProduct for anything else you might need
      raw: dbProduct,
    };

    setCurrentproduct(normalized);
  }

  // if loading, show a placeholder identical to layout behavior (small message)
  if (loading) {
    return (
      <main className="mt-10">
        <div className="w-full px-10 py-5 flex min-h-screen items-center justify-center">
          <p className="text-gray-500">Loading product...</p>
        </div>
      </main>
    );
  }

  // if product not found
  if (!currentproduct) {
    return (
      <main className="mt-10">
        <div className="w-full px-10 py-5 flex min-h-screen items-center justify-center">
          <p className="text-gray-500">Product not found.</p>
        </div>
      </main>
    );
  }

  // rest of your UI remains exactly the same, using currentproduct
  const angleMap = {
    0: currentproduct.mainAngle,
    1: currentproduct.angle2,
    2: currentproduct.angle3,
    3: currentproduct.angle4,
  };

  const colorClasses = {
    Black: "text-black",
    White: "text-black/40",
    Red: "text-red-800",
    Blue: "text-blue-800",
    Green: "text-green-800",
  };

  const currentImage = angleMap[angle] || currentproduct.mainAngle;

  const handleHoverStart = (hoverVal) => {
    prevAngleRef.current = prevAngleRef.current ?? angle;
    setAngle(hoverVal);
  };

  const handleHoverEnd = () => {
    setAngle(prevAngleRef.current);
  };

  const handleClick = (val) => {
    setAngle(val);
    prevAngleRef.current = val;
  };

  const thumbs = [
    { src: currentproduct.mainAngle },
    { src: currentproduct.angle2 },
    { src: currentproduct?.angle3 },
    { src: currentproduct?.angle4 },
  ];

  // compute discount-aware prices (use raw.discount if present)
  const rawPrice = Number(currentproduct.price ?? 0);
  const discount = Number(currentproduct.raw?.discount ?? 0) || 0;
  const discountedPrice = (rawPrice * (1 - discount / 100)).toFixed(2);

  // ---- NEW: predictable size sorting (XS -> S -> M -> L -> XL -> XXL) ----
  const sortedSizes = (() => {
    if (!currentproduct?.size || !Array.isArray(currentproduct.size)) return [];
    // ordering map (lowercase keys)
    const order = { xs: 0, s: 1, m: 2, l: 3, xl: 4, xxl: 5, "2xl": 5 };
    // produce unique sizes preserving original casing where possible
    const unique = Array.from(
      new Set(currentproduct.size.map((s) => String(s).trim()))
    );
    unique.sort((a, b) => {
      const na = String(a).toLowerCase();
      const nb = String(b).toLowerCase();
      const ia = Object.prototype.hasOwnProperty.call(order, na)
        ? order[na]
        : 99;
      const ib = Object.prototype.hasOwnProperty.call(order, nb)
        ? order[nb]
        : 99;
      if (ia !== ib) return ia - ib;
      // fallback: alphabetical if both unknown or same rank
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });
    return unique;
  })();

  return (
    <main className="mt-10">
      <section>
        <div className="w-full px-4 md:px-10 py-5 flex flex-col md:flex-row min-h-screen gap-6">
          {/* Left Side: Images (mobile: full width on top, desktop: left column) */}
          <div className="md:w-1/2 w-full flex flex-col md:flex-row items-start md:items-center">
            <div className="md:w-[20%] w-full flex md:flex-col flex-row md:space-y-4 space-x-3 md:space-x-0 overflow-x-auto md:overflow-visible pb-2">
              {thumbs.map(
                (t, i) =>
                  t.src && (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      aria-label={`View angle ${i}`}
                      className={`hover:cursor-pointer border border-black/40 focus:border-black/80 rounded-2xl p-1 flex items-center justify-center md:w-30 md:h-30 w-24 h-24 ${
                        angle === i ? "border-black/80!" : ""
                      }`}
                      onPointerEnter={() => handleHoverStart(i)}
                      onPointerLeave={handleHoverEnd}
                      onFocus={() => handleHoverStart(i)}
                      onBlur={handleHoverEnd}
                      onClick={() => handleClick(i)}
                    >
                      <img
                        className="object-contain w-full h-full"
                        src={`${t.src}`}
                        alt={""}
                      />
                    </div>
                  )
              )}
            </div>

            <div className="flex-1 md:h-180 h-64 relative flex items-center justify-center bg-gray-50 rounded-2xl overflow-hidden">
              <img
                className="w-full h-full object-cover"
                src={`${currentImage}`}
                alt={currentproduct.name}
              />
            </div>
          </div>

          {/* Right Side: Details (mobile: below images, desktop: right column) */}
          <div className="md:w-1/2 w-full md:ml-20 rounded-2xl mt-2 md:mt-20 p-4 md:p-0">
            <div className="w-full space-y-6 flex flex-col items-start">
              <div className="w-full md:w-[70%] flex justify-between items-start">
                <h1 className="text-3xl font-black text-black">
                  {currentproduct.name}
                </h1>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(currentproduct.id);
                  }}
                  className="bg-gray-50 hover:bg-gray-200 transition duration-500 w-11 h-11 rounded-full p-2 hover:cursor-pointer flex items-center justify-center"
                >
                  {favoritedIds.has(currentproduct.id) ? (
                    <img
                      src="/images/heart-fill-svgrepo-com.svg"
                      alt="favorited"
                      className="w-full h-full object-cover animate-fade-in animate-duration-600"
                    />
                  ) : (
                    <img
                      src="/images/heart.svg"
                      alt="add to wishlist"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
              <h2 className="text-xl font-semibold text-black">
                By {currentproduct.brand}
              </h2>

              {/* Price display: show before & after sale when discount > 0 */}
              {discount > 0 ? (
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xl line-through text-gray-500">
                    ${rawPrice.toFixed(2)}
                  </h3>
                  <h3 className="text-3xl font-bold text-red-400">
                    ${discountedPrice}
                  </h3>
                  <span className="text-sm text-green-600 font-semibold">
                    {discount}% off
                  </span>
                </div>
              ) : (
                <h3 className="text-3xl font-bold text-red-400">
                  USD {currentproduct.price.toFixed(2)}
                </h3>
              )}

              <select
                className="w-full md:w-[60%] p-2 rounded-xl border-2 border-black/60 text-xl text-black"
                name="Size"
                onChange={(e) => {
                  const selectedSize = e.target.value;
                  setStock(selectedSize.toLowerCase());
                  // console.log("Selected size:", selectedSize);
                }}
              >
                {sortedSizes.map((i) => (
                  <option key={i} value={i}>
                    {`${i.padEnd(4, " ")}   |   ${
                      currentproduct.quantity[i.toLowerCase()]
                    } left`}
                  </option>
                ))}
              </select>

              <h1 className="text-lg font-bold">Key Details:</h1>
              <div className="w-full md:w-[60%] flex space-y-5 flex-col ">
                <div className="flex w-full justify-between">
                  <h1
                    className={`text-lg font-semibold text-black ${
                      currentproduct.color != "white"
                        ? colorClasses[currentproduct.color]
                        : "text-black"
                    }`}
                  >
                    ● Color: {currentproduct.color}
                  </h1>
                  <h1 className="text-lg font-semibold text-yellow-600">
                    ● Gender: {currentproduct.gender}
                  </h1>
                </div>
                <div className="flex w-full justify-between">
                  <h1 className="text-lg font-semibold text-orange-700">
                    ● Quality: {currentproduct.quality}
                  </h1>
                  <h1 className="text-lg font-semibold text-blue-700">
                    ● Made in: {currentproduct.madeIn}
                  </h1>
                </div>
              </div>

              <div className="w-full flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    addTocart(currentproduct.id, stock.toLowerCase());
                  }}
                  className="w-full md:w-[40%] bg-linear-to-b from-black via-black to-gray-500 hover:from-black hover:via-black hover:to-gray-400 hover:cursor-pointer transition duration-300 text-white h-14 rounded-full flex items-center justify-center text-2xl font-bold p-2"
                >
                  <button className="hover:cursor-pointer w-full">
                    Add to bag
                  </button>
                </div>
                <h1 className="text-xl font-bold text-black/80">
                  {renderStock()}
                </h1>
              </div>

              <div className="w-full space-y-4">
                <div className="px-0 md:px-2 space-y-4">
                  {/* 1. DELIVERY DETAILS SLIDER */}
                  <div
                    onClick={() => setDeliveryOpen(!deliveryOpen)}
                    className="cursor-pointer flex items-center justify-between w-full md:w-[70%] bg-gradient-to-b from-gray-600 via-gray-600 to-gray-800 text-white rounded-2xl font-bold p-3 transition-transform hover:scale-[1.01]"
                  >
                    <div className="flex items-center space-x-3">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-12 h-12"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M16.5 6H3V17.25H3.375H4.5H4.52658C4.70854 18.5221 5.80257 19.5 7.125 19.5C8.44743 19.5 9.54146 18.5221 9.72342 17.25H15.0266C15.2085 18.5221 16.3026 19.5 17.625 19.5C18.9474 19.5 20.0415 18.5221 20.2234 17.25H21.75V12.4393L18.3107 9H16.5V6ZM16.5 10.5V14.5026C16.841 14.3406 17.2224 14.25 17.625 14.25C18.6721 14.25 19.5761 14.8631 19.9974 15.75H20.25V13.0607L17.6893 10.5H16.5ZM15 15.75V9V7.5H4.5V15.75H4.75261C5.17391 14.8631 6.07785 14.25 7.125 14.25C8.17215 14.25 9.07609 14.8631 9.49739 15.75H15ZM17.625 18C17.0037 18 16.5 17.4963 16.5 16.875C16.5 16.2537 17.0037 15.75 17.625 15.75C18.2463 15.75 18.75 16.2537 18.75 16.875C18.75 17.4963 18.2463 18 17.625 18ZM8.25 16.875C8.25 17.4963 7.74632 18 7.125 18C6.50368 18 6 17.4963 6 16.875C6 16.2537 6.50368 15.75 7.125 15.75C7.74632 15.75 8.25 16.2537 8.25 16.875Z"
                          fill="#ffffff"
                        />
                      </svg>
                      <h3 className="text-lg">Delivery Details</h3>
                    </div>
                    <div
                      className={`p-1 rounded-full transition-transform duration-300 ${
                        deliveryOpen ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-8 h-8"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 5V19M12 19L6 13M12 19L18 13"
                          stroke="#ffffff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <div
                    className={`w-full md:w-[70%] overflow-hidden transition-[max-height,opacity,padding] duration-500 ease-in-out ${
                      deliveryOpen
                        ? "max-h-96 opacity-100 py-4"
                        : "max-h-0 opacity-0 py-0"
                    }`}
                  >
                    <div className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100">
                      <h1 className="text-lg font-medium text-black mb-1">
                        ● Time Estimate: 3-5 Business Days
                      </h1>
                      <h1 className="text-lg font-medium text-black mb-2">
                        ● Price: $10 - $30 (Depending on service)
                      </h1>
                      <p className="text-sm text-gray-500">
                        Fast shipping available at checkout.
                      </p>
                    </div>
                  </div>

                  {/* 2. DESCRIPTION SLIDER */}
                  <div className="mt-4">
                    <div
                      onClick={() => setDescOpen(!descOpen)}
                      className="w-full md:w-[70%] text-black border-b border-gray-500 flex justify-between items-center cursor-pointer pb-2 hover:bg-gray-50 transition-colors"
                    >
                      <h1 className="text-xl font-bold">Description</h1>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-12 h-12 transition-transform duration-300 ${
                          descOpen ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g
                          id="SVGRepo_tracerCarrier"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></g>
                        <g id="SVGRepo_iconCarrier">
                          <path
                            d="M19 9L14 14.1599C13.7429 14.4323 13.4329 14.6493 13.089 14.7976C12.7451 14.9459 12.3745 15.0225 12 15.0225C11.6255 15.0225 11.2549 14.9459 10.9109 14.7976C10.567 14.6493 10.2571 14.4323 10 14.1599L5 9"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </g>
                      </svg>
                    </div>
                    {/* Sliding Content */}
                    <div
                      className={`w-full md:w-[70%] overflow-hidden transition-all duration-500 ease-in-out ${
                        descOpen
                          ? "max-h-96 opacity-100 py-4"
                          : "max-h-0 opacity-0 py-0"
                      }`}
                    >
                      <p className="text-gray-700 leading-relaxed">
                        {/* Fallback text if description isn't in data */}
                        {currentproduct.description ||
                          "Designed for ultimate comfort and style, this piece features high-quality fabric that endures through seasons. Perfect for casual outings or semi-formal events."}
                      </p>
                    </div>
                  </div>

                  {/* 3. RETURN POLICY SLIDER */}
                  <div className="mt-4">
                    <div
                      onClick={() => setPolicyOpen(!policyOpen)}
                      className="w-full md:w-[70%] text-black border-b border-gray-500 flex justify-between items-center cursor-pointer pb-2 hover:bg-gray-50 transition-colors"
                    >
                      <h1 className="text-xl font-bold">Returning Policy</h1>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-12 h-12 transition-transform duration-300 ${
                          policyOpen ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g
                          id="SVGRepo_tracerCarrier"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></g>
                        <g id="SVGRepo_iconCarrier">
                          <path
                            d="M19 9L14 14.1599C13.7429 14.4323 13.4329 14.6493 13.089 14.7976C12.7451 14.9459 12.3745 15.0225 12 15.0225C11.6255 15.0225 11.2549 14.9459 10.9109 14.7976C10.567 14.6493 10.2571 14.4323 10 14.1599L5 9"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </g>
                      </svg>
                    </div>
                    {/* Sliding Content */}
                    <div
                      className={`w-full md:w-[70%] overflow-hidden transition-all duration-500 ease-in-out ${
                        policyOpen
                          ? "max-h-96 opacity-100 py-4"
                          : "max-h-0 opacity-0 py-0"
                      }`}
                    >
                      <ul className="list-disc pl-5 text-gray-700 space-y-1">
                        <li>Free returns within 30 days.</li>
                        <li>Items must be unworn and tags attached.</li>
                        <li>Refunds processed within 5-7 business days.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="px-6 md:px-20">
        <h1 className="text-4xl font-bold mb-10">Recommended!</h1>

        <SlideBar />
      </section>
      <section className="px-6 md:px-20">
        <h1 className="text-4xl font-bold mb-10">Popular Products</h1>

        <SlideBar popular={true} />
      </section>
      <section>
        <div className="flex flex-col md:flex-row md:space-x-20 w-full md:w-[70%] mt-10 mb-20 border-t-gray-600 m-auto items-center md:items-start p-6 md:p-0">
          <div className="w-full md:w-[25%] flex flex-col space-y-6 text-center items-center justify-center">
            <img
              className="w-20 h-20"
              src="/images/order-1-svgrepo-com.svg"
              alt=""
            />
            <h1 className="text-lg text-gray-700 font-semibold">
              Order many items very quickly and easily
            </h1>
          </div>
          <img
            className="w-12 h-12 hidden md:block"
            src="/images/arrowRight.svg"
            alt=""
          />
          <div className="w-full md:w-[25%] flex flex-col space-y-6 text-center items-center justify-center">
            <img
              className="w-20 h-20"
              src="/images/shipping-car-svgrepo-com.svg"
              alt=""
            />
            <h1 className="text-lg text-gray-700 font-semibold">
              Very quick and smooth shipping to your house
            </h1>
          </div>
          <img
            className="w-12 h-12 hidden md:block"
            src="/images/arrowRight.svg"
            alt=""
          />
          <div className="w-full md:w-[25%] flex flex-col space-y-6 text-center items-center justify-center">
            <img
              className="w-20 h-20"
              src="/images/joy-joyful-enjoy-svgrepo-com.svg"
              alt=""
            />
            <h1 className="text-lg text-gray-700 font-semibold">
              Enjoy your items with the option to refund if needed
            </h1>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Product;
