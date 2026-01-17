import React, { useState } from "react";
import ProductsPages from "../components/ProductsPages";
import { Tag, Tags } from "lucide-react";
import ProductsTags from "../components/ProductsTags";
import { useSearchParams } from "react-router-dom";

function ProductsLayout() {
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  // mobile filter panel state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <main>
      <section className="px-2 lg:px-10 xl:pl-30 xl:pr-20 mt-10">
        {/* Desktop layout: sidebar + content */}
        <div className="hidden md:flex space-x-10">
          <aside className="sticky top-20 mb-10 h-[85vh] w-[30%] p-2 lg:p-10 bg-neutral-50  space-y-5 overflow-auto rounded-2xl flex-col">
            <ProductsTags
              setSelectedTags={setSelectedTags}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
            />
          </aside>

          <div className="flex w-[70%] flex-col mb-10">
            <ProductsPages searchParams={searchParams} />
          </div>
        </div>

        {/* Mobile layout: filter button + content (full width) */}
        <div className="md:hidden flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-semibold">Products</h2>

            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-200 shadow-sm"
              aria-label="Open filters"
            >
              <Tag className="w-5 h-5" />
              <span className="text-sm font-medium">Filters</span>
            </button>
          </div>

          {/* Optionally show a compact summary of active filters on mobile */}
          <div className="px-2">
            <div className="flex gap-2 overflow-x-auto py-1">
              {Array.from(searchParams.keys()).length === 0 ? (
                <div className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-600">
                  No filters
                </div>
              ) : (
                // render current params as small pills
                Array.from(new Set(searchParams.toString().split("&").map((p) => p)))
                  .filter(Boolean)
                  .map((raw) => {
                    // raw looks like key=value or key=val1&key=val2 etc, so we show raw for simplicity
                    return (
                      <div
                        key={raw}
                        className="px-3 py-1 rounded-full bg-indigo-50 text-sm text-indigo-700 whitespace-nowrap"
                      >
                        {raw.replace(/%2C/g, ",")}
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Products list full width on mobile */}
          <div className="px-2">
            <ProductsPages searchParams={searchParams} />
          </div>
        </div>

        {/* Mobile slide-up panel for filters */}
        {mobileFiltersOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end"
            role="dialog"
            aria-modal="true"
          >
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileFiltersOpen(false)}
            />

            {/* slide-up panel */}
            <div className="relative w-full bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Tags className="w-6 h-6 text-gray-700" />
                  <h3 className="text-lg font-semibold">Filters</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMobileFiltersOpen(false);
                    }}
                    className="text-sm text-gray-600 px-3 py-1 rounded-md hover:bg-gray-100"
                    aria-label="Close filters"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-4">
                <ProductsTags
                  setSelectedTags={setSelectedTags}
                  searchParams={searchParams}
                  setSearchParams={(params) => {
                    // ensure URL updates and optionally close panel when user finishes
                    setSearchParams(params);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default ProductsLayout;
