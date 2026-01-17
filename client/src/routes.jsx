import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import Product from "./views/Product";
import ProductsLayout from "./views/ProductsLayout";
import Checkout from "./views/Checkout";
import MainLayout from "./views/MainLayout";
import AdminInterface from "./views/AdminInterface";
import Authentication from "./views/Authentication";
import History from "./views/History";
import Wishlist from "./views/Wishlist";
import Account from "./views/Account";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <MainLayout /> },
      { path: "product/:id?", element: <Product /> },
      // App.js / Router file
      { path: "products", element: <ProductsLayout /> },
      // { path: "products", element: <ProductsLayout /> },
      // { path: "products/tag/:tag", element: <ProductsLayout /> },

      { path: "checkout", element: <Checkout /> },
      { path: "interface", element: <AdminInterface /> },
      { path: "authentication", element: <Authentication /> },
      { path: "orders", element: <History /> },
      { path: "wishlist", element: <Wishlist /> },
      { path: "account", element: <Account/> },

      //   { path: "lily", element: <Mylove /> },
    ],
  },
]);
