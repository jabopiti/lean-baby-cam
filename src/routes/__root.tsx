import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { registerServiceWorker } from "../lib/registerSW";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lean Baby Monitor — Private P2P Baby Monitor" },
      { name: "description", content: "A zero-account, peer-to-peer baby monitor in your browser. No downloads, no signups, just pair and watch." },
      { name: "theme-color", content: "#1a1d3a" },
      { property: "og:title", content: "Lean Baby Monitor — Private P2P Baby Monitor" },
      { property: "og:description", content: "A zero-account, peer-to-peer baby monitor in your browser. No downloads, no signups, just pair and watch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Lean Baby Monitor — Private P2P Baby Monitor" },
      { name: "twitter:description", content: "A zero-account, peer-to-peer baby monitor in your browser. No downloads, no signups, just pair and watch." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/18e997d9-d2ed-473b-b698-ef9aef8a4dba/id-preview-4ae3b8fc--18aa92c1-79f9-4cf8-a7f8-dc5c78304fff.lovable.app-1777223195125.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/18e997d9-d2ed-473b-b698-ef9aef8a4dba/id-preview-4ae3b8fc--18aa92c1-79f9-4cf8-a7f8-dc5c78304fff.lovable.app-1777223195125.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-center" />
    </>
  );
}
