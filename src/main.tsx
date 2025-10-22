import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { loadFoodsToSupabase } from "./lib/loadFoodsToSupabase";

// Load food database to Supabase on first load
loadFoodsToSupabase().catch(console.error);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
