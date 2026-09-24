import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import { App } from "./app";
import { useTheme } from "./hooks/use-theme";
// Fonts ship with the app: the hub is local-first and must not call Google on load.
import "@fontsource-variable/big-shoulders-display";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";

// Every hub read scans the hub folder; don't repeat that on each window focus.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } }
});

function Root() {
  const { resolved } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" richColors theme={resolved} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const container = document.getElementById("root")!;
const rootContainer = container as HTMLElement & { _reactRoot?: ReactDOM.Root };

if (!rootContainer._reactRoot) {
  rootContainer._reactRoot = ReactDOM.createRoot(container);
}

rootContainer._reactRoot.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
