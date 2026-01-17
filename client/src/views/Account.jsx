import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import { LogOut, Heart, PackageCheck } from 'lucide-react';

// Account page - reads session from parent via useOutletContext()
// - Shows user name + email (from session)
// - Sidebar links: Orders, Wishlist
// - Logout button
// - If no session: show message asking user to sign in

export default function Account() {
  // Expect the parent route to provide `session` via <Outlet context={session} />
  const session = useOutletContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If there's no session, we keep the UI showing a message (no fetch needed)
  }, [session]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const user = session?.user ?? null;
  const displayName =
    user?.user_metadata?.name || user?.user_metadata?.display_name ||
    (user?.email ? user.email.split('@')[0] : 'Your name');

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-semibold mb-2">You’re not signed in</h2>
          <p className="text-sm text-gray-600 mb-6">Please sign in to access your account dashboard.</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/authentication" className="px-4 py-2 bg-black text-white rounded-md font-medium">Sign in</Link>
            <Link to="/" className="px-4 py-2 border border-gray-200 rounded-md">Continue browsing</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="bg-white rounded-xl shadow-sm p-5 h-full">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Account</h3>
            <p className="text-sm text-gray-500 mt-1">Manage your profile & orders</p>
          </div>

          <nav className="space-y-2">
            <Link
              to="/orders"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PackageCheck className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Orders</span>
            </Link>

            <Link
              to="/wishlist"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Heart className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Wishlist</span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-red-50 text-red-600 mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Log out</span>
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="md:col-span-3 space-y-6">
          {/* Profile card */}
          <section className="bg-white rounded-xl shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* <Link
                to="/account/profile/edit"
                className="inline-block px-4 py-2 border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Edit profile
              </Link> */}

              <button
                onClick={handleLogout}
                className="inline-block px-4 py-2 bg-black text-white rounded-md text-sm font-semibold hover:opacity-95"
                disabled={loading}
              >
                Sign out
              </button>
            </div>
          </section>

          {/* Quick actions */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/orders" className="block bg-white rounded-xl p-5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Orders</h3>
                  <p className="text-sm text-gray-500 mt-1">View recent orders & tracking</p>
                </div>
                <div className="text-sm text-gray-400">→</div>
              </div>
            </Link>

            <Link to="/wishlist" className="block bg-white rounded-xl p-5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Wishlist</h3>
                  <p className="text-sm text-gray-500 mt-1">Saved items you love</p>
                </div>
                <div className="text-sm text-gray-400">→</div>
              </div>
            </Link>
          </section>

          {/* Recent orders placeholder */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Recent orders</h3>
            <div className="text-sm text-gray-500">You haven't placed any orders yet.</div>
          </section>

          {/* Wishlist placeholder */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Wishlist</h3>
            <div className="text-sm text-gray-500">No items in wishlist.</div>
          </section>
        </main>
      </div>
    </div>
  );
}
