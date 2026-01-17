import { useState, useEffect, use } from 'react';
import { Outlet } from "react-router-dom";
import { supabase } from './supabaseClient'; // Make sure this is imported
import Navbar from "./views/Navbar";
import Footer from "./views/Footer";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1. Check active session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
  }, [session]);
// console.log("Current session:", session);
  return (
    <div>
      {/* Navbar gets it via standard props because it's right here */}
      <Navbar session={session} />
      <ToastContainer/>
      
      <main>
        {/* THE MAGIC PART: Pass session to all children */}
        <Outlet context={session} />
      </main>
      
      <Footer />
    </div>
  );
}

export default App;