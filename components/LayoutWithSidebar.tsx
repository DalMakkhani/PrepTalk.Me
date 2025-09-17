"use client";
import { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import ClientHeader from "@/components/ClientHeader";
import AppSidebar from "@/components/AppSidebar";

export default function LayoutWithSidebar({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Center auth/main pages if sidebar is hidden
  if (isAuthPage) {
    return (
      <div className="min-h-screen flex flex-col">
        <ClientHeader />
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider>
        <ClientHeader />
        <div className="flex-1 flex flex-col min-h-screen">
          <div className="h-full w-64 fixed top-16 left-0 z-30">
            <AppSidebar />
          </div>
          <div className="flex-1 flex flex-col min-h-0" style={{marginLeft: '16rem'}}>
            <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{marginTop: '32px'}}>
              <div className="container mx-auto">{children}</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
