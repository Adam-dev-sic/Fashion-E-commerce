import express from "express";

// import authController from "../controllers/authController.js";
import productController from "../controllers/productController.js";
import supabaseAuth from "../controllers/supabaseAuth.js";
import { authenticateToken } from "../middleware/middleware.js";
import payementController from "../controllers/payementController.js";

const router = express.Router();

router.post("/products/add", supabaseAuth, productController.addProduct);
router.put("/products/:id", supabaseAuth, productController.updateProduct);
router.delete("/products/:id", supabaseAuth, productController.removeProduct);
// router.get('/me', authenticateToken, userController.getMe);
// --- PRODUCT ROUTES ---
router.get("/products", productController.getAllProducts);
router.post("/products/add", productController.addProduct);
router.put("/products/:id", productController.updateProduct); // Added PUT route
router.delete("/products/:id", productController.removeProduct);
router.get("/products/search", productController.searchProducts);

// --- Payement Routes ---

router.post(
  "/create-payment-intent",
  payementController.handleStripePayementIntent
);
router.post("/capture-payment-intent", payementController.captureStripePayment);

router.post("/orders/cancel", supabaseAuth, payementController.cancelOrder);

router.post("/paypal/create-order", payementController.paypalCreateOrder);

router.post("/paypal/capture-order", payementController.capturePaypalOrder);

export default router;
