import paypal from "@paypal/checkout-server-sdk";
import 'dotenv/config';
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  console.warn("PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not set in env");
}

const paypalEnv = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const paypalClient = new paypal.core.PayPalHttpClient(paypalEnv);

export default paypalClient;

// ---------- PayPal setup ----------
