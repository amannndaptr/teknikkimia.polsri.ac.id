"use client";

import React, { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface LayoutWrapperProps {
    children: ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
    const pathname = usePathname();

    // Cek apakah halaman adalah dashboard
    const isDashboard =
            pathname.startsWith("/pages-admin") || pathname.startsWith("/pages-mahasiswa") || pathname.startsWith("/pages-dosen") || pathname.startsWith("/pages-hmj") || pathname.startsWith("/pages-alumni");

    const isAuth =
        pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

    return (
        <>
            {!isDashboard && !isAuth && <Navbar />}
            {children}
            {!isDashboard && !isAuth && <Footer />}
        </>
    );
}
