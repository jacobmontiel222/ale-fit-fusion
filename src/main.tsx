import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { initializeFoodDatabase } from "./lib/initFoodDatabase";

// Initialize local food database from CSV (IndexedDB)
initializeFoodDatabase();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);