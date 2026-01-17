import { supabase } from "../supabaseAdmin.js";


async function getUserFromBearer(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    if (!token) return null;

    // get auth user from supabase using token
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr) {
      console.error("supabase.auth.getUser error:", authErr);
      return null;
    }
    const authUser = authData?.user;
    if (!authUser) return null;

    // now fetch the app user row (roles, is_admin) from your users table
    const { data: dbUser, error: dbErr } = await supabase
      .from("users") // change to "profiles" if that's your table
      .select("is_admin")
      .eq("id", authUser.id)
      .single();

    if (dbErr && dbErr.code !== "PGRST116") { // still log but don't break on not found
      console.error("fetch app user error:", dbErr);
      // return auth user with conservative is_admin = false
      return { ...authUser, is_admin: false };
    }

    return { ...authUser, is_admin: !!(dbUser && dbUser.is_admin === true) };
  } catch (err) {
    console.error("getUserFromBearer unexpected error:", err);
    return null;
  }
}

/* ----------------------------------
   ADD PRODUCT
----------------------------------- */
const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      brand,
      color,
      gender,
      price,
      quantity,
      tags,
      madeIn,
      quality,
      mainAngle,
      angle2,
      angle3,
      angle4,
      discount,
      shown,
    } = req.body;

    /* 1️⃣ Insert product */
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name,
        description,
        brand,
        color,
        gender,
        price,
        made_in: madeIn,
        quality,
        tags: tags || [],
        main_angle: mainAngle,
        angle2,
        angle3,
        angle4,
        discount,
        shown,
      })
      .select()
      .single();

    if (productError) throw productError;

    /* 2️⃣ Insert variants */
    if (quantity && Object.keys(quantity).length > 0) {
      const variantsPayload = Object.entries(quantity).map(([size, stock]) => ({
        product_id: product.id,
        size: size.toUpperCase(),
        stock: parseInt(stock),
      }));
      console.log("Variants Payload:", variantsPayload);
      const { error: variantsError } = await supabase
        .from("product_variants")
        .insert(variantsPayload);

      if (variantsError) throw variantsError;
    }

    /* 3️⃣ Fetch product with variants */
    const { data: fullProduct } = await supabase
      .from("products")
      .select(
        `
        *,
        product_variants (*)
      `
      )
      .eq("id", product.id)
      .single();

    res.status(201).json(fullProduct);
  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({ error: "Failed to add product" });
  }
};

