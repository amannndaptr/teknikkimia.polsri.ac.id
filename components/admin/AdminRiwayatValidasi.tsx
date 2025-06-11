'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface PengajuanKompensasi {
    id: string;
    kelas: string;
    id_sekretaris: string;
    nama_sekretaris?: string;
    id_dosen_pa: string;
    nama_dosen_pa?: string;
    status: string;
    created_at: string;
    updated_at: string | null;
}

export default function AdminRiwayatValidasi() {
    const [riwayatList, setRiwayatList] = useState<PengajuanKompensasi[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRiwayat();
    }, []);

    async function fetchRiwayat() {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('kompensasi')
                .select(`
                    id,
                    kelas,
                    id_sekretaris,
                    sekretaris:mahasiswa (nama),
                    id_dosen_pa,
                    dosen_pa:dosen (nama),
                    status,
                    created_at,
                    updated_at
                `)
                .in('status', ['admin_verified', 'admin_rejected'])
                .order('updated_at', { ascending: false });

            if (fetchError) throw fetchError;

            const formattedData = data.map(item => ({
                ...item,
                nama_sekretaris: (item.sekretaris as any)?.nama || 'N/A',
                nama_dosen_pa: (item.dosen_pa as any)?.nama || 'N/A',
            }));
            setRiwayatList(formattedData as PengajuanKompensasi[]);

        } catch (err: any) {
            console.error('Error fetching riwayat validasi:', err);
            setError('Gagal memuat data riwayat: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="text-center py-6 text-gray-500">Memuat data riwayat...</div>;
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-md border border-red-300">{error}</div>;

    return (
        <div>
            {riwayatList.length === 0 ? (
                <p className="text-center py-6 text-gray-500">Belum ada riwayat validasi.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full bg-card divide-y divide-border">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kelas</th>
                                <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sekretaris</th>
                                <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dosen Pembimbing Akademik</th>
                                <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tgl Validasi</th>
                                <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {riwayatList.map((item, index) => (
                                <tr key={item.id} className={index % 2 !== 0 ? 'bg-muted/40' : ''}>
                                    <td className="py-2 px-4 border-b">{item.kelas}</td>
                                    <td className="py-2 px-4 border-b">{item.nama_sekretaris}</td>
                                    <td className="py-2 px-4 border-b">{item.nama_dosen_pa}</td>
                                    <td className="py-2 px-4 border-b">
                                        {new Date(item.updated_at || item.created_at).toLocaleDateString('id-ID', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="py-2 px-4 border-b">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            item.status === 'admin_verified' 
                                                ? 'bg-green-100 text-green-700' 
                                                : item.status === 'admin_rejected' 
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-gray-100 text-gray-700' // Fallback style untuk status lain jika ada
                                            }`}>
                                            {item.status === 'admin_verified' ? 'Disetujui Admin' : item.status === 'admin_rejected' ? 'Ditolak Admin' : item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Catatan: Isi dari <thead> dan <tbody> untuk tabel di atas perlu disalin dari definisi
// AdminRiwayatValidasi yang ada di d:\Project\si_tekkim\app\pages-admin\kompensasi\page.tsx
// (baris 485-514)