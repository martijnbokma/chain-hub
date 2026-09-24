import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import { App } from "./app";
import { AppErrorPage } from "./components/common/AppErrorPage";
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

// A data router (one splat route; <App> keeps its own <Routes>) so pages can block
// navigation with useBlocker, e.g. the Library editor's unsaved-changes guard.
const router = createBrowserRouter([{ path: "*", element: <App />, errorElement: <AppErrorPage /> }]);

function Root() {
  const { resolved } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors theme={resolved} />
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
