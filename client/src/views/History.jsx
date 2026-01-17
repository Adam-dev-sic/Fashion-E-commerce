import React, { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  Check,
  CheckCheck,
  CheckCircle,
  CheckIcon,
  DeleteIcon,
  Loader,
  LucideDelete,
  LucideX,
  TruckIcon,
} from "lucide-react";
import { toast } from "react-toastify";

function History() {
  const session = useOutletContext();
  const user = session?.user;
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  // const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [openInvoiceId, setOpenInvoiceId] = useState(null);
  const [tabOpen, setTabOpen] = useState("All Order");
  const [cancelingIds, setCancelingIds] = useState(new Set()); // new state for cancellation loading

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
        return;
      }

      setOrders(data || []);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setOrders([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProducts = async () => {
    try {
      if (!orders || orders.length === 0) {
        setProducts([]);
        return;
      }

      const orderIds = orders.map((o) => o.id);
      if (!orderIds.length) {
        setProducts([]);
        return;
      }

      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (error) throw error;

      const productDetails = await Promise.all(
        (data || []).map(async (item) => {
          const { data: product } = await supabase
            .from("products")
            .select("*")
            .eq("id", item.product_id)
            .single();
          return { ...item, product };
        })
      );

      setProducts(productDetails);
    } catch (err) {
      console.error("Error fetching order items:", err);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const visibleOrders =
    tabOpen === "All Order"
      ? orders
      : orders.filter((order) => order.status === tabOpen);

  // Cancel order function
  const handleCancelOrder = async (orderId) => {
    if (!orderId) return;
    const ok = window.confirm(
      "Are you sure you want to cancel this order? This will attempt to refund the payment."
    );
    if (!ok) return;

    // Optimistic UI: show loading for this order
    setCancelingIds((prev) => new Set(prev).add(orderId));

    try {
      const res = await fetch("http://localhost:3000/api/orders/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Cancel order failed:", json);
        alert(
          json?.error || "Failed to cancel order. Check console for details."
        );
        setCancelingIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
        return;
      }

      // success: update local orders state (set status to Canceled)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "Canceled" } : o))
      );

      // also refetch order items/products for safety (optional)
      await fetchProducts();

      toast.warn("Order Successfully Cancelled", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
    } catch (err) {
      console.error("Cancel request error:", err);
      alert("Failed to cancel order. See console for details.");
    } finally {
      setCancelingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  return (
    <>
      <section className="py-24 relative">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
          <h2 className="font-manrope font-extrabold text-3xl lead-10 text-black mb-9">
            Order History
          </h2>

          <div className="flex sm:flex-col lg:flex-row sm:items-center justify-between">
            <ul className="flex max-sm:flex-col sm:items-center gap-x-14 gap-y-3">
              <li
                onClick={() => {
                  setTabOpen("All Order");
                }}
                className={`font-medium text-lg leading-8 cursor-pointer  transition-all duration-500 hover:text-indigo-600
              ${
                tabOpen === "All Order" || null
                  ? "text-indigo-600!"
                  : "text-black"
              }
              `}
              >
                All Order
              </li>
              <li
                onClick={() => {
                  setTabOpen("Canceled");
                }}
                className={`font-medium text-lg leading-8 cursor-pointer  transition-all duration-500 hover:text-indigo-600
              ${
                tabOpen === "Canceled" || null
                  ? "text-indigo-600!"
                  : "text-black"
              }
              `}
              >
                Canceled
              </li>
              <li
                onClick={() => {
                  setTabOpen("Processing");
                }}
                className={`font-medium text-lg leading-8 cursor-pointer  transition-all duration-500 hover:text-indigo-600
              ${
                tabOpen === "Processing" || null
                  ? "text-indigo-600!"
                  : "text-black"
              }
              `}
              >
                Processing{" "}
              </li>
              <li
                onClick={() => {
                  setTabOpen("Deliviring");
                }}
                className={`font-medium text-lg leading-8 cursor-pointer  transition-all duration-500 hover:text-indigo-600
              ${
                tabOpen === "Deliviring" || null
                  ? "text-indigo-600!"
                  : "text-black"
              }
              `}
              >
                Currently Deliviring
              </li>
              <li
                onClick={() => {
                  setTabOpen("Delivered");
                }}
                className={`font-medium text-lg leading-8 cursor-pointer  transition-all duration-500 hover:text-indigo-600
              ${
                tabOpen === "Delivered" || null
                  ? "text-indigo-600!"
                  : "text-black"
              }
              `}
              >
                Delivered{" "}
              </li>
            </ul>
            {/* <div className="flex max-sm:flex-col items-center justify-end gap-2 max-lg:mt-5">
              ...
            </div> */}
          </div>

          {visibleOrders.map((order) => (
            <div
              key={order.id}
              className="mt-7 border border-gray-300 py-8 rounded-xl"
            >
              <div className="flex max-md:flex-col items-center justify-between px-3 md:px-11">
                <div className="data">
                  {/* Allow very long order ids to wrap instead of overflowing */}
                  <p className="font-medium text-lg leading-8 text-black break-all max-w-full">
                    Order : #{order.id}
                  </p>
                  <p className="font-medium text-lg leading-8 text-black mt-3 break-all max-w-full">
                    Ordered at : {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  {order.status != "Canceled" ? (
                    <p className="text-lg flex items-center justify-center font-bold text-green-500">
                      Paid Using{" "}
                      <span className="font-bold ml-1 text-green-500">
                        {" "}
                        {order.payment_reference}{" "}
                      </span>{" "}
                      <CheckIcon className="ml-1" />{" "}
                    </p>
                  ) : (
                    <p className="text-lg flex items-center justify-center font-medium text-green-700">
                      <span className="font-bold ml-1 "> Order Refunded </span>{" "}
                      <CheckIcon className="ml-1" />{" "}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 max-md:mt-5">
                  <button
                    onClick={() =>
                      setOpenInvoiceId(
                        openInvoiceId === order.id ? null : order.id
                      )
                    }
                    className="rounded-full px-7 py-3 bg-white text-gray-900 border border-gray-300 font-semibold text-sm shadow-sm shadow-transparent transition-all duration-500 hover:shadow-gray-200 hover:bg-gray-50 hover:border-gray-400"
                  >
                    Show Invoice
                  </button>

                  {/* Cancel button placed to the right of Show Invoice */}
                  {/*
                    Business rule: customers can cancel when status === 'Processing'
                    (server expects this). Button disabled while cancelling.
                  */}
                  {order.status === "Processing" && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancelingIds.has(order.id)}
                      className="rounded-full px-5 py-3 bg-white text-gray-900 border border-gray-300 font-semibold text-sm shadow-sm shadow-transparent transition-all duration-500 hover:bg-red-50 hover:border-red-300 ml-3"
                    >
                      {cancelingIds.has(order.id) ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </div>

              <div
                className={`mt-9 border-t border-gray-300 pt-8 px-3 md:px-0 overflow-hidden transition-all duration-500 ${
                  openInvoiceId === order.id
                    ? "max-h-[2000px] animate-slide-in-top"
                    : "max-h-0 animate-slide-out-top"
                }`}
              >
                {products
                  .filter((item) => item.order_id === order.id)
                  .map((item) => (
                    <React.Fragment key={item.id}>
                      <svg
                        className="my-9 w-full"
                        xmlns="http://www.w3.org/2000/svg"
                        width="1216"
                        height="2"
                        viewBox="0 0 1216 2"
                        fill="none"
                      >
                        <path d="M0 1H1216" stroke="#D1D5DB" />
                      </svg>

                      <div className="flex max-lg:flex-col items-center gap-8 lg:gap-24 px-3 md:px-11">
                        <div className="grid grid-cols-4 w-full">
                          <div className="col-span-4 sm:col-span-1">
                            <img
                              src={`${item.product?.main_angle}`}
                              alt=""
                              className="max-sm:mx-auto object-cover"
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-3 max-sm:mt-4 sm:pl-8 flex flex-col justify-center max-sm:items-center">
                            <h6 className="font-manrope font-semibold text-2xl leading-9 text-black mb-3 whitespace-nowrap">
                              {item.product?.name}
                            </h6>
                            <p className="font-normal text-lg leading-8 text-gray-500 mb-8 whitespace-nowrap">
                              By: {item.product?.brand}
                            </p>
                            <div className="flex items-center max-sm:flex-col gap-x-10 gap-y-3">
                              <span className="font-normal text-lg leading-8 text-gray-500 whitespace-nowrap">
                                Size: {item.size.toUpperCase()}
                              </span>
                              <span className="font-normal text-lg leading-8 text-gray-500 whitespace-nowrap">
                                Qty: {item.quantity}
                              </span>
                              <p className="font-semibold text-xl leading-8 text-black whitespace-nowrap">
                                Price $
                                {(
                                  (item.price_snapshot ??
                                    item.product_price_snapshot ??
                                    item.product?.price ??
                                    0) / 1
                                ).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-around w-full  sm:pl-28 lg:pl-0">
                          <div className="flex flex-col justify-center items-start max-sm:items-center">
                            <p className="flex underline  text-lg text-gray-500 font-medium text-right leading-8 mb-2  whitespace-nowrap">
                              Status
                            </p>
                            {order.status === "Delivered" ? (
                              <p className="font-semibold flex items-center justify-center text-lg leading-8 text-green-500 text-left whitespace-nowrap">
                                {order.status}

                                <CheckCheck className="ml-1" color="#1CD660" />
                              </p>
                            ) : order.status === "Processing" ? (
                              <p className="font-semibold text-lg flex items-center justify-center leading-8 text-gray-500 text-left whitespace-nowrap">
                                {order.status}
                                <Loader className="ml-1" color="#595959" />
                              </p>
                            ) : order.status === "Deliviring" ? (
                              <p className="font-semibold flex items-center justify-center  text-lg leading-8 text-yellow-600 text-left whitespace-nowrap">
                                {order.status}{" "}
                                <TruckIcon color="#969393" className="ml-1" />
                              </p>
                            ) : (
                              <p className="font-semibold flex items-center justify-center  text-lg leading-8 text-red-600 text-left whitespace-nowrap">
                                {order.status} <LucideX />
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col justify-center items-start max-sm:items-center">
                            <p className="font-normal text-lg text-gray-500 leading-8 mb-2 text-left whitespace-nowrap">
                              {order.status === "Delivered"
                                ? "Delivered on"
                                : "Estimated Delivery"}
                            </p>
                            {order.status === "Delivered" ? (
                              <p className="font-semibold text-lg leading-8 text-black text-left whitespace-nowrap">
                                {new Date(order.updated_at).toLocaleDateString()}
                              </p>
                            ) : (
                              <p className="font-semibold text-lg leading-8 text-black text-left whitespace-nowrap">
                                {new Date(
                                  new Date(order.created_at).getTime() +
                                    4 * 24 * 60 * 60 * 1000
                                ).toLocaleDateString() +
                                  " " +
                                  " - " +
                                  " " +
                                  new Date(
                                    new Date(order.created_at).getTime() +
                                      7 * 24 * 60 * 60 * 1000
                                  ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                <svg
                  className="mt-9 w-full"
                  xmlns="http://www.w3.org/2000/svg"
                  width="1216"
                  height="2"
                  viewBox="0 0 1216 2"
                  fill="none"
                >
                  <path d="M0 1H1216" stroke="#D1D5DB" />
                </svg>

                <div className="px-3 md:px-10 flex items-center justify-between max-sm:flex-col-reverse">
                  <div className="flex max-sm:flex-col-reverse items-center">
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="flex items-center justify-center gap-3 py-8 pr-10 sm:border-r border-gray-300 font-normal text-xl leading-8 text-gray-500 group transition-all duration-500 hover:text-red-600"
                    >
                      <svg
                        width="40"
                        height="41"
                        viewBox="0 0 40 41"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          className="stroke-gray-600 transition-all duration-500 group-hover:stroke-red-600"
                          d="M14.0261 14.7259L25.5755 26.2753M14.0261 26.2753L25.5755 14.7259"
                          strokeWidth=""
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      cancel order
                    </button>
                    <p className="font-normal text-xl leading-8 text-gray-500 sm:pl-8">
                      Payment Is Succesfull
                    </p>
                  </div>
                  <p className="font-medium text-xl leading-8 text-black max-sm:py-4">
                    <span className="text-gray-500">Total Price: </span> &nbsp;$
                    {Number(order.total_amount ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default History;
