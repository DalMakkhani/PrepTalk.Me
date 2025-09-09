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

  return (
    <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
      <div className="p-6 border-b flex items-center gap-2">
        <Mic className="h-6 w-6 text-blue-700" />
        <span className="text-xl font-bold text-blue-700">PrepTalk</span>
      </div>
      <nav className="flex-1 p-4">
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
      <div className="p-4 border-t">
        <div className="text-xs text-gray-500 mb-2">User: demo-user</div>
        <div className="text-xs text-gray-400">Connected to MongoDB Atlas</div>
      </div>
    </aside>
  );
}
