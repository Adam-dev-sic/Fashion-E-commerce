import React, { useState, useEffect, use } from "react";
import {
  Trash2,
  Edit,
  Plus,
  Save,
  X,
  Package,
  UploadCloud,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useOutletContext } from "react-router-dom";

const API_URL = "http://localhost:3000/api/products";

export default function AdminInterface() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const session = useOutletContext();

  // NEW: admin check state
  const [isAdmin, setIsAdmin] = useState(null); // null = unknown, true/false = known
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  // --- fetched tag/filter lists ---
  const [categoriesList, setCategoriesList] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [colorsList, setColorsList] = useState([]);
  const [sizesList, setSizesList] = useState([]);

  // UI mode: product form vs tag form
  const [isTagMode, setIsTagMode] = useState(false);

  // Tag form state
  const [tagForm, setTagForm] = useState({
    type: "categories", // 'categories' | 'brands' | 'colors'
    name: "",
    extra: "", // optional (e.g. hex color or image url)
  });
  const [isTagSubmitting, setIsTagSubmitting] = useState(false);

  // Initial Form State (note tags is an array, quantity includes xs)
  const initialFormState = {
    name: "",
    brand: "", // single brand string
    price: "",
    description: "",
    color: "", // single color string
    gender: "Men",
    quality: "",
    madeIn: "",
    tags: [], // array of category names
    mainAngle: "",
    angle2: "",
    angle3: "",
    angle4: "",
    quantity: { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 },
    discount: 0,
    shown: true, // NEW: whether product is visible
  };

  const [formData, setFormData] = useState(initialFormState);

  // State to hold raw File objects before upload
  const [imageFiles, setImageFiles] = useState({
    mainAngle: null,
    angle2: null,
    angle3: null,
    angle4: null,
  });

  // --- HELPERS / FETCHES ---

  // Check if current session user is admin (reads public 'users' table)
  const checkAdminStatus = async () => {
    if (!session || !session.user?.id) {
      setIsAdmin(false);
      return;
    }

    try {
      setCheckingAdmin(true);
      const userId = session.user.id;
      const { data, error } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Admin check error (users table):", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data?.is_admin);
      }
    } catch (err) {
      console.error("Unexpected error checking admin:", err);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  // --- FETCH DATA (only called for admins) ---
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch products", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };
console.log(products[0]?.product_variants);
  // fetch categories / brands / colors / sizes from Supabase
  const fetchTagLists = async () => {
    try {
      const [
        { data: categories, error: catErr },
        { data: brands, error: brandErr },
        { data: colors, error: colorErr },
        { data: sizes, error: sizeErr },
      ] = await Promise.all([
        supabase.from("categories").select("*"),
        supabase.from("brands").select("*"),
        supabase.from("colors").select("*"),
        supabase.from("sizes").select("*"),
      ]);

      if (catErr) console.error("categories fetch error:", catErr);
      if (brandErr) console.error("brands fetch error:", brandErr);
      if (colorErr) console.error("colors fetch error:", colorErr);
      if (sizeErr) console.error("sizes fetch error:", sizeErr);

      setCategoriesList(categories ?? []);
      setBrandsList(brands ?? []);
      setColorsList(colors ?? []);
      // normalize sizes to strings (prefer label then name)
      setSizesList((sizes ?? []).map((s) => s.label ?? s.name ?? s));
    } catch (err) {
      console.error("Failed to fetch tag lists:", err);
    }
  };

  // Run admin check when session changes; only fetch data if admin
  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }

    let mounted = true;
    (async () => {
      await checkAdminStatus();
      // only fetch data if admin
      if (mounted && isAdmin) {
        await fetchProducts();
        await fetchTagLists();
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAdmin]);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // support checkbox for shown
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // useEffect(() => {
    // console.log(product.product_variants);
  // }, [products]);

  // Handle File Selection
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];

      // Store the file object for uploading later
      setImageFiles((prev) => ({ ...prev, [name]: file }));

      // Create a local preview URL immediately
      setFormData((prev) => ({ ...prev, [name]: URL.createObjectURL(file) }));
    }
  };

  const handleStockChange = (size, value) => {
    setFormData((prev) => ({
      ...prev,
      quantity: {
        ...prev.quantity,
        [size]: parseInt(value) || 0,
      },
    }));
  };

  const handleEditClick = (product) => {
    setIsTagMode(false); // switch to product mode if we were in tag mode
    setIsEditing(product.id);

    // Reset image files
    setImageFiles({
      mainAngle: null,
      angle2: null,
      angle3: null,
      angle4: null,
    });
console.log(product)
    const qtyMap = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };
    if (product.product_variants) {
      product.product_variants.forEach((v) => {
        const key = (v.size || "").toLowerCase();
        if (qtyMap.hasOwnProperty(key)) qtyMap[key] = v.stock;
      });
    }
