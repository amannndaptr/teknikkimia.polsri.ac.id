'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PenelitianPengabdianDosenPage = () => {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the default sub-page, e.g., daftar dokumen
        router.replace('/pages-dosen/penelitian-pengabdian/daftar');
    }, []);

    // Menampilkan null atau spinner sederhana saat redirecting
    return (
        <div className="flex min-h-screen bg-[#D1D9E6] justify-center items-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em]"></div>
            <p className="ml-3 text-base text-gray-600">Mengarahkan...</p>
        </div>
    );
};

export default PenelitianPengabdianDosenPage;