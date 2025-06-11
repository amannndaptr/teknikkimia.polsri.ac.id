'use client'

import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin
import { Users, BookUser } from 'lucide-react';
import DosenPAManager from '@/components/admin/DosenPAManager'; // Impor dari lokasi komponen baru

export default function KelolaDosenPAPage() {
    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="w-full max-w-6xl mx-auto"> {/* Max width bisa disesuaikan */}
                    <header className="mb-8">
                        <h1 className="text-2xl font-bold text-foreground flex items-center">
                            <Users className="mr-3 w-6 h-6 text-primary" />
                            Manajemen Dosen Pembimbing Akademik
                        </h1>
                    </header>

                    <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
                        <DosenPAManager />
                    </div>
                </div>
            </main>
        </div>
    );
}