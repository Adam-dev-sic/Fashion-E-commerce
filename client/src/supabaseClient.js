import { createClient } from "@supabase/supabase-js";

// Get these from your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = "https://ekkczarzlaqcbszrfrkk.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2N6YXJ6bGFxY2JzenJmcmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTQzNTUsImV4cCI6MjA4MDc3MDM1NX0.ocwzXVM-raqjj1SeHZ0Q_yB6fNF7cG7v8K41KkS9pAU";

export const supabase = createClient(supabaseUrl, supabaseKey);
