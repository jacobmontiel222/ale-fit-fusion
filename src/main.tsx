import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initExternalSupabase } from "./lib/initSupabase";

// Initialize external Supabase credentials
initExternalSupabase();

createRoot(document.getElementById("root")!).render(<App />);
