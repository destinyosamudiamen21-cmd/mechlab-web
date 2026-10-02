import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ApiError } from "./api/client";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Course content changes rarely: treat it as fresh for 5 minutes.
      staleTime: 5 * 60 * 1000,
      // Retry flaky campus Wi-Fi twice, but never retry a 404: it won't fix itself.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status === 404) &&
        failureCount < 2,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
