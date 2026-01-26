"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminAuthWrapper() {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if the user is authenticated
    const status = localStorage.getItem("is_admin") === "true";
    setIsAdmin(status);
  }, [pathname]);

  // LOGIC: 
  // 1. Must be logged in (isAdmin)
  // 2. Must be on an admin route (startsWith("/admin"))
  // 3. Must NOT be on the login page
  // 4. Must NOT be on the dashboard itself (since we're already there)
  
  const isLoginPage = pathname === "/admin/login";
  const isDashboard = pathname === "/admin/scan-dashboard";
  const isAdminPath = pathname.startsWith("/admin");

  if (!isAdmin || !isAdminPath || isLoginPage || isDashboard) {
    return null;
  }

  return (
    <Link href="/admin/scan-dashboard" className="admin-icon-pill" title="Return to Dashboard">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      <div className="mini-pulse"></div>
    </Link>
  );
}