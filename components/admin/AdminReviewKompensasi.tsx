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

export interface AdminReviewKompensasiProps {
    onReviewSuccess: () => void;
}

export default function AdminReviewKompensasi({ onReviewSuccess }: AdminReviewKompensasiProps) {
    const [pengajuanList, setPengajuanList] = useState<PengajuanKompensasi[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchPengajuan();
    }, []);

    async function fetchPengajuan() {
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
                .eq('status', 'pending_admin_review')
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            const formattedData = data.map(item => ({
                ...item,
                nama_sekretaris: (item.sekretaris as any)?.nama || 'N/A',
                nama_dosen_pa: (item.dosen_pa as any)?.nama || 'N/A',
            }));
            setPengajuanList(formattedData as PengajuanKompensasi[]);

        } catch (err: any) {
            console.error('Error fetching pengajuan kompensasi:', err);
            setError('Gagal memuat data pengajuan: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }

    async function handleReview(id: string, newStatus: 'admin_verified' | 'admin_rejected') {
        setProcessingId(id);
        try {
            const { error: updateError } = await supabase
                .from('kompensasi')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (updateError) throw updateError;

            await fetchPengajuan();
            alert(`Pengajuan berhasil di-${newStatus === 'admin_verified' ? 'setujui' : 'tolak'}.`);
            onReviewSuccess();

        } catch (err: any) {
            console.error(`Error ${newStatus === 'admin_verified' ? 'approving' : 'rejecting'} kompensasi:`, err);
            alert(`Gagal memproses pengajuan: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingId(null);
        }
    }

    if (loading) return <div className="text-center py-6 text-gray-500">Memuat data pengajuan...</div>;
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-md border border-red-300">{error}</div>;

    return (
        <div>
            {pengajuanList.length === 0 ? (
                <p className="text-center py-6 text-gray-500">Tidak ada pengajuan kompensasi yang menunggu review.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full bg-card divide-y divide-border">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kelas</th>
                                <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sekretaris</th>
                                <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dosen Pembimbing Akademik</th>
                                <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal Pengajuan</th>
                                <th className="py-3 px-4 border-b border-gray-300 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pengajuanList.map((item, index) => (
                                <tr key={item.id} className={index % 2 !== 0 ? 'bg-muted/40' : ''}>
                                    <td className="py-2 px-4 border-b">{item.kelas}</td>
                                    <td className="py-2 px-4 border-b">{item.nama_sekretaris}</td>
                                    <td className="py-2 px-4 border-b">{item.nama_dosen_pa}</td>
                                    <td className="py-2 px-4 border-b">
                                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="py-2 px-4 border-b text-center space-x-2">
                                        <button
                                            onClick={() => handleReview(item.id, 'admin_verified')}
                                            disabled={processingId === item.id}
                                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                                        >
                                            {processingId === item.id ? 'Memproses...' : 'Setujui'}
                                        </button>
                                        <button
                                            onClick={() => handleReview(item.id, 'admin_rejected')}
                                            disabled={processingId === item.id}
                                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                                        >
                                            {processingId === item.id ? 'Memproses...' : 'Tolak'}
                                        </button>
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
// AdminReviewKompensasi yang ada di d:\Project\si_tekkim\app\pages-admin\kompensasi\page.tsx
// (baris 404-441)