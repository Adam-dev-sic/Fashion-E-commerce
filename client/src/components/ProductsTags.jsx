import React, { useEffect, useState, useRef } from "react";
import Slider from "@mui/joy/Slider";
import { supabase } from "../supabaseClient";

/**
 * ProductsTags (updated)
 *
 * - Minimal changes from your original file.
 * - Adds a polished Sale toggle (uses URL param `sale=1` when ON).
 * - Clear Filters now removes `sale`.
 * - Current Filters shows "Sale: On Sale" when sale param present.
 * - Keeps slider DB read/write behavior as before.
 *
 * Paste this file over your existing ProductsTags component.
 */

function ProductsTags({ setSelectedTags, searchParams, setSearchParams }) {
  // state for DB-driven filter values
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [genders, setGenders] = useState([]);

  // slider state + config (from DB)
  const [value, setValue] = useState([200, 800]);
  const [sliderConfig, setSliderConfig] = useState({
    min: 0,
    max: 10000,
    step: 1,
  });

  // keep track of the DB row id (if exists) to update instead of inserting repeatedly
  const priceRowIdRef = useRef(null);
  // debounce timer ref for DB writes
  const debounceRef = useRef(null);

  // fetch all filter tables + slider settings once on mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          { data: catData, error: catErr },
          { data: brandData, error: brandErr },
          { data: colorData, error: colorErr },
          { data: sizeData, error: sizeErr },
          { data: genderData, error: genderErr },
          { data: priceData, error: priceErr },
        ] = await Promise.all([
          supabase.from("categories").select("*"),
          supabase.from("brands").select("*"),
          supabase.from("colors").select("*"),
          supabase.from("sizes").select("*"),
          supabase.from("genders").select("*"),
          // get latest price slider settings row (you can change ordering if needed)
          supabase
            .from("price_slider_settings")
            .select("*")
            .order("id", { ascending: false })
            .limit(1),
        ]);

        if (catErr) console.error("categories:", catErr);
        if (brandErr) console.error("brands:", brandErr);
        if (colorErr) console.error("colors:", colorErr);
        if (sizeErr) console.error("sizes:", sizeErr);
        if (genderErr) console.error("genders:", genderErr);
        if (priceErr) console.error("price_slider_settings:", priceErr);

        setCategories(catData ?? []);
        setBrands(brandData ?? []);
        setColors(colorData ?? []);
        setSizes((sizeData ?? []).map((s) => s.label ?? s.name ?? s));
        setGenders(genderData ?? []);

        // apply slider settings if present
        if (Array.isArray(priceData) && priceData.length > 0) {
          const row = priceData[0];
          const min = Number(row.min_price ?? row.min ?? 0);
          const max = Number(row.max_price ?? row.max ?? 10000);
          const step = Number(row.step ?? 1);
          setSliderConfig({ min, max, step });
          priceRowIdRef.current = row.id ?? null;

          // If there's a price param in the URL use it; otherwise set to full range
          const priceParam = searchParams.get("price");
          if (priceParam) {
            // parse "min-max"
            const parts = priceParam.split("-").map((p) => Number(p));
            if (parts.length === 2 && !parts.some(isNaN)) {
              setValue([parts[0], parts[1]]);
            } else {
              setValue([min, max]);
            }
          } else {
            setValue([min, max]);
          }
        } else {
          // no DB row: use defaults already in state
          const priceParam = searchParams.get("price");
          if (priceParam) {
            const parts = priceParam.split("-").map((p) => Number(p));
            if (parts.length === 2 && !parts.some(isNaN)) {
              setValue([parts[0], parts[1]]);
            } else {
              setValue([sliderConfig.min, sliderConfig.max]);
            }
          } else {
            setValue([sliderConfig.min, sliderConfig.max]);
          }
        }
      } catch (err) {
        console.error("Failed fetching filters/slider:", err);
      }
    };

    fetchAll();
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper: get array of values for a given param name
  const getParamValues = (key) => searchParams.getAll(key) || [];

  // ---- Tag handlers (toggle behaviour) ----
  // Add or remove tag value from URL params
  const handleAddTag = (type, tag) => {
    if (!tag) return;

    const current = getParamValues(type);
    const params = new URLSearchParams(searchParams.toString());

    if (current.includes(tag)) {
      // REMOVE the tag
      const filtered = current.filter((t) => t !== tag);
      params.delete(type);
      filtered.forEach((t) => params.append(type, t));
    } else {
      // ADD the tag
      params.append(type, tag);
    }

    setSearchParams(params);

    setSelectedTags?.({
      tags: params.getAll("tags"),
      brand: params.getAll("brand"),
      color: params.getAll("color"),
      size: params.getAll("size"),
      gender: params.getAll("gender"),
      sale: params.getAll("sale"),
      price: params.getAll("price"),
    });
  };

  // Remove a single tag (type + tag value) - kept for explicit removal via pill click
  const handleRemoveTag = (type, tag) => {
    const params = new URLSearchParams(searchParams.toString());
    const values = params.getAll(type).filter((v) => v !== tag);
    params.delete(type);
    values.forEach((v) => params.append(type, v));
    setSearchParams(params);

    setSelectedTags?.({
      tags: params.getAll("tags"),
      brand: params.getAll("brand"),
      color: params.getAll("color"),
      size: params.getAll("size"),
      gender: params.getAll("gender"),
      sale: params.getAll("sale"),
      price: params.getAll("price"),
    });
  };

  // ---- Sale toggle handler (use `sale=1` as ON) ----
  const handleToggleSale = () => {
    const params = new URLSearchParams(searchParams.toString());
    const saleCurrently = params.has("sale");
    if (saleCurrently) {
      params.delete("sale");
    } else {
      params.set("sale", "1");
    }
    setSearchParams(params);

    setSelectedTags?.({
      tags: params.getAll("tags"),
      brand: params.getAll("brand"),
      color: params.getAll("color"),
      size: params.getAll("size"),
      gender: params.getAll("gender"),
      sale: params.getAll("sale"),
      price: params.getAll("price"),
    });
  };

  useEffect(() => {
    console.log("current genders are", genders);
  }, [genders]);

  // Clear all filter params we control
  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tags");
    params.delete("brand");
    params.delete("color");
    params.delete("size");
    params.delete("gender");
    params.delete("price"); // clear price too
    params.delete("sale"); // clear sale
    // optionally keep other unrelated params (search, page, etc.)
    setSearchParams(params);

    setSelectedTags?.({
      tags: [],
      brand: [],
      color: [],
      size: [],
      genders: [],
      sale: [],
      price: [],
    });
    // reset slider visually to config min/max
    setValue([sliderConfig.min, sliderConfig.max]);
  };

  // Update slider settings in DB (debounced caller will call this)
  const updatePriceSettingsInDB = async (minPrice, maxPrice, step) => {
    try {
      const payload = {
        min_price: minPrice,
        max_price: maxPrice,
        step: step,
        updated_at: new Date().toISOString(),
      };

      if (priceRowIdRef.current) {
        const { error } = await supabase
          .from("price_slider_settings")
          .update(payload)
          .eq("id", priceRowIdRef.current);
        if (error) console.error("Failed updating price settings:", error);
      } else {
        const { data, error } = await supabase
          .from("price_slider_settings")
          .insert(payload)
          .select()
          .single();
        if (error) {
          console.error("Failed inserting price settings:", error);
        } else {
          priceRowIdRef.current = data?.id ?? null;
        }
      }
    } catch (err) {
      console.error("Error writing slider settings to DB:", err);
    }
  };

  // slider change (updates URL and schedules DB write)
  const handleSliderChange = (event, newValue) => {
    // newValue expected as [min, max]
    if (!Array.isArray(newValue) || newValue.length !== 2) return;

    const [newMin, newMax] = newValue;
    setValue(newValue);

    // update URL param "price" as "min-max"
    const params = new URLSearchParams(searchParams.toString());
    params.delete("price");
    params.append("price", `${newMin}-${newMax}`);
    setSearchParams(params);

    // optional callback to parent
    setSelectedTags?.({
      tags: params.getAll("tags"),
      brand: params.getAll("brand"),
      color: params.getAll("color"),
      size: params.getAll("size"),
      gender: params.getAll("gender"),
      sale: params.getAll("sale"),
      price: params.getAll("price"),
    });

    // debounce DB write so we don't spam updates while user drags
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updatePriceSettingsInDB(newMin, newMax, sliderConfig.step);
    }, 800); // 800ms debounce — changeable
  };

  // Compose current tags array for the top "Current Filters" UI
  const currentTagGroups = [
    { key: "tags", label: "Product Category", values: getParamValues("tags") },
    { key: "brand", label: "Product Brand", values: getParamValues("brand") },
    { key: "color", label: "Product Color", values: getParamValues("color") },
    { key: "size", label: "Product Size", values: getParamValues("size") },
    { key: "gender", label: "Selected Gender", values: getParamValues("gender") },
    { key: "price", label: "Price Range", values: getParamValues("price") },
    { key: "sale", label: "Sale", values: getParamValues("sale") },
  ];

  // convenience boolean for sale toggle UI
  const saleActive = searchParams.has("sale");

  return (
    <>
      <div className="space-y-5">
        <div className="flex justify-between w-full items-center">
          <h1 className="text-xl font-semibold text-black">Current Filters:</h1>
          <button
            onClick={clearAllFilters}
            className="text-sm hover:cursor-pointer font-medium text-gray-500 hover:text-indigo-600"
          >
            Clear Filters
          </button>
        </div>

        <div className="flex flex-wrap px-4 max-h-50 overflow-auto py-2 gap-2">
          {currentTagGroups.map((group) =>
            group.values.map((val) => {
              // Render sale nicely instead of showing "1"
              const displayValue =
                group.key === "sale" ? "On Sale" : group.label === "Price" ? `${val}` : val;
              return (
                <div
                  key={`${group.key}-${val}`}
                  onClick={() => handleRemoveTag(group.key, val)}
                  className="p-1.5 px-4 h-fit group relative border hover:line-through hover:cursor-pointer decoration-2 border-gray-200 rounded-md border-2 bg-linear-to-l from-stone-50 via-white to-stone-100"
                >
                  <h3 className="text-lg font-light text-gray-950">
                    <span className="font-bold">{group.label}: </span>
                    {displayValue}
                  </h3>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-5 mt-6">
        <div id="price">
          <h1 className="text-xl font-semibold text-black">Price Range:</h1>

          <Slider
            min={sliderConfig.min}
            max={sliderConfig.max}
            step={sliderConfig.step}
            value={value}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            color="neutral"
            marks={[
              { value: sliderConfig.min, label: `$${sliderConfig.min}` },
              {
                value: Math.round((sliderConfig.min + sliderConfig.max) / 2),
                label: `$${Math.round(
                  (sliderConfig.min + sliderConfig.max) / 2
                )}`,
              },
              { value: sliderConfig.max, label: `$${sliderConfig.max}` },
            ]}
          />

          {/* Sale toggle - nicer UI */}
          <div className="mt-5 flex items-center gap-3">
            <div
              role="button"
              aria-pressed={saleActive}
              onClick={handleToggleSale}
              className={`flex items-center gap-3 px-4 py-2 rounded-full transition-shadow cursor-pointer select-none
                ${
                  saleActive
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  saleActive ? "bg-white/20" : "bg-indigo-50 text-indigo-600"
                }`}
              >
                % 
              </div>
              <div className="text-sm font-medium">
                {saleActive ? "Showing Sale Items" : "Filter: On Sale"}
              </div>
            </div>

            {/* quick clear sale button (visible only when active) */}
            {saleActive && (
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("sale");
                  setSearchParams(params);
                  setSelectedTags?.({
                    tags: params.getAll("tags"),
                    brand: params.getAll("brand"),
                    color: params.getAll("color"),
                    size: params.getAll("size"),
                    gender: params.getAll("gender"),
                    sale: params.getAll("sale"),
                    price: params.getAll("price"),
                  });
                }}
                className="text-sm text-red-500 hover:underline"
              >
                Clear Sale
              </button>
            )}
          </div>
        </div>

        {/* Genders */}
        <h1 className="text-xl font-semibold text-black">Genders:</h1>
        <div className="w-full h-px bg-gray-400"></div>

        <div className="flex flex-col space-y-3">
          <div className="flex flex-wrap gap-4">
            {genders.map((c) => {
              const name = c.name;
              const isActive = getParamValues("gender").includes(name);
              return (
                <button
                  key={c.id}
                  onClick={() => handleAddTag("gender", name)}
                  className={`px-3 py-2 rounded-2xl hover:cursor-pointer border ${
                    isActive
                      ? "bg-indigo-100 border-indigo-400 hover:bg-indigo-50"
                      : "bg-gray-100 hover:bg-gray-200 "
                  }`}
                >
                  <span className="text-gray-700 font-medium">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <h1 className="text-xl font-semibold  text-black">Categories:</h1>
        <div className="w-full h-px bg-gray-400"></div>

        <div className="flex flex-col max-h-70 overflow-auto space-y-3">
          <div className="flex flex-wrap gap-4">
            {categories.map((c) => {
              const name = c.name;
              const isActive = getParamValues("tags").includes(name);
              return (
                <button
                  key={c.id}
                  onClick={() => handleAddTag("tags", name)}
                  className={`px-3 py-2 rounded-2xl hover:cursor-pointer border ${
                    isActive
                      ? "bg-indigo-100 border-indigo-400 hover:bg-indigo-50"
                      : "bg-gray-100 hover:bg-gray-200 "
                  }`}
                >
                  <span className="text-gray-700 font-medium">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Brands */}
        <h1 className="text-xl font-semibold text-black">Brands:</h1>
        <div className="w-full h-px bg-gray-400"></div>

        <div className="flex flex-col max-h-70 overflow-auto space-y-3">
          <div className="flex flex-wrap gap-4">
            {brands.map((b) => {
              const name = b.name;
              const isActive = getParamValues("brand").includes(name);
              return (
                <button
                  key={b.id}
                  onClick={() => handleAddTag("brand", name)}
                  className={`px-3 py-2 rounded-2xl hover:cursor-pointer border ${
                    isActive
                      ? "bg-indigo-100 border-indigo-400 hover:bg-indigo-50"
                      : "bg-gray-100 hover:bg-gray-200 "
                  }`}
                >
                  <span className="text-gray-700 font-medium">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Colors */}
        <h1 className="text-xl font-semibold text-black">Colors:</h1>
        <div className="w-full h-px bg-gray-400"></div>

        <div className="flex flex-col max-h-70 overflow-auto space-y-3">
          <div className="flex flex-wrap gap-4">
            {colors.map((c) => {
              const name = c.name;
              const isActive = getParamValues("color").includes(name);
              return (
                <button
                  key={c.id}
                  onClick={() => handleAddTag("color", name)}
                  className={`px-3 py-2 rounded-2xl hover:cursor-pointer border ${
                    isActive
                      ? "bg-indigo-100 border-indigo-400 hover:bg-indigo-50"
                      : "bg-gray-100 hover:bg-gray-200 "
                  }`}
                >
                  <span className="text-gray-700 font-medium">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sizes */}
        <h1 className="text-xl font-semibold text-black">Sizes:</h1>
        <div className="w-full h-px bg-gray-400"></div>
        <div className="flex flex-col space-y-3">
          <div className="flex flex-wrap gap-4">
            {sizes.map((s, idx) => {
              // sizes are normalized to strings when fetched
              const name = typeof s === "string" ? s : s.label ?? s.name;
              const isActive = getParamValues("size").includes(name);
              return (
                <button
                  key={`${name}-${idx}`}
                  onClick={() => handleAddTag("size", name)}
                  className={`px-3 py-2 rounded-2xl hover:cursor-pointer border ${
                    isActive
                      ? "bg-indigo-100 border-indigo-400 hover:bg-indigo-50"
                      : "bg-gray-100 hover:bg-gray-200 "
                  }`}
                >
                  <span className="text-gray-700 font-medium">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default ProductsTags;
