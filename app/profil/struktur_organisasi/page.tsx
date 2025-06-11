"use client"

import { FC, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from '@/utils/supabase/client';

interface Dosen {
    id_dsn: string;
    nama: string;
    nip: string;
    email: string;
    nidn: string;
    prodi: string;
    foto?: string;
}

interface DosenPosition extends Dosen {}

interface JabatanStruktural {
    id: string;
    title: string;
    dosen_id: string | null;
    category: 'pimpinan' | 'kps' | 'laboratorium';
    order: number;
    dosen?: DosenPosition;
}

const StrukturOrganisasi: FC = () => {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [pimpinan, setPimpinan] = useState<JabatanStruktural[]>([]);
    const [ketuaProdi, setKetuaProdi] = useState<JabatanStruktural[]>([]);
    const [kepalaLab, setKepalaLab] = useState<JabatanStruktural[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: positions, error: positionsError } = await supabase
                    .from('struktural_jabatan')
                    .select('id, title, dosen_id, category, order')
                    .order('category, order');

                if (positionsError) throw positionsError;

                const dosenIds = positions.filter(p => p.dosen_id !== null).map(p => p.dosen_id);
                const { data: dosenData, error: dosenError } = await supabase
                    .from('dosen')
                    .select('id_dsn, nama, nip, email, nidn, prodi, foto')
                    .in('id_dsn', dosenIds);

                if (dosenError) throw dosenError;

                const dosenMap: Record<string, DosenPosition> = {};
                dosenData.forEach(d => {
                    dosenMap[d.id_dsn] = d;
                });

                const positionsWithDosen = positions.map(position => ({
                    ...position,
                    dosen: position.dosen_id ? dosenMap[position.dosen_id] : undefined
                }));

                setPimpinan(positionsWithDosen.filter(p => p.category === 'pimpinan'));
                setKetuaProdi(positionsWithDosen.filter(p => p.category === 'kps'));
                setKepalaLab(positionsWithDosen.filter(p => p.category === 'laboratorium'));
            } catch (err: any) {
                setError('Gagal memuat data struktur organisasi.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const renderPersonCard = (position: JabatanStruktural) => {
        const { dosen } = position;

        return (
            <div key={position.id} className="p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200">
                {dosen ? (
                    <div className="flex gap-4 items-center">
                        <div className="w-20 h-20 overflow-hidden rounded-xl bg-gray-100">
                            {dosen.foto ? (
                                <Image
                                    src={dosen.foto}
                                    alt={dosen.nama}
                                    width={80}
                                    height={80}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl text-gray-500 font-semibold">
                                    {dosen.nama.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">{dosen.nama}</h3>
                            <p className="text-sm text-gray-600">NIP: {dosen.nip}</p>
                            <p className="text-sm font-medium text-maroon-800">{position.title}</p>
                        </div>
                    </div>
                ) : (
                    <div className="opacity-50">
                        <h3 className="text-lg font-semibold text-maroon-700">{position.title}</h3>
                        <p className="text-gray-500 italic">Posisi belum ditempati</p>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-200">
                <div className="animate-pulse text-lg">Memuat data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-200">
                <div className="p-6 text-red-700 border border-red-300 rounded-md bg-red-50">
                    <p className="font-semibold text-xl mb-2">Terjadi Kesalahan</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <main className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-6 md:px-10 font-sans">
            <section className="max-w-7xl mx-auto space-y-8">
                <header className="text-center space-y-8">
                    <h1 className="text-3xl font-bold text-maroon-700 mb-120 text-center">
                        Struktur Organisasi Jurusan Teknik Kimia
                    </h1>
                    <p className="text-lg text-gray-700 mb-8 text-justify">
                    Jurusan ini terdiri atas Ketua Jurusan, Sekretaris Jurusan, empat Kepala Program Studi (DIII Teknik Kimia, DIV Teknik Energi, DIV Teknologi Kimia Industri, S2 Energi Terbarukan, dan DIII Teknik Kimia PSDKU SIAK), serta empat Kepala Laboratorium (Laboratorium Analisis, Laboratorium Rekayasa, Laboratorium Energi, dan Laboratorium Mini Plant). Setiap unit didukung oleh dosen dan tenaga yang kompeten.
                    </p>
                </header>

                <section className="w-full h-[400px] md:h-[600px] relative overflow-hidden">
                    <Image
                        src="/struktur-organisasi.jpg"
                        alt="Struktur Organisasi Jurusan Teknik Kimia POLSRI"
                        fill
                        className="object-contain"
                    />
                </section>

                {pimpinan.length > 0 && (
                    <section>
                        <h2 className="text-2xl md:text-2xl font-bold text-maroon-700 mb-6 text-center">Pimpinan Jurusan</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            {pimpinan.map(renderPersonCard)}
                        </div>
                    </section>
                )}

                {ketuaProdi.length > 0 && (
                    <section>
                        <h2 className="text-2xl md:text-2xl font-bold text-maroon-700 mb-6 text-center">Ketua Program Studi</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            {ketuaProdi.map(renderPersonCard)}
                        </div>
                    </section>
                )}

                {kepalaLab.length > 0 && (
                    <section>
                        <h2 className="text-2xl md:text-2xl font-bold text-maroon-700 mb-6 text-center">Kepala Laboratorium</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            {kepalaLab.map(renderPersonCard)}
                        </div>
                    </section>
                )}
            </section>
        </main>
    );
};

export default StrukturOrganisasi;
