"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import * as React from "react";

import { RealtimeBoundary } from "@/lib/ws/RealtimeBoundary";
import { CommandPaletteProvider } from "@/components/shell/CommandPalette";
import { LanguageProvider } from "@/lib/i18n";
import { useSession } from "@/lib/auth/session";

export function Providers({ children }: { children: React.ReactNode }) {
  // Hydrate token store from localStorage once on mount.
  React.useEffect(() => {
    useSession.getState().hydrate();
  }, []);

  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (count, err: unknown) => {
              const status = (err as { status?: number } | null)?.status;
              if (status && status < 500) return false;
              return count < 3;
            },
          },
          mutations: { retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <RealtimeBoundary>
          <CommandPaletteProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              richColors={false}
              toastOptions={{
                classNames: {
                  toast:
                    "border border-white/[0.08] bg-ink-50/95 backdrop-blur-md text-bone font-sans text-[12.5px]",
                },
              }}
            />
          </CommandPaletteProvider>
        </RealtimeBoundary>
      </ThemeProvider>
      </LanguageProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