// console.log(product.product_variants);
    setFormData({
      name: product.name ?? "",
      brand: product.brand ?? "",
      price: product.price ?? "",
      description: product.description ?? "",
      color: product.color ?? "",
      gender: product.gender ?? "Men",
      quality: product.quality || "",
      madeIn: product.made_in || "",
      tags: Array.isArray(product.tags)
        ? product.tags
        : product.tags
        ? product.tags.split(",").map((t) => t.trim())
        : [],
      mainAngle: product.main_angle || "",
      angle2: product.angle2 || "",
      angle3: product.angle3 || "",
      angle4: product.angle4 || "",
      quantity: qtyMap,
      discount: product.discount ?? 0,
      shown: product.shown === undefined ? true : !!product.shown,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    console.log(product.shown);
  };

  const handleCancel = () => {
    setIsEditing(null);
    setFormData(initialFormState);
    setImageFiles({
      mainAngle: null,
      angle2: null,
      angle3: null,
      angle4: null,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    try {
      await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      fetchProducts();
    } catch (error) {
      console.error("Error deleting", error);
    }
  };

  // toggle category tag in formData.tags array
  const handleToggleTag = (categoryName) => {
    setFormData((prev) => {
      const tags = new Set(prev.tags || []);
      if (tags.has(categoryName)) tags.delete(categoryName);
      else tags.add(categoryName);
      return { ...prev, tags: Array.from(tags) };
    });
  };

  // --- SUPABASE UPLOAD HELPER ---
  const uploadImageToSupabase = async (file) => {
    if (!file) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from("products")
      .upload(filePath, file);

    if (error) {
      console.error("Supabase upload error:", error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("products")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  // SUBMIT product
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      // 1. Upload Images if they exist in imageFiles state
      const imageUrls = {};
      const imageKeys = ["mainAngle", "angle2", "angle3", "angle4"];

      for (const key of imageKeys) {
        if (imageFiles[key]) {
          imageUrls[key] = await uploadImageToSupabase(imageFiles[key]);
        } else {
          imageUrls[key] = formData[key];
        }
      }

      // 2. Prepare Payload
      const payload = {
        ...formData,
        ...imageUrls,
        tags: Array.isArray(formData.tags)
          ? formData.tags.map((t) => String(t).trim()).filter((t) => t !== "")
          : [],
        price: parseFloat(formData.price) || 0,
        discount: Number(formData.discount) || 0,
        shown: !!formData.shown, // ensure boolean
      };

      // 3. Send to Backend
      if (isEditing) {
        await fetch(`${API_URL}/${isEditing}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        fetchProducts();
      } else {
        const res = await fetch(`${API_URL}/add`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const newProduct = await res.json();
        setProducts((prev) => [...prev, newProduct]);
      }

      handleCancel();
      fetchProducts();
    } catch (error) {
      console.error("Error submitting form", error);
      alert("Failed to save product. Check console.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- TAG SUBMISSION ---
  const handleTagInputChange = (e) => {
    const { name, value } = e.target;
    setTagForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitTag = async (e) => {
    e?.preventDefault();
    if (!tagForm.name?.trim()) {
      alert("Please provide a name for the tag.");
      return;
    }
    setIsTagSubmitting(true);
    try {
      const table = tagForm.type; // 'categories' | 'brands' | 'colors'
      // For colors: we can optionally store an extra field like 'hex' in 'extra', but keep simple
      const payload =
        table === "colors"
          ? { name: tagForm.name.trim(), hex: tagForm.extra?.trim() || null }
          : { name: tagForm.name.trim() };

      const { data, error } = await supabase
        .from(table)
        .insert([payload])
        .select()
        .single();

      if (error) {
        // duplicate or constraint error
        console.error("Failed inserting tag:", error);
        alert(error.message || "Failed to add tag");
      } else {
        // refresh lists
        await fetchTagLists();
        // clear tag form
        setTagForm({ type: "categories", name: "", extra: "" });
        alert(`Added ${table.slice(0, -1)}: ${data.name}`);
      }
    } catch (err) {
      console.error("Tag insert error:", err);
      alert("Failed to add tag - check console");
    } finally {
      setIsTagSubmitting(false);
    }
  };

  // --- RENDER: handle auth/admin states first ---
  // No session -> prompt to sign in
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-xl p-8 shadow">
          <h2 className="text-xl font-bold mb-2">Not authenticated</h2>
          <p className="text-gray-600 mb-4">
            You must be signed in to access the admin dashboard.
          </p>
          <a
            href="/authentication"
            className="inline-block px-4 py-2 bg-black text-white rounded"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  // Still checking admin status
  if (checkingAdmin || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto mb-4" />
          <p className="text-gray-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // User is not admin -> show message and block UI
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg text-center bg-white rounded-xl p-8 shadow">
          <h2 className="text-xl font-bold mb-2">Access denied</h2>
          <p className="text-gray-600 mb-4">
            You are not authorized to access this admin area. If you believe
            this is an error, please contact an administrator.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-black text-white rounded"
          >
            Back to Store
          </a>
        </div>
      </div>
    );
  }

  // --- MAIN ADMIN UI (user is admin) ---
  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Admin Dashboard
            </h1>
            <p className="text-gray-500">Manage your inventory</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
            <span className="font-semibold text-gray-700">
              {products.length}
            </span>{" "}
            Products Found
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* --- LEFT COLUMN: Form (Product or Tag) --- */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {isTagMode ? (
                      <>
                        <Plus size={20} className="text-green-600" /> Add Tag
                      </>
                    ) : isEditing ? (
                      <>
                        <Edit size={20} className="text-blue-600" /> Edit
                        Product
                      </>
                    ) : (
                      <>
                        <Plus size={20} className="text-green-600" /> Add New
                        Product
                      </>
                    )}
                  </h2>
                  {/* quick switch button */}
                  <button
                    type="button"
                    onClick={() => {
                      // toggle modes
                      setIsTagMode((prev) => !prev);
                      // reset editing if switching to tag mode
                      if (!isTagMode) {
                        setIsEditing(null);
                        setFormData(initialFormState);
                      }
                    }}
                    className="ml-2 text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                  >
                    {isTagMode ? "Switch to Product" : "Switch to Tag"}
                  </button>
                </div>

                {isTagMode ? (
                  <button
                    onClick={() => {
                      setTagForm({ type: "categories", name: "", extra: "" });
                    }}
                    className="text-gray-400 hover:text-blue-500"
                  >
                    <X size={20} />
                  </button>
                ) : (
                  isEditing && (
                    <button
                      onClick={handleCancel}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={20} />
                    </button>
                  )
                )}
              </div>

              {/* TAG FORM */}
              {isTagMode ? (
                <form onSubmit={handleSubmitTag} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">
                      Tag Type
                    </label>
                    <select
                      name="type"
                      value={tagForm.type}
                      onChange={handleTagInputChange}
                      className="w-full mt-1 p-2 border rounded-lg bg-white"
                    >
                      <option value="categories">Category</option>
                      <option value="brands">Brand</option>
                      <option value="colors">Color</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">
                      Name
                    </label>
                    <input
                      name="name"
                      value={tagForm.name}
                      onChange={handleTagInputChange}
                      className="w-full mt-1 p-2 border rounded-lg outline-none"
                      placeholder="e.g. Sneakers / Nike / Black"
                    />
                  </div>

                  {tagForm.type === "colors" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Optional color class / hex
                      </label>
                      <input
                        name="extra"
                        value={tagForm.extra}
                        onChange={handleTagInputChange}
                        className="w-full mt-1 p-2 border rounded-lg outline-none"
                        placeholder="e.g. bg-black or #000000"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isTagSubmitting}
                      className={`w-full py-3 rounded-lg text-white font-bold ${
                        isTagSubmitting
                          ? "bg-gray-400"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {isTagSubmitting ? "Adding..." : "Add Tag"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTagForm({ type: "categories", name: "", extra: "" });
                      }}
                      className="w-32 py-3 rounded-lg border"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              ) : (
                // PRODUCT FORM (existing, with 'shown' added)
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Product Name
                      </label>
                      <input
                        required
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Fendi Blouson"
                      />
                    </div>

                    {/* Brand select (from DB) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Brand
                      </label>
                      <select
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg bg-white"
                      >
                        <option value="">Select brand</option>
                        {brandsList.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg bg-white"
                      >
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                        <option value="Unisex">Unisex</option>
                      </select>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Color
                      </label>
                      <select
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg bg-white"
                      >
                        <option value="">Select color</option>
                        {colorsList.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Made In
                      </label>
                      <input
                        name="madeIn"
                        value={formData.madeIn}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg outline-none"
                        placeholder="Italy"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">
                      Quality
                    </label>
                    <input
                      name="quality"
                      value={formData.quality}
                      onChange={handleChange}
                      className="w-full mt-1 p-2 border rounded-lg outline-none"
                      placeholder="Quality"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400">
                          $
                        </span>
                        <input
                          required
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          className="w-full mt-1 pl-7 p-2 border rounded-lg outline-none font-mono"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Sale %
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400">
                          %
                        </span>
                        <input
                          max={100}
                          type="number"
                          name="discount"
                          value={formData.discount}
                          onChange={handleChange}
                          className="w-full mt-1 pl-7 p-2 border rounded-lg outline-none font-mono"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className="w-full mt-1 p-2 border rounded-lg outline-none text-sm"
                      placeholder="Product details..."
                    ></textarea>
                  </div>

                  {/* Tags: categories checkboxes (DB-driven) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      Categories (choose one or more)
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto p-2 border rounded">
                      {categoriesList.map((cat) => {
                        const checked = (formData.tags || []).includes(
                          cat.name
                        );
                        return (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleTag(cat.name)}
                            />
                            <span>{cat.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stock Matrix */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                      <Package size={14} /> Stock Quantity
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {Object.keys(formData.quantity).map((size) => (
                        <div key={size} className="text-center">
                          <span className="block text-xs font-bold text-gray-400 uppercase mb-1">
                            {size}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={formData.quantity[size]}
                            onChange={(e) =>
                              handleStockChange(size, e.target.value)
                            }
                            className="w-full p-1 text-center border rounded text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* --- IMAGES UPLOAD SECTION --- */}
                  <div className="border-t pt-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      Product Images
                    </label>

                    <div className="mb-3">
                      <span className="text-xs text-gray-400 mb-1 block">
                        Main Angle (Cover)
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm text-gray-600 transition">
                          <UploadCloud size={16} /> Upload Main
                          <input
                            type="file"
                            name="mainAngle"
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                        </label>
                        {formData.mainAngle && (
                          <img
                            src={formData.mainAngle}
                            alt="Preview"
                            className="w-12 h-12 object-cover rounded border"
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {["angle2", "angle3", "angle4"].map((angle, idx) => (
                        <div key={angle} className="relative">
                          <input
                            type="file"
                            name={angle}
                            id={`file-${angle}`}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                          <label
                            htmlFor={`file-${angle}`}
                            className="h-16 bg-gray-50 border border-dashed border-gray-300 rounded flex justify-center items-center cursor-pointer hover:bg-gray-100 overflow-hidden"
                          >
                            {formData[angle] ? (
                              <img
                                src={formData[angle]}
                                alt={`Preview ${idx}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-400 uppercase">
                                Angle {idx + 2}
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shown toggle */}
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      id="shown"
                      name="shown"
                      type="checkbox"
                      checked={!!formData.shown}
                      onChange={handleChange}
                    />
                    <label htmlFor="shown" className="text-sm text-gray-700">
                      Shown (visible on store)
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className={`w-full py-3 rounded-lg text-white font-bold shadow-lg transition-all flex justify-center items-center gap-2 ${
                      isEditing
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-black hover:bg-gray-800"
                    } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isUploading ? (
                      <span className="animate-pulse">
                        Uploading to Supabase...
                      </span>
                    ) : (
                      <>
                        {isEditing ? <Save size={18} /> : <Plus size={18} />}
                        {isEditing ? "Save Changes" : "Create Product"}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* --- RIGHT COLUMN: LIST --- */}
          <div className="lg:col-span-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64 text-gray-400">
                Loading products...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 flex flex-col"
                  >
                    <div className="h-68 w-full bg-gray-100 p-2 relative group">
                      <img
                        src={
                          product.main_angle ||
                          "https://via.placeholder.com/300"
                        }
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/300?text=No+Image";
                        }}
                      />
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="bg-white p-2 rounded-full shadow hover:bg-blue-50 text-blue-600"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="bg-white p-2 rounded-full shadow hover:bg-red-50 text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex  justify-center flex-col">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {product.brand}
                          </p>
                          <h3 className="font-bold text-gray-800 text-lg leading-tight">
                            {product.name}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col ">
                            <span className="font-mono font-bold text-lg">
                              ${product.price}
                            </span>
                            <div
                              className={`mt-2 inline-block text-xs px-2 py-1 rounded ${
                                product.shown
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {product.shown ? "Shown" : "Hidden"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1">
                        {product.tags &&
                          product.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase font-semibold"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Package size={14} />
                          {/* {console.log(product.variants)} */}
                          {product.product_variants
                            ? product.product_variants.reduce(
                                (acc, curr) => acc + curr.stock,
                                0
                              )
                            : 0}{" "}
                          in stock
                        </span>
                        <span className="uppercase text-xs font-bold bg-gray-100 px-2 py-1 rounded">
                          {product.gender}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {products.length === 0 && !isLoading && (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-400">
                  No products found. Add one on the left!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
