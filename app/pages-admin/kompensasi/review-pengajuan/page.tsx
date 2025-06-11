'use client'

import { useState } from 'react';
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin
import { FileCheck2, History, ListChecks } from 'lucide-react';
import AdminReviewKompensasi from '@/components/admin/AdminReviewKompensasi'; // Impor dari lokasi komponen baru
import AdminRiwayatValidasi from '@/components/admin/AdminRiwayatValidasi'; // Impor dari lokasi komponen baru

export default function ReviewPengajuanPage() {
    const [riwayatRefreshTrigger, setRiwayatRefreshTrigger] = useState(0);

    const handleReviewSuccess = () => {
        setRiwayatRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="w-full max-w-6xl mx-auto"> {/* Max width bisa disesuaikan */}
                    <header className="mb-8">
                        <h1 className="text-2xl font-bold text-foreground flex items-center">
                            <ListChecks className="mr-3 w-6 h-6 text-primary" />
                            Review Pengajuan Kompensasi
                        </h1>
                    </header>

                    <div className="bg-card rounded-xl shadow-lg p-6 mb-8 border border-border">
                        <h2 className="text-xl font-semibold text-card-foreground mb-5 flex items-center">
                            <FileCheck2 className="mr-2 w-5 h-5 text-muted-foreground" />
                            Review Pengajuan Kompensasi dari Sekretaris
                        </h2>
                        <AdminReviewKompensasi onReviewSuccess={handleReviewSuccess} />
                    </div>

                    <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
                        <h2 className="text-xl font-semibold text-card-foreground mb-5 flex items-center">
                            <History className="mr-2 w-5 h-5 text-muted-foreground" />
                            Riwayat Validasi Pengajuan Kompensasi
                        </h2>
                        <AdminRiwayatValidasi key={riwayatRefreshTrigger} />
                    </div>
                </div>
            </main>
        </div>
    );
}