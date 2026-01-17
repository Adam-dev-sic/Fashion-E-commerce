import React, { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { useNavigate } from "react-router-dom";
import SideDrawer from "../components/SideDraw";
import { Link } from "react-router-dom";

const NAV_DATA = {
  Women: {
    image:
      "https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?q=80&w=1000&auto=format&fit=crop",
    categories: [
      {
        title: "Clothing",
        items: [
          "Coats & Jackets",
          "Dresses",
          "Jeans",
          "Jumpsuits",
          "Pants",
          "Lingerie",
          "Sweaters",
          "Swimwear",
          "Tops",
        ],
      },
      {
        title: "Shoes",
        items: ["Boots", "Flats", "Heels", "Sneakers", "Sandals", "Wedges"],
      },
      {
        title: "Bags",
        items: ["Backpacks", "Clutches", "Handbags", "Shoulder Bags", "Totes"],
      },
      {
        title: "Accessories",
        items: ["Belts", "Eyewear", "Jewelry", "Scarves", "Hats", "Watches"],
      },
      {
        title: "Featured Brands",
        items: ["Gucci", "Chanel", "Nike", "Adidas", "Puma"],
      },
    ],
  },

  Men: {
    image:
      "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1000&auto=format&fit=crop",
    categories: [
      {
        title: "Clothing",
        items: ["Jackets", "Suits", "Jeans", "T-Shirts", "Pants", "Shorts"],
      },
      {
        title: "Shoes",
        items: ["Sneakers", "Boots", "Dress Shoes", "Loafers"],
      },
      {
        title: "Accessories",
        items: ["Watches", "Belts", "Wallets", "Sunglasses", "Caps"],
      },
      {
        title: "Featured Brands",
        items: ["Nike", "Adidas", "Reebok", "Puma", "New Balance"],
      },
    ],
  },

  Collections: {
    // replaced Black Friday with Collections (seasonal / curated collections)
    image:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1000&auto=format&fit=crop",
    categories: [
      { title: "New", items: ["All New", "New Arrivals", "Just In"] },
      {
        title: "Style",
        items: ["Streetwear", "Minimal", "Workwear", "Athleisure"],
      },
      { title: "Shop by", items: ["Best Sellers", "Editor Picks", "Trending"] },
    ],
  },

  Sales: {
    image:
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000&auto=format&fit=crop",
    categories: [
      {
        title: "Clearance",
        items: ["Last Chance", "On Sale", "Clearance Picks"],
      },
      { title: "Deals", items: ["Under $20", "Under $50", "Under $100"] },
      { title: "Seasonal", items: ["Summer Sale", "Winter Clearance"] },
    ],
  },
};

function Navbar({ session }) {
  const isMobile = useMediaQuery({ maxWidth: 1024 });
  const navigate = useNavigate();

  const [hoveredNav, setHoveredNav] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategory, setMobileCategory] = useState(null);

  // when opening a drawer from header or mobile menu, ensure mobile menu is closed
  const openDrawer = (name) => {
    setMobileMenuOpen(false);
    setActiveDrawer(name);
  };

  const handleProfileClick = () => {
    if (session) {
      // CLOSE mobile menu first so it doesn't overlap with the side drawer on small screens
      setMobileMenuOpen(false);
      setActiveDrawer("profile");
    } else {
      setMobileMenuOpen(false);
      navigate("/authentication");
    }
  };

  useEffect(() => {
    if (hoveredNav || activeDrawer || mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [hoveredNav, activeDrawer, mobileMenuOpen]);

  // Helper: navigate to /products with given params object
  const goToProducts = (paramsObj = {}) => {
    const params = new URLSearchParams();

    // paramsObj can contain: tags (string or array), brand, gender, price (min-max), sale (boolean/string)
    if (paramsObj.tags) {
      if (Array.isArray(paramsObj.tags)) {
        paramsObj.tags.forEach((t) => params.append("tags", t));
      } else {
        params.append("tags", paramsObj.tags);
      }
    }
    if (paramsObj.brand) params.append("brand", paramsObj.brand);
    if (paramsObj.gender) params.append("gender", paramsObj.gender);
    if (paramsObj.price) params.append("price", paramsObj.price); // format: "min-max"
    if (paramsObj.sale !== undefined)
      params.append("sale", String(paramsObj.sale));
    // Keep other params extensible
    setMobileMenuOpen(false);
    setActiveDrawer(null);
    setHoveredNav(null);
    setMobileCategory(null);
    navigate(`/products?${params.toString()}`);
  };

  // Map click on a nav item (topKey = Women/Men/Collections/Sales)
  const handleMenuItemClick = (topKey, categoryTitle, item) => {
    // Normalize item and build params
    const top = topKey;
    const label = item;

    // Quick heuristics:
    // - If item matches brand list -> set brand
    // - If under Sales and contains "Under $X" -> price filter
    // - If contains "Sale" or "Clearance" or "Last Chance" -> sale=true
    // - Otherwise set tags = item, and gender = top if top is Women or Men

    const brandCandidates = [
      "Gucci",
      "Chanel",
      "Nike",
      "Adidas",
      "Puma",
      "Reebok",
      "New Balance",
      "Fendi",
      "Prada",
      "Balenciaga",
    ].map((b) => b.toLowerCase());

    const low = label.toLowerCase();

    // brand?
    if (brandCandidates.includes(low)) {
      return goToProducts({ brand: label });
    }

    // sales / price parsing
    if (top === "Sales") {
      if (low.includes("under $") || low.match(/under\s*\$\d+/i)) {
        // parse number after $
        const m = label.match(/\$(\d{1,6})/);
        if (m) {
          const max = Number(m[1]);
          return goToProducts({ price: `0-${max}`, sale: true });
        }
      }
      if (
        low.includes("on sale") ||
        low.includes("clearance") ||
        low.includes("last chance")
      ) {
        return goToProducts({ sale: true });
      }
      if (low.includes("summer") || low.includes("winter")) {
        // seasonal sales - show sale + tag
        return goToProducts({ sale: true, tags: label });
      }
    }

    // Collections special cases
    if (top === "Collections") {
      if (
        low.includes("new") ||
        low.includes("arrivals") ||
        low.includes("just in")
      ) {
        return goToProducts({ tags: "New" });
      }
      if (
        low.includes("streetwear") ||
        low.includes("workwear") ||
        low.includes("athleisure") ||
        low.includes("minimal")
      ) {
        return goToProducts({ tags: label });
      }
      if (
        low.includes("best sellers") ||
        low.includes("trending") ||
        low.includes("editor")
      ) {
        return goToProducts({ tags: "Trending" });
      }
    }

    // Default: treat as category/tag; if top is Women/Men set gender too
    const params = { tags: label };
    if (top === "Women" || top === "Men") params.gender = top;
    goToProducts(params);
  };

  // 1. Desktop Mega Menu
  const MegaMenu = ({ type }) => {
    const data = NAV_DATA[type];
    if (!data) return null;

    return (
      <div
        className="absolute top-full left-0 w-full bg-white shadow-xl z-50 flex border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300"
        style={{ height: "70vh" }}
        onMouseEnter={() => setHoveredNav(type)}
        onMouseLeave={() => setHoveredNav(null)}
      >
        <div className="w-3/4 p-12 overflow-y-auto">
          <div className="grid grid-cols-4 gap-8">
            {data.categories.map((cat, idx) => (
              <div key={idx} className="flex flex-col space-y-4">
                <h3 className="font-bold text-lg text-black uppercase tracking-wider mb-2">
                  {cat.title}
                </h3>
                <ul className="space-y-2 text-gray-600">
                  {cat.items.map((item, i) => (
                    <li
                      key={i}
                      onClick={() => handleMenuItemClick(type, cat.title, item)}
                      className="hover:text-black hover:underline cursor-pointer transition-colors text-sm"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleMenuItemClick(type, cat.title, item);
                      }}
                    >
                      {item}
                    </li>
                  ))}
                  <li
                    className="font-semibold text-black mt-2 cursor-pointer hover:underline"
                    onClick={() => {
                      // View all -> show category (title) as tag
                      // For Clothing category, treat generic "Clothing" as tag
                      const viewAllTag =
                        cat.title === "Featured Brands" ? null : cat.title;
                      if (viewAllTag) {
                        handleMenuItemClick(type, cat.title, viewAllTag);
                      } else {
                        // if Featured Brands -> open products without extra tags (or go to brand listing)
                        goToProducts({});
                      }
                    }}
                  >
                    View All
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="w-1/4 h-full relative">
          <div className="absolute inset-0 bg-black/10 z-10"></div>
          <img
            src={data.image}
            alt={type}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-10 left-10 z-20 text-white">
            <h2 className="text-3xl font-black uppercase mb-2">New Arrivals</h2>
            <button
              onClick={() => goToProducts({ tags: "New" })}
              className="bg-white text-black px-6 py-2 font-semibold hover:bg-gray-200 transition"
            >
              Shop New
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 2. Mobile Menu
  const MobileMenu = () => {
    return (
      <div
        className={`fixed inset-0 z-[550] bg-white transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-bold text-lg uppercase">
            {mobileCategory ? (
              <button
                onClick={() => setMobileCategory(null)}
                className="flex items-center space-x-2 text-gray-600"
              >
                <span>← Back</span>
              </button>
            ) : (
              "Menu"
            )}
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-2xl">
            &times;
          </button>
        </div>

        <div className="h-full overflow-y-auto pb-20 p-4">
          {!mobileCategory && (
            <div className="flex flex-col space-y-6 animate-in slide-in-from-left duration-200">
              {Object.keys(NAV_DATA).map((key) => (
                <div
                  key={key}
                  onClick={() => setMobileCategory(key)}
                  className="flex justify-between items-center text-xl font-bold cursor-pointer border-b pb-2"
                >
                  <span
                    className={
                      key === "Collections" ? "text-indigo-600" : "text-black"
                    }
                  >
                    {key}
                  </span>
                  <span>→</span>
                </div>
              ))}

              <div className="mt-8 space-y-4 pt-8 border-t">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center space-x-3 w-full"
                >
                  <img src="/images/profile.svg" className="h-6 w-6" alt="" />
                  <span className="text-lg">
                    {session ? "My Account" : "Sign In / Register"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveDrawer("wishlist");
                  }}
                  className="flex items-center space-x-3 w-full"
                >
                  <img src="/images/heart.svg" className="h-6 w-6" alt="" />
                  <span className="text-lg">Wishlist</span>
                </button>
              </div>
            </div>
          )}

          {mobileCategory && NAV_DATA[mobileCategory] && (
            <div className="animate-in slide-in-from-right duration-200">
              <h2 className="text-2xl font-black mb-6 uppercase tracking-wider">
                {mobileCategory}
              </h2>

              <div className="w-full h-40 mb-6 rounded-lg overflow-hidden relative">
                <img
                  src={NAV_DATA[mobileCategory].image}
                  className="w-full h-full object-cover"
                  alt=""
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <span className="text-white font-bold border-2 border-white px-4 py-1">
                    SHOP ALL
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {NAV_DATA[mobileCategory].categories.map((cat, idx) => (
                  <div key={idx}>
                    <h3 className="font-bold text-gray-900 mb-3">
                      {cat.title}
                    </h3>
                    <ul className="pl-4 space-y-3 border-l-2 border-gray-100">
                      {cat.items.map((item, i) => (
                        <li
                          key={i}
                          className="text-gray-600 text-sm cursor-pointer"
                          onClick={() => {
                            handleMenuItemClick(
                              mobileCategory,
                              cat.title,
                              item
                            );
                            setMobileMenuOpen(false);
                          }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {hoveredNav && !isMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 top-20"
          onMouseEnter={() => setHoveredNav(null)}
        ></div>
      )}

      <SideDrawer
        activeDrawer={activeDrawer}
        setActiveDrawer={setActiveDrawer}
        session={session}
      />
      <MobileMenu />

      <header className="relative bg-white z-[500] w-full sticky top-0 border-b lg:border-none border-gray-100">
        <div className="px-4 lg:px-12 h-20 flex items-center justify-between">
          {isMobile ? (
            <button onClick={() => setMobileMenuOpen(true)} className="p-2">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          ) : (
            <div className="flex space-x-8 h-full items-center">
              {Object.keys(NAV_DATA).map((item) => (
                <div
                  key={item}
                  className="h-full flex items-center"
                  onMouseEnter={() => setHoveredNav(item)}
                >
                  <h1
                    className={`text-xl font-semibold cursor-pointer transition duration-200 border-b-2 ${
                      hoveredNav === item
                        ? "border-black"
                        : "border-transparent"
                    } ${
                      item === "Collections"
                        ? "text-indigo-600 font-bold"
                        : "text-black"
                    }`}
                    onClick={() => {
                      // Clicking top-level title routes to products with a sensible default
                      if (item === "Sales") {
                        goToProducts({ sale: true });
                      } else if (item === "Collections") {
                        goToProducts({ tags: "New" });
                      } else if (item === "Men") {
                        goToProducts({ gender: "Men" });
                      } else if (item === "Women") {
                        goToProducts({ gender: "Women" });
                      } else {
                        goToProducts({ tags: item });
                      }
                    }}
                  >
                    {item}
                  </h1>
                </div>
              ))}
            </div>
          )}

          <div
            className={`w-50 flex justify-center ${
              isMobile ? "absolute left-1/2 transform -translate-x-1/2" : ""
            }`}
          >
            <Link to="/">
              <img
                className="h-12 object-contain"
                src="/images/logo.png"
                alt="LOGO"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
              <span className="hidden text-2xl font-bold tracking-tighter">
                LOGO
              </span>
            </Link>
          </div>

          <div className="flex space-x-4 lg:space-x-6 items-center">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setActiveDrawer("search");
              }}
              className={`${
                isMobile
                  ? "p-2"
                  : "hidden lg:flex items-center bg-gray-100 rounded-full px-4 py-2 space-x-2 hover:bg-gray-200"
              }`}
            >
              <img
                src="/images/search.svg"
                className={`${isMobile ? "h-6 w-6" : "h-5 w-5"}`}
                alt="Search"
              />
              {!isMobile && <span className="text-sm font-medium">Search</span>}
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setActiveDrawer("wishlist");
              }}
              className="hidden lg:block opacity-80 hover:opacity-100"
            >
              <img src="/images/heart.svg" className="h-6 w-6" alt="Wishlist" />
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleProfileClick();
              }}
              className="hidden lg:block opacity-80 hover:opacity-100"
            >
              <img
                src="/images/profile.svg"
                className="h-6 w-6"
                alt="Profile"
              />
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setActiveDrawer("cart");
              }}
              className="opacity-80 hover:opacity-100 p-2"
            >
              <img src="/images/bag.svg" className="h-6 w-6" alt="Bag" />
            </button>
          </div>
        </div>

        {hoveredNav && !isMobile && <MegaMenu type={hoveredNav} />}
      </header>
    </>
  );
}

export default Navbar;
