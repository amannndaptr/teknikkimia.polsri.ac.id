'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface Dosen {
    id_dsn: string;
    nama: string;
    nip: string;
    prodi: string;
}

interface Kelas {
    kelas: string;
    prodi: string;
    angkatan: string;
    id_dosen_pa: string | null;
}

export default function DosenPAManager() {
    const [classes, setClasses] = useState<Kelas[]>([]);
    const [dosens, setDosens] = useState<Dosen[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [deletingClass, setDeletingClass] = useState<string | null>(null);
    const [editingClass, setEditingClass] = useState<string | null>(null);
    const [selectedDosenId, setSelectedDosenId] = useState<string>('');
    const [addingNewClass, setAddingNewClass] = useState<boolean>(false);
    const [newClassName, setNewClassName] = useState<string>('');
    const [newClassAngkatan, setNewClassAngkatan] = useState<string>('');
    const [newClassProdi, setNewClassProdi] = useState<string>('');
    const [dosenAssignments, setDosenAssignments] = useState<{ [key: string]: string }>({});
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        setErrorMsg('');
        try {
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
                .from('mahasiswa')
                .select('kelas, prodi, angkatan')
                .order('kelas');

            if (mahasiswaError) throw mahasiswaError;

            const { data: dosenData, error: dosenError } = await supabase
                .from('dosen')
                .select('id_dsn, nama, nip, prodi')
                .order('nama');

            if (dosenError) throw dosenError;

            const uniqueKelasProdiAngkatan: { kelas: string; prodi: string; angkatan: string }[] = [];
            const seenKelasProdiAngkatan = new Set<string>();

            mahasiswaData.forEach(item => {
                if (item.kelas && item.prodi && item.angkatan) {
                    const key = `${item.kelas}-${item.prodi}-${item.angkatan}`;
                    if (!seenKelasProdiAngkatan.has(key)) {
                        uniqueKelasProdiAngkatan.push({ kelas: item.kelas, prodi: item.prodi, angkatan: item.angkatan });
                        seenKelasProdiAngkatan.add(key);
                    }
                }
            });

            const { data: kelasAssignments, error: assignmentError } = await supabase
                .from('kelas_dosen_pa')
                .select('kelas, id_dosen_pa');

            let assignmentMap: { [key: string]: string } = {};

            if (assignmentError || !kelasAssignments) {
                console.warn('Tabel kelas_dosen_pa tidak ditemukan atau error, fallback ke tabel kompensasi.');
                const { data: paAssignments } = await supabase
                    .from('kompensasi')
                    .select('id_dosen_pa, kelas')
                    .not('id_dosen_pa', 'is', null);

                if (paAssignments && paAssignments.length > 0) {
                    paAssignments.forEach(item => {
                        if (item.kelas && item.id_dosen_pa) {
                            assignmentMap[item.kelas] = item.id_dosen_pa;
                        }
                    });
                }
            } else {
                kelasAssignments.forEach(item => {
                    if (item.kelas && item.id_dosen_pa) {
                        assignmentMap[item.kelas] = item.id_dosen_pa;
                    }
                });
            }

            setDosenAssignments(assignmentMap);

            const classesData: Kelas[] = uniqueKelasProdiAngkatan.map(kpa => {
                return {
                    kelas: kpa.kelas,
                    prodi: kpa.prodi,
                    angkatan: kpa.angkatan,
                    id_dosen_pa: assignmentMap[kpa.kelas] || null
                };
            });

            setClasses(classesData);
            setDosens(dosenData || []);
        } catch (error: any) {
            console.error('Error fetching data:', error);
            setErrorMsg('Terjadi kesalahan saat mengambil data: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }

    async function assignDosenToClass(kelas: string) {
        setSaving(true);
        try {
            try {
                await supabase
                    .from('kelas_dosen_pa')
                    .delete()
                    .eq('kelas', kelas);

                await supabase
                    .from('kelas_dosen_pa')
                    .insert({
                        kelas: kelas,
                        id_dosen_pa: selectedDosenId
                    });
            } catch (e: any) {
                if (e.code === '42P01') {
                    console.warn('Tabel kelas_dosen_pa tidak ditemukan, menggunakan alternatif tabel kompensasi untuk assign.');
                    await supabase
                        .from('kompensasi')
                        .delete()
                        .eq('kelas', kelas)
                        .is('id_rekap', null)
                        .eq('status', 'assigned'); // Hapus penugasan lama jika ada
                    
                    const { error } = await supabase
                        .from('kompensasi')
                        .insert({
                            kelas: kelas,
                            id_dosen_pa: selectedDosenId,
                            id_rekap: null,
                            status: 'assigned'
                        });
                    if (error) throw error;
                } else {
                    throw e;
                }
            }

            await supabase
                .from('kompensasi')
                .update({ id_dosen_pa: selectedDosenId })
                .eq('kelas', kelas);

            setClasses(classes.map(c =>
                c.kelas === kelas ? { ...c, id_dosen_pa: selectedDosenId } : c
            ));

            setDosenAssignments({
                ...dosenAssignments,
                [kelas]: selectedDosenId
            });

            setEditingClass(null);
            setSelectedDosenId('');

            alert(`Dosen PA berhasil ditugaskan untuk kelas ${kelas}`);
        } catch (error: any) {
            console.error('Error assigning dosen to class:', error);
            alert('Gagal menugaskan dosen PA: ' + (error.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteClass(className: string) {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus pengelolaan Dosen PA untuk kelas "${className}"? Ini akan menghapus penugasan Dosen PA saat ini untuk kelas tersebut.`)) {
            return;
        }
        setDeletingClass(className);
        let operationError: Error | null = null;

        try {
            const { error: kdpError } = await supabase
                .from('kelas_dosen_pa')
                .delete()
                .eq('kelas', className);

            if (kdpError) {
                if (kdpError.code === '42P01') {
                    console.warn('Tabel kelas_dosen_pa tidak ditemukan, mencoba menghapus dari tabel kompensasi (fallback).');
                    const { error: kompError } = await supabase
                        .from('kompensasi')
                        .delete()
                        .eq('kelas', className)
                        .is('id_rekap', null)
                        .eq('status', 'assigned');

                    if (kompError && kompError.code !== '42P01') {
                        operationError = kompError;
                    }
                } else {
                    operationError = kdpError;
                }
            }

            if (operationError) {
                throw operationError;
            }

            setClasses(prevClasses => prevClasses.filter(c => c.kelas !== className));
            setDosenAssignments(prevAssignments => {
                const newAssignments = { ...prevAssignments };
                delete newAssignments[className];
                return newAssignments;
            });
            alert(`Pengelolaan Dosen PA untuk kelas "${className}" telah berhasil dihapus.`);
        } catch (error: any) {
            console.error('Error deleting class PA assignment:', error);
            alert('Gagal menghapus pengelolaan Dosen PA: ' + (error.message || 'Unknown error'));
        } finally {
            setDeletingClass(null);
        }
    }

    async function addNewClass() {
        const trimmedClassName = newClassName.trim();
        const trimmedProdi = newClassProdi.trim();
        const trimmedAngkatan = newClassAngkatan.trim();

        if (!trimmedClassName || !trimmedProdi || !trimmedAngkatan) {
            alert('Nama kelas, prodi, dan angkatan tidak boleh kosong');
            return;
        }

        if (classes.some(c => c.kelas === trimmedClassName && c.prodi === trimmedProdi && c.angkatan === trimmedAngkatan)) {
            alert(`Kelas ${trimmedClassName} (${trimmedProdi}) angkatan ${trimmedAngkatan} sudah ada.`);
            return;
        }

        setClasses([...classes, { 
            kelas: trimmedClassName, 
            prodi: trimmedProdi, 
            angkatan: trimmedAngkatan, 
            id_dosen_pa: dosenAssignments[trimmedClassName] || null 
        }]);
        setNewClassName('');
        setNewClassProdi('');
        setNewClassAngkatan('');
        setAddingNewClass(false);
    }

    function getDosenName(id: string | null) {
        if (!id) return '-';
        const dosen = dosens.find(d => d.id_dsn === id);
        return dosen ? dosen.nama : '-';
    }

    if (loading) {
        return <div className="text-center py-6 text-gray-500">Memuat data manajemen Dosen PA...</div>;
    }

    if (errorMsg) {
        return (
            <div className="p-4 bg-red-100 border border-red-300 rounded-md">
                <p className="text-red-600">{errorMsg}</p>
                <button
                    onClick={fetchData}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-150"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-700">Daftar Kelas dan Penugasan Dosen PA</h3>
                
            </div>

            {addingNewClass && (
                <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Form Tambah Kelas Baru</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <input
                            type="text"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder="Nama Kelas (contoh: 6IE)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            value={newClassProdi}
                            onChange={(e) => setNewClassProdi(e.target.value)}
                            placeholder="Prodi (contoh: D4 Teknik Energi)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            value={newClassAngkatan}
                            onChange={(e) => setNewClassAngkatan(e.target.value)}
                            placeholder="Angkatan (contoh: 2021)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setAddingNewClass(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-150"
                        >
                            Batal
                        </button>
                        <button
                            onClick={addNewClass}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-150"
                        >
                            Simpan Kelas
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full bg-card divide-y divide-border">
                    <thead>
                        <tr className="bg-muted">
                            <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kelas</th>
                            <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prodi</th>
                            <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Angkatan</th>
                            <th className="py-3 px-4 border-b border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dosen Pembimbing Akademik</th>
                            <th className="py-3 px-4 border-b border-gray-300 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {classes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-4 text-center text-gray-500">Tidak ada data kelas</td>
                            </tr>
                        ) : (
                            classes.map((item, index) => (
                                <tr key={`${item.kelas}-${item.prodi}-${item.angkatan}`} className={index % 2 === 0 ? 'bg-muted/40' : 'bg-gray-50'}>
                                    <td className="py-2 px-4">{item.kelas}</td>
                                    <td className="py-2 px-4">{item.prodi}</td>
                                    <td className="py-2 px-4">{item.angkatan}</td>
                                    <td className="py-2 px-4">{getDosenName(item.id_dosen_pa)}</td>
                                    <td className="py-2 px-4 text-center ">
                                        {editingClass === item.kelas ? (
                                            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                                                <select
                                                    value={selectedDosenId}
                                                    onChange={(e) => setSelectedDosenId(e.target.value)}
                                                    className="px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                >
                                                    <option value="">Pilih Dosen PA</option>
                                                    {dosens
                                                        .filter(dosen => dosen.prodi === item.prodi)
                                                        .map(dosen => (
                                                            <option key={dosen.id_dsn} value={dosen.id_dsn}>
                                                                {dosen.nama} - {dosen.nip} ({dosen.prodi})
                                                            </option>
                                                        ))}
                                                </select>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => assignDosenToClass(item.kelas)}
                                                        disabled={!selectedDosenId || saving}
                                                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {saving ? 'Menyimpan...' : 'Simpan'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingClass(null);
                                                            setSelectedDosenId('');
                                                        }}
                                                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300"
                                                    >
                                                        Batal
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 justify-center items-center">
                                                <button
                                                    onClick={() => {
                                                        setEditingClass(item.kelas);
                                                        setSelectedDosenId(item.id_dosen_pa || '');
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={deletingClass === item.kelas || saving}
                                                >
                                                    {item.id_dosen_pa ? 'Ubah' : 'Pilih'} Dosen PA
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClass(item.kelas)}
                                                    disabled={editingClass === item.kelas || deletingClass === item.kelas || saving}
                                                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {deletingClass === item.kelas ? 'Menghapus...' : 'Hapus'}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 p-3 bg-indigo-50 border border-indigo-200 rounded-md text-sm text-indigo-700">
                <p>Catatan: Dosen PA yang dipilih akan bertanggung jawab untuk memverifikasi kompensasi mahasiswa dari kelas tersebut.</p>
            </div>
        </div>
    );
}