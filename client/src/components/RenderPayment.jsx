// RenderPayment.jsx
import React, { useState, useMemo } from "react";
import { ArrowLeft, Check, CreditCard } from "lucide-react";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "../supabaseClient";
import { useOutletContext } from "react-router-dom";
import { useEffect } from "react";
import { use } from "react";

/**
 * NOTE:
 * - This component expects backend endpoints:
 *
 * - Replace currency/amount handling to your app rules. Always calculate amount server-side!
 */

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
// Small wrapper to use Stripe elements inside your UI
function StripeForm({
  amountCents,
  onSuccess,
  onError,
  cardholderName,
  email,
  session,
  formData,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // Form submission is handled here
    if (!stripe || !elements) return;

    try {
      setProcessing(true);

      // 1) Ask backend to create PaymentIntent and return clientSecret
      const resp = await fetch(
        "http://localhost:3000/api/create-payment-intent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`, // or cookie
          },
          body: JSON.stringify({
            // amount: amountCents,
            formData: formData,
            // integer cents, server should validate
            // optional metadata: items, userId, etc.
          }),
        }
      );

      if (!resp.ok) throw new Error("Failed to create payment intent");
      const { clientSecret } = await resp.json();

      // 2) Confirm the card payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName || undefined,
            email: email || undefined,
          },
        },
      });

      if (result.error) {
        // Payment failed
        onError?.(result.error);
        setProcessing(false);
        return;
      }

      // Payment succeeded
      if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
        onSuccess?.(result.paymentIntent);
      } else {
        // Might be other statuses — handle as needed
        onError?.(new Error("Payment not completed"));
      }
    } catch (err) {
      onError?.(err);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="rounded border border-slate-200 p-3">
          {/* CardElement is the secure input */}
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#111827",
                  "::placeholder": { color: "#9CA3AF" },
                  fontFamily: "inherit",
                },
                invalid: { color: "#dc2626" },
              },
            }}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={processing}
            className={`px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              processing ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {processing ? "Processing..." : "Pay with Card"}
            {!processing && <Check size={18} />}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function RenderPayment({
  nextStep,
  formData,
  handleInputChange,
  prevStep,
  isProcessing: parentProcessing,
  session,
}) {
  // console.log(session
  //
  // )
  // local state
  // useEffect(() => {
  // console.log(formData);
  // }, [formData]);
  const [paymentMethod, setPaymentMethod] = useState("card"); // 'card' | 'paypal'
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);

 
  // Card success handler
  const handleCardSuccess = async (paymentIntent) => {
    const resp = await fetch(
      "http://localhost:3000/api/capture-payment-intent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`, // or cookie
        },
        body: JSON.stringify({
          // amount: amountCents,
          formData: formData,
          paymentIntentId: paymentIntent.id,
          // integer cents, server should validate
          // optional metadata: items, userId, etc.
        }),
      }
    );

    nextStep(); // move to completion step (parent will show success view)
  };

  const handleCardError = (err) => {
    console.error("Card payment error:", err);
    setErrorMsg(err?.message || "Payment failed");
  };

  // PayPal handlers — using PayPal Buttons
  // createOrder will call your backend to create an order and return orderID
  const createPayPalOrder = async () => {
    try {
      setErrorMsg(null);
      setProcessing(true);
      const resp = await fetch(
        "http://localhost:3000/api/paypal/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`, // or cookie
          },
          body: JSON.stringify({
            // amount or items — server must calculate amount
            // For security: server should compute the amount from cart / user session
          }),
        }
      );
      if (!resp.ok) throw new Error("Failed to create PayPal order");
      const body = await resp.json();
      return body.orderID;
    } catch (err) {
      console.error("createPayPalOrder error:", err);
      setErrorMsg(err.message || "Could not create PayPal order");
      setProcessing(false);
      throw err;
    }
  };

  const onApprovePayPal = async (data) => {
    try {
      setErrorMsg(null);
      // capture on server
      const resp = await fetch(
        "http://localhost:3000/api/paypal/capture-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`, // or cookie
          },
          body: JSON.stringify({ orderID: data.orderID, formData }),
        }
      );
      if (!resp.ok) throw new Error("Failed to capture PayPal order");
      const capture = await resp.json();
      // Optionally: record order in your DB using capture response
      setProcessing(false);
      nextStep();
    } catch (err) {
      console.error("PayPal capture error:", err);
      setErrorMsg(err.message || "PayPal capture failed");
      setProcessing(false);
    }
  };

  // PayPal client-id
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

  return (
    <div className="animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="text-indigo-600" size={20} /> Payment Method
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Payment Type Selector */}
          <div className="flex gap-4">
            <div
              role="button"
              onClick={() => setPaymentMethod("card")}
              className={`flex-1 border-2 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer relative transition-all ${
                paymentMethod === "card"
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="absolute top-2 right-2 text-indigo-600">
                {paymentMethod === "card" && <Check size={16} />}
              </div>
              <CreditCard className="text-indigo-600 mb-2" size={24} />
              <span className="font-semibold text-sm text-indigo-900">
                Card
              </span>
            </div>

            <div
              role="button"
              onClick={() => setPaymentMethod("paypal")}
              className={`flex-1 border rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                paymentMethod === "paypal"
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <span className="font-bold italic text-lg mb-1">PayPal</span>
              <span className="text-xs">Express</span>
            </div>
          </div>

          {/* Keep Cardholder Name input visible for both flows */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Cardholder Name
              </label>
              <input
                required
                name="cardName"
                value={formData.cardName}
                onChange={handleInputChange}
                type="text"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="John Doe"
              />
            </div>

            {/* If card is selected render Stripe CardElement */}
            {paymentMethod === "card" && (
              <Elements stripe={stripePromise}>
                <StripeForm
                  amountCents={totalAmount}
                  onSuccess={handleCardSuccess}
                  onError={handleCardError}
                  cardholderName={formData.cardName}
                  email={formData.email}
                  session={session}
                  formData={formData}
                />
              </Elements>
            )}

            {/* If PayPal is selected show PayPal Buttons */}
            {paymentMethod === "paypal" && (
              <div>
                <PayPalScriptProvider
                  options={{
                    "client-id": paypalClientId,
                    currency: "USD",
                  }}
                >
                  <div className="p-3 border rounded border-slate-200">
                    <PayPalButtons
                      createOrder={async (data, actions) => {
                        // create order on server and return orderID
                        const orderID = await createPayPalOrder();
                        return orderID;
                      }}
                      onApprove={async (data, actions) => {
                        // capture on server
                        await onApprovePayPal(data);
                      }}
                      onError={(err) => {
                        console.error("PayPal Buttons error:", err);
                        setErrorMsg(err?.message || "PayPal error");
                        setProcessing(false);
                      }}
                      style={{
                        layout: "vertical",
                        color: "blue",
                        shape: "rect",
                        label: "pay",
                      }}
                    />
                  </div>
                </PayPalScriptProvider>
              </div>
            )}

            {/* If user leaves card fields in place (cardNumber, expiry, cvc) we keep them for UX,
                but they will not be used for payment when Stripe Elements is active.
                You can keep them or hide them. */}
            {paymentMethod === "card" && (
              <div className="grid grid-cols-2 gap-6 mt-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Expiry Date (optional visual)
                  </label>
                  <input
                    name="expiry"
                    value={formData.expiry}
                    onChange={handleInputChange}
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="MM/YY"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    CVC (optional visual)
                  </label>
                  <input
                    name="cvc"
                    value={formData.cvc}
                    onChange={handleInputChange}
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="123"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-2.5 text-slate-600 font-semibold hover:text-slate-900 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Back
          </button>

          {/* If Card method we disable main button and rely on StripeForm's Pay button.
              If PayPal we do not show the Complete Order button because PayPal button handles capture.
              But to preserve behavior we render a disabled "Complete Order" for card to match layout. */}
          <div>
            {paymentMethod === "card" ? (
              <button
                type="button"
                disabled
                className={`px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 opacity-50 cursor-not-allowed`}
              >
                Use the Card button above
              </button>
            ) : (
              <button
                type="button"
                disabled={processing}
                className={`px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  processing ? "opacity-75 cursor-not-allowed" : ""
                }`}
                onClick={() => {
                  // pay with PayPal is handled by the PayPalButtons. This fallback button does nothing.
                }}
              >
                {processing ? "Processing..." : "Pay with PayPal"}
                {!processing && <Check size={18} />}
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded mt-4">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
