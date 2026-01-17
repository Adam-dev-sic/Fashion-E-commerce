import React, { useState, useEffect } from "react";
import ReactPaginate from "react-paginate";
import { Link, useNavigate, useOutletContext } from "react-router-dom"; // Optional: if you want to link to product details
import { apiFetch } from "../utils/api";

export default function ProductsPages({ pageSize = 24, searchParams }) {
  // 1. State for data, loading, and errors
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const session = useOutletContext();
  const navigate = useNavigate();

  // 2. Pagination State
  const [currentPage, setCurrentPage] = useState(0);

  // Reset page when filters change so we show first page of new results
  useEffect(() => {
    setCurrentPage(0);
  }, [searchParams?.toString()]);

  // 3. Fetch Data from API on Mount / when searchParams changes
  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          `/api/products?${searchParams?.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token || ""}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        if (!mounted) return;
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;
        console.error("Error fetching products:", err);
        setError(err.message || "Unknown error");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      mounted = false;
    };
  }, [searchParams, session]);

  // 4. Pagination calculations (client-side)
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const start = currentPage * pageSize;
  const pageItems = products.slice(start, start + pageSize);

  // Loading and error UI
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 mt-10">
        <p>Error: {error}</p>
        <p>Make sure your backend server is running.</p>
      </div>
    );
  }

  // Helper to obtain a reliable image URL from product object
  const getImage = (product) => {
    // try many field names commonly used
    return (
      product.main_angle ||
      product.mainAngle ||
      product.main_image ||
      product.mainImage ||
      product.image ||
      product.image_url ||
      product.angle2 || // fallback if only alternative angle present
      "https://via.placeholder.com/400?text=No+Image"
    );
  };

  return (
    <>
      {/* Container to center and constrain width */}
      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-6">
        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 gap-y-8">
          {pageItems.map((product) => {
            const rawPrice = Number(product.price ?? 0);
            const discountPercent = Number(
              product.discount ?? product.raw_discount ?? 0
            );
            const hasDiscount = !isNaN(discountPercent) && discountPercent > 0;
            const discountedPrice = rawPrice * (1 - discountPercent / 100);

            const imgSrc = getImage(product);

            return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                aria-label={`View ${product.name}`}
              >
                <article
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition p-3 h-full flex flex-col"
                  role="group"
                >
                  {/* Image area */}
                  <div className="w-full h-40 sm:h-48 md:h-56 lg:h-64 bg-gray-50 rounded-md overflow-hidden flex items-center justify-center">
                    <img
                      src={imgSrc}
                      alt={product.name || "Product image"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          "https://via.placeholder.com/400?text=No+Image";
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="mt-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-base line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {product.brand}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="mt-3">
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-3">
                          <span className="text-sm text-gray-500 line-through">
                            ${rawPrice.toFixed(2)}
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            ${discountedPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-lg text-red-600 font-semibold">
                          ${rawPrice.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {products.length > 0 ? (
          <div className="mt-10">
            <ReactPaginate
              pageCount={pageCount}
              onPageChange={handlePageClick}
              forcePage={currentPage}
              containerClassName="flex gap-2 justify-center items-center"
              pageClassName="px-3 py-1 border rounded hover:bg-gray-100 transition"
              pageLinkClassName="block"
              activeClassName="bg-black"
              activeLinkClassName="text-white"
              previousLabel="Prev"
              nextLabel="Next"
              previousClassName="px-3 py-1 border rounded hover:bg-gray-100 cursor-pointer"
              nextClassName="px-3 py-1 border rounded hover:bg-gray-100 cursor-pointer"
              breakLabel="..."
            />
          </div>
        ) : (
          <div className="text-center mt-10 text-gray-500">
            No products found.
          </div>
        )}
      </div>
    </>
  );
}