/* ----------------------------------
   UPDATE PRODUCT
----------------------------------- */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      brand,
      color,
      gender,
      price,
      quantity,
      tags,
      quality,
      madeIn,
      mainAngle,
      angle2,
      angle3,
      angle4,
      discount,
      shown,
    } = req.body;

    /* 1️⃣ Update product */
    const { error: updateError } = await supabase
      .from("products")
      .update({
        name,
        description,
        brand,
        color,
        gender,
        price,
        tags,
        quality,
        made_in: madeIn,
        main_angle: mainAngle,
        angle2,
        angle3,
        angle4,
        discount,
        shown,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    /* 2️⃣ Replace variants */
    if (quantity) {
      await supabase.from("product_variants").delete().eq("product_id", id);

      const variantsPayload = Object.entries(quantity).map(([size, stock]) => ({
        product_id: id,
        size: size.toUpperCase(),
        stock: parseInt(stock),
      }));
      // alert("Variants Payload:", variantsPayload);

      const { error: variantError } = await supabase
        .from("product_variants")
        .insert(variantsPayload);

      if (variantError) throw variantError;
    }

    /* 3️⃣ Return updated product */
    const { data: updatedProduct } = await supabase
      .from("products")
      .select(
        `
        *,
        product_variants (*)
      `
      )
      .eq("id", id)
      .single();

    res.json(updatedProduct);
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
};

/* ----------------------------------
   DELETE PRODUCT
----------------------------------- */
const removeProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await supabase.from("product_variants").delete().eq("product_id", id);
    await supabase.from("products").delete().eq("id", id);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

/* ----------------------------------
   GET ALL PRODUCTS
----------------------------------- */

const getAllProducts = async (req, res) => {
  console.log("getAllProducts called!", req.query);
  try {
    // resolve user (from Authorization: Bearer <token>)
    const user = await getUserFromBearer(req);
    const isAdmin = !!(user && user.is_admin === true);
    console.log("Resolved user from bearer:", user ? user.id : null, "isAdmin:", isAdmin);

    // parse query params
    let tags = req.query.tags;
    if (!tags) tags = [];
    else if (!Array.isArray(tags)) tags = [tags];

    const brand = req.query.brand ?? null;
    const color = req.query.color ?? null;
    const variant = req.query.size ?? null; // size
    const search = req.query.search ?? null;
    const gender = req.query.gender ?? null;
    const sale = req.query.sale ?? null;
    const price = req.query.price ?? null; // expected "min-max"

    // parse price range
    let priceMin = null;
    let priceMax = null;
    if (price) {
      const [minStr, maxStr] = (price || "").split("-");
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      if (!isNaN(min) && !isNaN(max)) {
        priceMin = min;
        priceMax = max;
      }
    }

    // build base query AFTER we know isAdmin
    let query = supabase
      .from("products")
      .select(`
        *,
        product_variants (*)
      `)
      .order("created_at", { ascending: false });

    // only restrict to shown products for non-admins
    if (!isAdmin) {
      query = query.eq("shown", true);
    }

    // apply filters
    if (tags.length > 0) {
      query = query.contains("tags", tags);
    }
    if (brand) {
      // using ilike (case-insensitive) but allow partial matches
      query = query.ilike("brand", `${brand}`);
    }
    if (color) {
      query = query.ilike("color", `${color}`);
    }
    if (search) {
      // search across name, brand, description
      query = query.or(
        `name.ilike.%${search}%,brand.ilike.%${search}%,description.ilike.%${search}%`
      );
    }
    if (gender) {
      query = query.ilike("gender", `${gender}`);
    }
    if (sale) {
      // sale filter: discount > 0
      query = query.gt("discount", 0);
    }

    // variant (size) filter: need to resolve product IDs from product_variants table
    if (variant) {
      const variantsArray = Array.isArray(variant) ? variant : [variant];
      // build or query with wildcard (case-insensitive): size.ilike.%M%
      const orQuery = variantsArray.map((v) => `size.ilike.%${v}%`).join(",");
      const { data: pv, error: pvErr } = await supabase
        .from("product_variants")
        .select("product_id")
        .or(orQuery);

      if (pvErr) {
        console.error("product_variants query error:", pvErr);
        throw pvErr;
      }

      const productIds = (pv || []).map((r) => r.product_id).filter(Boolean);
      if (productIds.length === 0) {
        // nothing matches the size filter
        return res.json([]);
      }
      query = query.in("id", productIds);
    }

    // execute main query
    const { data, error } = await query;
    if (error) {
      console.error("products query error:", error);
      throw error;
    }

    let products = data || [];

    // apply price-range filtering client-side (because discount affects effective price)
    if (priceMin !== null && priceMax !== null) {
      products = products.filter((p) => {
        const rawPrice = Number(p.price ?? 0);
        if (isNaN(rawPrice)) return false;
        const discountPercent = Number(p.discount ?? 0) || 0;
        const effectivePrice = rawPrice * (1 - discountPercent / 100);
        return effectivePrice >= priceMin && effectivePrice <= priceMax;
      });
    }

    return res.json(products);
  } catch (error) {
    console.error("getAllProducts error:", error);
    return res.status(500).json({ error: "Could not fetch products" });
  }
};

/* ----------------------------------
   SEARCH PRODUCTS
----------------------------------- */
const searchProducts = async (req, res) => {
  try {
    const { search } = req.query;

    let query = supabase
      .from("products")
      .select(
        `
        *,
        product_variants (*)
      `
      )
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,brand.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Could not search products" });
  }
};

export default {
  addProduct,
  updateProduct,
  removeProduct,
  getAllProducts,
  searchProducts,
};
