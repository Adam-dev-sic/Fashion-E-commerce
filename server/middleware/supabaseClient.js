import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Get these from your Supabase Dashboard -> Project Settings -> API
// const supabaseUrl = "https://ekkczarzlaqcbszrfrkk.supabase.co";
// const supabaseKey =
  // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2N6YXJ6bGFxY2JzenJmcmtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE5NDM1NSwiZXhwIjoyMDgwNzcwMzU1fQ.9zpkSB5bkn6URBEQC1zDsvWkZgd2tqSC5gLdv4Oqub4";

export const supabase = createClient(supabaseUrl, supabaseKey);
