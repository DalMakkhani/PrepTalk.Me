import * as React from "react";
import Link from "next/link";
import { Home, Mic, BarChart2, FileText, MessageSquare, User } from "lucide-react";

export default function AppSidebar() {
  const menuItems = [
    { title: "Home", icon: Home, href: "/" },
    { title: "Practice Interview", icon: Mic, href: "/practice" },
    { title: "Feedback Reports", icon: FileText, href: "/reports" },
    { title: "Progress Dashboard", icon: BarChart2, href: "/dashboard" },
    { title: "Chatbot Assistant", icon: MessageSquare, href: "/assistant" },
    { title: "My Profile", icon: User, href: "/profile" },
  ];

  const [userEmail, setUserEmail] = React.useState<string>("");
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("preptalk_user") || "";
      setUserEmail(email);
      // Listen for login/logout events from other components
      const onStorage = () => {
        setUserEmail(localStorage.getItem("preptalk_user") || "");
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
  }, []);

  return (
    <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
      {/* Removed PrepTalk logo/header from sidebar */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.title}>
              <Link href={item.href} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 transition">
                <item.icon className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t" style={{marginTop: 'auto'}}>
        <div className="text-xs text-gray-500 mb-2">Signed in as:</div>
        <div className="text-sm font-semibold text-gray-700 truncate">{userEmail}</div>
      </div>
    </aside>
  );
}
