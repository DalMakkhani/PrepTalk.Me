"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientHeader() {
  const [user, setUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setUser(typeof window !== "undefined" ? localStorage.getItem("preptalk_user") : null);
    // Listen for login/logout events from other components
    const onStorage = () => {
      setUser(localStorage.getItem("preptalk_user"));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Listen for login/logout events within the same tab (e.g., after login without refresh)
  useEffect(() => {
    const interval = setInterval(() => {
      setUser(localStorage.getItem("preptalk_user"));
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("preptalk_user");
    setUser(null);
    router.push("/login");
  };

  return (
    <header className="bg-blue-700 text-white p-4 flex justify-between items-center w-full">
      <span className="font-bold text-xl">PrepTalk</span>
      <div className="flex gap-2">
        {user ? (
          <button
            onClick={handleLogout}
            className="bg-white text-blue-700 px-4 py-2 rounded font-semibold hover:bg-blue-100 transition"
          >
            Logout
          </button>
        ) : (
          <>
            <button
              onClick={() => router.push("/login")}
              className="bg-white text-blue-700 px-4 py-2 rounded font-semibold hover:bg-blue-100 transition"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/register")}
              className="bg-blue-600 text-white px-4 py-2 rounded border border-white font-semibold hover:bg-blue-500 transition"
            >
              Register
            </button>
          </>
        )}
      </div>
    </header>
  );
}
