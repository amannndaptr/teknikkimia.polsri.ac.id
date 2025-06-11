'use client'
import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import SuratKompensasiComponent from '@/components/surat-kompensasi';
import SidebarMahasiswa from '@/components/SidebarMahasiswa'; // Impor SidebarMahasiswa
import { Student, RekapKehadiran, Kompensasi, KompenInfo, DosenPA as DosenPAType } from '../types/index'; // Menggunakan DosenPAType jika ada konflik nama

const supabase = createClient();

interface ProcessedStudentItemForSurat {
    student: Student;
    rekap: RekapKehadiran;
    kompensasi: Kompensasi;
    semesterKelasDisplay: string; // Field baru untuk tampilan semester/kelas
}
  
function SuratKompensasiContent() { // Ganti nama komponen
    const router = useRouter();
    const searchParams = useSearchParams();

    const [originalStudentsData, setOriginalStudentsData] = useState<Array<{ student: Student; rekap: RekapKehadiran; kompensasi: Kompensasi }>>([]);
    const [processedStudentsData, setProcessedStudentsData] = useState<ProcessedStudentItemForSurat[]>([]);
    const [kompenInfo, setKompenInfo] = useState<KompenInfo | null>(null);
    const [dosenPA, setDosenPA] = useState<{ nama: string; nip?: string | null } | null>(null); // Disesuaikan dengan data yang diambil
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [params, setParams] = useState<{ kelasId?: string; kompensasiId?: string }>({});

    useEffect(() => {
        const kelasId = searchParams.get('kelasId') ?? undefined;
        const kompensasiId = searchParams.get('kompensasiId') ?? undefined;
        setParams({ kelasId, kompensasiId });
        loadData();
    }, [searchParams]);

    useEffect(() => {
        if (originalStudentsData.length > 0 && kompenInfo) {
            const newProcessedData = originalStudentsData.map(item => {
                const { student } = item;
                let semesterKelasDisplay = "N/A";

                if (student && kompenInfo.tahun_ajaran && kompenInfo.semester &&
                    student.angkatan && student.prodi && student.kelas) {
                    try {
                        const studentAngkatanNum = parseInt(student.angkatan);
                        const tahunAjaranParts = kompenInfo.tahun_ajaran.split('/');
                        const startYearAjaranNum = parseInt(tahunAjaranParts[0]);

                        if (!isNaN(studentAngkatanNum) && !isNaN(startYearAjaranNum)) {
                            let calculatedSemester;
                            const yearDifference = startYearAjaranNum - studentAngkatanNum;

                            if (yearDifference < 0) {
                                calculatedSemester = 0; // Angkatan di masa depan, tidak valid
                            } else {
                                const baseSemester = yearDifference * 2;
                                calculatedSemester = kompenInfo.semester.toLowerCase() === "ganjil" ? baseSemester + 1 : baseSemester + 2;
                            }

                            let kelasAbbreviation = "";
                            const kelasParts = student.kelas.split('-'); // e.g., "KA-22" -> ["KA", "22"]
                            const kelasCode = kelasParts[0]; // e.g., "KA", "KIA"

                            if (student.prodi.startsWith("D3") && kelasCode && kelasCode.length === 2) {
                                kelasAbbreviation = kelasCode.toUpperCase();
                            } else if (student.prodi.startsWith("D4") && kelasCode && kelasCode.length === 3) {
                                kelasAbbreviation = kelasCode.toUpperCase();
                            } else if (kelasCode) { // Fallback jika prodi bukan D3/D4 tapi ada kode kelas
                                // Jika ada kasus khusus lain, tambahkan di sini
                                // Untuk S2 atau lainnya, mungkin perlu logika berbeda atau biarkan kosong
                                // Contoh: S2 mungkin tidak pakai singkatan kelas seperti ini
                                if (!student.prodi.startsWith("S2")) { // Hindari S2 jika tidak relevan
                                     kelasAbbreviation = kelasCode.toUpperCase();
                                }
                            }


                            if (calculatedSemester > 0 && kelasAbbreviation) {
                                semesterKelasDisplay = `${calculatedSemester}/${kelasAbbreviation}`;
                            } else if (calculatedSemester > 0) { // Jika hanya semester terhitung
                                semesterKelasDisplay = `Semester ${calculatedSemester}`;
                            } else { // Fallback jika semester tidak terhitung
                                semesterKelasDisplay = `${student.kelas || 'N/A'}`;
                            }
                        } else {
                            semesterKelasDisplay = `${student.kelas || 'N/A'}`;
                        }
                    } catch (e) {
                        console.error("Error processing semester/kelas display for student:", student.nim, e);
                        semesterKelasDisplay = `${student.kelas || 'N/A'} - ${student.prodi || 'N/A'}`;
                    }
                } else {
                    semesterKelasDisplay = `${student?.kelas || 'N/A'} - ${student?.prodi || 'N/A'}`;
                }
                return { ...item, semesterKelasDisplay };
            });

            // Urutkan berdasarkan nama mahasiswa secara alfabetis
            newProcessedData.sort((a, b) => a.student.nama.localeCompare(b.student.nama));

            setProcessedStudentsData(newProcessedData);
        } else {
            setProcessedStudentsData([]);
        }
    }, [originalStudentsData, kompenInfo]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const kelasId = searchParams.get('kelasId');
            const kompensasiId = searchParams.get('kompensasiId');

            if (!kelasId) throw new Error('Parameter kelasId tidak ditemukan di URL');
            if (!kompensasiId) throw new Error('Parameter kompensasiId tidak ditemukan di URL');

            const { data: kompensasiData, error: kompensasiError } = await supabase
                .from('kompensasi')
                .select('*')
                .eq('id', kompensasiId)
                .single();
            if (kompensasiError) throw new Error(`Error mengambil data kompensasi: ${kompensasiError.message}`);
            if (!kompensasiData) throw new Error('Data kompensasi tidak ditemukan');

            const { data: studentsInClass, error: studentsError } = await supabase
                .from('mahasiswa')
                .select('*')
                .eq('kelas', kelasId);
            if (studentsError) throw new Error(`Error mengambil data mahasiswa: ${studentsError.message}`);
            if (!studentsInClass || studentsInClass.length === 0) throw new Error('Tidak ada mahasiswa dalam kelas ini');

            const studentsWithRekap = [];
            for (const student of studentsInClass) {
                const { data: rekapData, error: rekapError } = await supabase
                    .from('rekap_kehadiran')
                    .select('*')
                    .eq('id_mhs', student.id_mhs)
                    .eq('id_kompensasi', kompensasiId)
                    .single();
                if (!rekapError && rekapData) {
                    studentsWithRekap.push({ student, rekap: rekapData, kompensasi: kompensasiData });
                }
            }
            if (studentsWithRekap.length === 0) throw new Error('Tidak ada mahasiswa yang memiliki data kompensasi di kelas ini');
            setOriginalStudentsData(studentsWithRekap);

            let fetchedDosenPa = null;
            if (kompensasiData.id_dosen_pa) {
                const { data: dosenData, error: dosenError } = await supabase
                    .from('dosen')
                    .select('nama, nip')
                    .eq('id_dsn', kompensasiData.id_dosen_pa)
                    .single();
                if (!dosenError && dosenData) fetchedDosenPa = dosenData;
            }
            if (fetchedDosenPa) setDosenPA(fetchedDosenPa);

            const { data: kompenInfoData, error: kompenInfoError } = await supabase
                .from('kompen_info')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (kompenInfoError && kompenInfoError.code !== 'PGRST116') throw new Error(`Error mengambil informasi kompensasi: ${kompenInfoError.message}`);
            if (kompenInfoData) setKompenInfo(kompenInfoData);

        } catch (error) {
            console.error('Error loading data:', error);
            setError(error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="text-center p-8 max-w-md bg-white rounded-xl shadow-lg">
                    <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
                    <p className="text-lg text-gray-700">Memuat data surat kompensasi...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                        <div className="bg-red-500 p-4"><h2 className="text-xl font-bold text-white">Error</h2></div>
                        <div className="p-6">
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6"><p className="text-red-700">{error}</p></div>
                            <div className="mt-6 p-5 bg-gray-50 rounded-lg text-sm">
                                <p className="font-semibold text-gray-700 mb-2">Informasi Debug:</p>
                                <p>URL Parameters: kelasId={params.kelasId || "tidak ada"}, kompensasiId={params.kompensasiId || "tidak ada"}</p>
                                <p className="mt-3 text-gray-600">URL yang benar seharusnya seperti:</p>
                                <p className="font-mono bg-gray-100 p-3 mt-1 rounded-md text-xs break-all">/pages-mahasiswa/kompensasi/surat?kelasId=KA-22&kompensasiId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (originalStudentsData.length === 0) { // Check original data for this condition
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                        <div className="bg-yellow-500 p-4"><h2 className="text-xl font-bold text-white">Informasi</h2></div>
                        <div className="p-6">
                            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-6"><p className="text-yellow-800">Tidak ada data mahasiswa untuk membuat surat kompensasi.</p></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const kelasName = originalStudentsData.length > 0 ? originalStudentsData[0].student.kelas : "Unknown";

    // Helper to transform dosenPA to the expected type for SuratKompensasiComponent
    const transformedDosenPAForComponent = dosenPA
        ? {
            nama: dosenPA.nama,
            nip: dosenPA.nip === null ? undefined : dosenPA.nip,
        } : undefined;

    return (
        <div className="min-h-screen bg-sky-100 flex"> {/* Latar utama dan flexbox disesuaikan */}
            <SidebarMahasiswa />
            <main className="flex-1 p-4 ml-72"> {/* Konten utama diberi margin kiri */}
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-sky-700 flex items-center"> {/* Warna teks judul diubah */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> {/* Warna ikon diubah */}
                        Surat Kompensasi Kelas {kelasName}
                    </h1>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-sky-600 p-5"><h2 className="text-xl font-semibold text-white">Informasi Mahasiswa Kelas {kelasName}</h2></div> {/* Latar header kartu diubah */}
                    <div className="p-6">
                        <div className="mb-8">
                            <div className="bg-sky-50 p-4 rounded-lg mb-4"><p className="text-sky-700 font-medium">Jumlah Mahasiswa: {processedStudentsData.length} orang</p></div> {/* Styling info jumlah mahasiswa diubah */}
                            <div className="overflow-auto">
                                <table className="min-w-full divide-y divide-sky-200"> {/* Pembatas tabel disesuaikan */}
                                    <thead className="bg-sky-50"> {/* Latar header tabel diubah */}
                                        <tr>
                                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-sky-700 uppercase tracking-wider">No</th> {/* Warna teks header tabel diubah */}
                                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-sky-700 uppercase tracking-wider">Nama</th>
                                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-sky-700 uppercase tracking-wider">NIM</th>
                                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-sky-700 uppercase tracking-wider">Menit Tidak Hadir</th>
                                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-sky-700 uppercase tracking-wider">Semester/Kelas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-sky-200"> {/* Pembatas body tabel disesuaikan */}
                                        {processedStudentsData.map((item, idx) => (
                                            <tr key={item.student.id_mhs} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">{idx + 1}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">{item.student.nama}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">{item.student.nim}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">{item.rekap.menit_tidak_hadir || 0}</td> {/* Menghilangkan kata "menit" */}
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">{item.semesterKelasDisplay}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="border-t border-sky-200 pt-6"> {/* Border pemisah diubah */}
                            <div className="bg-white p-6 rounded-lg">
                                {/* 
                                    PENTING: Komponen SuratKompensasiComponent perlu dimodifikasi 
                                    untuk menggunakan `item.semesterKelasDisplay` dari setiap item di `studentsData` (yang sekarang adalah processedStudentsData).
                                */}
                                <SuratKompensasiComponent
                                    studentsData={processedStudentsData}
                                    kompenInfo={kompenInfo}
                                    dosenPA={transformedDosenPAForComponent}
                                    showPreview={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </main>
        </div>
    );
}

// Komponen Halaman Utama yang akan diekspor
export default function SuratKompensasiPage() {
    return (
        // Bungkus komponen yang menggunakan useSearchParams dengan Suspense
        // Pastikan fallback UI cukup informatif dan ringan
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50"><div className="text-center p-8 max-w-md bg-white rounded-xl shadow-lg"><div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div><p className="text-lg text-gray-700">Memuat halaman surat kompensasi...</p></div></div>}>
            <SuratKompensasiContent />
        </Suspense>
    );
}