'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import SidebarMahasiswa from '@/components/SidebarMahasiswa'; // Impor SidebarMahasiswa
import { useRouter } from 'next/navigation';

// TypeScript interfaces
interface Kuesioner {
    id: string;
    judul: string;
    deskripsi: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string;
    status: string;
}

interface Pertanyaan {
    id: string;
    kuesioner_id: string;
    pertanyaan: string;
    jenis_jawaban: 'skala_likert' | 'text'; // Disesuaikan dengan admin
    urutan: number;
}

interface Opsi {
    id: string;
    pertanyaan_id: string;
    teks: string;
    nilai: number | null;
    urutan: number;
}

interface Dosen {
    id_dsn: string;
    nama: string;
    prodi: string;
}

interface Mahasiswa {
    id_mhs: string;
    nama: string;
    prodi: string;
}

interface Jawaban {
    pertanyaan_id: string;
    dosen_id: string;
    jawaban_teks: string | null;
    opsi_id: string | null; // ID opsi yang dipilih untuk skala likert
}

// Track which kuesioner-dosen combinations have been completed
interface CompletedResponse {
    kuesioner_id: string;
    dosen_id: string;
}

const KuesionerSystem = () => {
    const [kuesioners, setKuesioners] = useState<Kuesioner[]>([]);
    const [pertanyaans, setPertanyaans] = useState<Pertanyaan[]>([]);
    const [opsis, setOpsis] = useState<Opsi[]>([]);
    const [dosens, setDosens] = useState<Dosen[]>([]);
    const [mahasiswa, setMahasiswa] = useState<Mahasiswa | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Page state
    const [activePage, setActivePage] = useState<'list' | 'form'>('list');

    // Selection state
    const [selectedKuesioner, setSelectedKuesioner] = useState<string | null>(null);
    const [selectedDosen, setSelectedDosen] = useState<string | null>(null);

    // Form state for user responses
    const [responses, setResponses] = useState<{ [key: string]: Jawaban }>({});
    const [submitting, setSubmitting] = useState(false);
    const [loadingPertanyaan, setLoadingPertanyaan] = useState(false);

    // Track completed responses
    const [completedResponses, setCompletedResponses] = useState<CompletedResponse[]>([]);

    // Track available lecturers for the selected kuesioner
    const [availableDosens, setAvailableDosens] = useState<Dosen[]>([]);

    const router = useRouter();
    const supabase = createClient();

    // Fetch authenticated user data
    const fetchUserData = async () => {
        try {
            setLoading(true);
            const { data: userData, error: authError } = await supabase.auth.getUser();

            if (authError) throw new Error(`Authentication error: ${authError.message}`);
            if (!userData.user) throw new Error("User not authenticated");

            // Fetch student data based on authenticated user ID
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
                .from('mahasiswa')
                .select('id_mhs, nama, prodi')
                .eq('id_mhs', userData.user.id)
                .single();

            if (mahasiswaError) {
                console.warn("Cannot find student data for authenticated user, using first record for testing");
                // Fallback for testing - get first student
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('mahasiswa')
                    .select('id_mhs, nama, prodi')
                    .limit(1)
                    .single();

                if (fallbackError) throw new Error(`Fallback student data error: ${fallbackError.message}`);
                if (!fallbackData) throw new Error("Data mahasiswa tidak ditemukan");

                setMahasiswa(fallbackData);
                console.log("Loaded test student data:", fallbackData);

                // Fetch completed responses for this test student
                await fetchCompletedResponses(fallbackData.id_mhs);
                return;
            }

            if (!mahasiswaData) throw new Error("Data mahasiswa tidak ditemukan");

            setMahasiswa(mahasiswaData);
            console.log("Loaded student data:", mahasiswaData);

            // Fetch completed responses for this student
            await fetchCompletedResponses(mahasiswaData.id_mhs);
        } catch (err: any) {
            setError(`Error saat memuat data pengguna: ${err.message}`);
            console.error("User data error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch completed responses for current student
    const fetchCompletedResponses = async (mahasiswaId: string) => {
        try {
            // Get distinct kuesioner_id and dosen_id combinations where the student has responded
            const { data, error } = await supabase.rpc('get_completed_kuesioner_dosen', {
                mhs_id: mahasiswaId
            });

            // Fallback if RPC isn't available - manual query
            if (error) {
                console.warn("RPC error, falling back to manual query:", error);
                const { data: manualData, error: manualError } = await supabase
                    .from('kuesioner_jawaban')
                    .select('kuesioner_id, dosen_id')
                    .eq('mahasiswa_id', mahasiswaId)
                    .order('created_at', { ascending: false });

                if (manualError) throw manualError;

                if (manualData) {
                    // Create a unique list of kuesioner-dosen combinations
                    const uniqueMap = new Map();
                    manualData.forEach(item => {
                        const key = `${item.kuesioner_id}-${item.dosen_id}`;
                        if (!uniqueMap.has(key)) {
                            uniqueMap.set(key, {
                                kuesioner_id: item.kuesioner_id,
                                dosen_id: item.dosen_id
                            });
                        }
                    });

                    const completed = Array.from(uniqueMap.values());
                    setCompletedResponses(completed);
                    console.log("Completed responses (manual):", completed);
                }
                return;
            }

            if (data) {
                setCompletedResponses(data);
                console.log("Completed responses:", data);
            }
        } catch (err: any) {
            console.error("Error fetching completed responses:", err.message);
            setError("Gagal memuat data respons yang sudah selesai");
        }
    };

    // Fetch active kuesioners
    const fetchKuesioners = async () => {
        try {
            setLoading(true);
            const currentDate = new Date().toISOString();

            const { data, error } = await supabase
                .from('kuesioner')
                .select('*')
                .eq('status', 'active')
                .lte('tanggal_mulai', currentDate)
                .gte('tanggal_selesai', currentDate)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                console.log("No active questionnaires found");
            }

            setKuesioners(data || []);
        } catch (err: any) {
            setError(`Gagal memuat kuesioner: ${err.message}`);
            console.error("Questionnaire loading error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch questions for a specific kuesioner
    const fetchPertanyaans = async (kuesionerId: string) => {
        try {
            setLoadingPertanyaan(true);
            const { data, error } = await supabase
                .from('kuesioner_pertanyaan')
                .select('*')
                .eq('kuesioner_id', kuesionerId)
                .order('urutan', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                console.warn(`No questions found for kuesioner ID: ${kuesionerId}`);
                setError("Tidak ada pertanyaan untuk kuesioner ini");
            }

            setPertanyaans(data || []);

            // Also fetch options for these questions if any
            if (data && data.length > 0) {
                const questionIds = data.map(q => q.id);
                await fetchOpsis(questionIds);
            }
        } catch (err: any) {
            setError(`Gagal memuat pertanyaan: ${err.message}`);
            console.error("Question loading error:", err);
        } finally {
            setLoadingPertanyaan(false);
        }
    };

    // Fetch options for questions (specifically for skala_likert)
    const fetchOpsis = async (questionIds: string[]) => {
        try {
            if (!questionIds.length) return;

            const { data, error } = await supabase
                .from('kuesioner_opsi')
                .select('*')
                .in('pertanyaan_id', questionIds)
                .order('urutan', { ascending: true });

            if (error) throw error;

            setOpsis(data || []);
        } catch (err: any) {
            setError(`Gagal memuat opsi jawaban: ${err.message}`);
            console.error("Options loading error:", err);
        }
    };

    // Fetch list of dosen filtered by student's prodi
    const fetchDosens = async (prodi: string) => {
        try {
            const { data, error } = await supabase
                .from('dosen')
                .select('id_dsn, nama, prodi')
                .eq('prodi', prodi)  // Filter by matching prodi
                .order('nama', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                console.warn(`No lecturers found for program: ${prodi}`);
            }

            setDosens(data || []);
        } catch (err: any) {
            setError(`Gagal memuat daftar dosen: ${err.message}`);
            console.error("Lecturer loading error:", err);
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedKuesioner || !selectedDosen || !mahasiswa) {
            setError("Mohon pilih kuesioner dan dosen");
            return;
        }

        // Check if responses are complete
        const unansweredQuestions = pertanyaans.filter(q => {
            if (!responses[q.id]) return true;

            if (q.jenis_jawaban === 'text' && !responses[q.id].jawaban_teks) return true;
            if (q.jenis_jawaban === 'skala_likert' && !responses[q.id].opsi_id) return true;

            return false;
        });

        if (unansweredQuestions.length > 0) {
            setError(`Mohon lengkapi semua pertanyaan (${unansweredQuestions.length} pertanyaan belum dijawab)`);
            return;
        }

        // Double-check if already submitted (client-side validation)
        const isCompleted = completedResponses.some(
            response => response.kuesioner_id === selectedKuesioner && response.dosen_id === selectedDosen
        );

        if (isCompleted) {
            setError("Anda sudah mengisi kuesioner untuk dosen ini");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // Final server-side validation
            const { data: existingResponses, error: checkError } = await supabase
                .from('kuesioner_jawaban')
                .select('id')
                .match({
                    kuesioner_id: selectedKuesioner,
                    dosen_id: selectedDosen,
                    mahasiswa_id: mahasiswa.id_mhs
                })
                .limit(1);

            if (checkError) throw new Error(`Validation error: ${checkError.message}`);

            if (existingResponses && existingResponses.length > 0) {
                setError("Anda sudah mengisi kuesioner untuk dosen ini");
                setSubmitting(false); // Stop submission
                return;
            }

            // Format responses for insertion
            const jawabans = pertanyaans.map(pertanyaan => {
                const response = responses[pertanyaan.id] || {
                    pertanyaan_id: pertanyaan.id,
                    dosen_id: selectedDosen,
                    jawaban_teks: null,
                    opsi_id: null
                };

                return {
                    kuesioner_id: selectedKuesioner,
                    pertanyaan_id: pertanyaan.id,
                    dosen_id: selectedDosen,
                    mahasiswa_id: mahasiswa.id_mhs,
                    jawaban_teks: pertanyaan.jenis_jawaban === 'text' ? response.jawaban_teks : null,
                    opsi_id: pertanyaan.jenis_jawaban === 'skala_likert' ? response.opsi_id : null,
                    created_at: new Date().toISOString()
                };
            });

            // Insert all responses
            const { error: insertError } = await supabase
                .from('kuesioner_jawaban')
                .insert(jawabans);

            if (insertError) {
                if (insertError.code === '23505') { // Unique constraint violation
                    throw new Error('Anda sudah mengisi kuesioner untuk dosen ini');
                } else {
                    throw insertError;
                }
            }

            // Success!
            setSuccess("Terima kasih! Jawaban Anda telah berhasil disimpan.");

            // Add this combination to completed responses
            setCompletedResponses(prev => [
                ...prev,
                { kuesioner_id: selectedKuesioner, dosen_id: selectedDosen }
            ]);

            // Update available dosens list
            if (mahasiswa) {
                const updatedAvailableDosens = availableDosens.filter(
                    dosen => dosen.id_dsn !== selectedDosen
                );
                setAvailableDosens(updatedAvailableDosens);

                // If no more available dosens, show message
                if (updatedAvailableDosens.length === 0) {
                    setSuccess("Anda sudah menilai semua dosen untuk kuesioner ini");
                }
            }

            // Reset form and go back to list
            setResponses({});
            setSelectedDosen(null);

            // Delay returning to list for better UX
            setTimeout(() => {
                setActivePage('list');
                // Refresh kuesioner data to show updated progress
                fetchKuesioners();
            }, 2000);

        } catch (err: any) {
            setError(`Gagal menyimpan jawaban: ${err.message}`);
            console.error("Submission error:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResponseChange = (pertanyaanId: string, update: Partial<Jawaban>) => {
        setResponses(prev => {
            // Get the current state for this question, or initialize if it doesn't exist
            const currentResponse = prev[pertanyaanId] || {
                pertanyaan_id: pertanyaanId,
                dosen_id: selectedDosen || '', // Pastikan dosen terpilih
                jawaban_teks: null,
                opsi_id: null
            };

            // Create the new state by merging the current state with the update
            const newResponseState = { ...currentResponse, ...update };

            // Clear other response types when one is selected
            if (update.opsi_id !== undefined) {
                newResponseState.jawaban_teks = null; // Clear text if option is selected
            } else if (update.jawaban_teks !== undefined) {
                newResponseState.opsi_id = null; // Clear option if text is entered
            }

            return {
                ...prev,
                [pertanyaanId]: newResponseState // Update the state for this specific question
            };
        });
    };

    // Handle kuesioner selection
    const handleKuesionerSelect = async (kuesionerId: string) => {
        setSelectedKuesioner(kuesionerId);
        setSelectedDosen(null); // Reset dosen selection
        setError(null);
        setSuccess(null);

        // Fetch questions for this kuesioner
        await fetchPertanyaans(kuesionerId);

        // Filter available dosens (those that haven't been responded to yet)
        if (mahasiswa && dosens.length > 0) {
            const available = dosens.filter(dosen => {
                return !completedResponses.some(
                    response => response.kuesioner_id === kuesionerId && response.dosen_id === dosen.id_dsn
                );
            });
            setAvailableDosens(available);

            // If no available dosens, show message
            if (available.length === 0) {
                setSuccess("Anda sudah menilai semua dosen untuk kuesioner ini");
            }
        }

        setActivePage('form');
    };

    // Go back to kuesioner list
    const handleBackToList = () => {
        setSelectedKuesioner(null);
        setSelectedDosen(null);
        setResponses({});
        setPertanyaans([]);
        setActivePage('list');
        setError(null);
        setSuccess(null);
    };

    // Initialize page
    useEffect(() => {
        const initialize = async () => {
            await fetchUserData();
            await fetchKuesioners();
        };

        initialize();
    }, []);

    // When mahasiswa data is loaded, fetch dosens for their prodi
    useEffect(() => {
        if (mahasiswa && mahasiswa.prodi) {
            fetchDosens(mahasiswa.prodi);
        }
    }, [mahasiswa]);

    // Calculate progress for each kuesioner
    const calculateProgress = (kuesionerId: string) => {
        if (!dosens || dosens.length === 0) {
            return { totalDosens: 0, completedCount: 0, remainingCount: 0, progressPercentage: 0 };
        }

        const totalDosens = dosens.length;
        const completedCount = completedResponses.filter(
            response => response.kuesioner_id === kuesionerId
        ).length;

        const remainingCount = totalDosens - completedCount;
        const progressPercentage = totalDosens > 0 ? Math.round((completedCount / totalDosens) * 100) : 0;

        return {
            totalDosens,
            completedCount,
            remainingCount,
            progressPercentage
        };
    };

    // The list page showing available questionnaires
    const renderQuesionerList = () => {
        return (
            <div className="bg-white border border-blue-200 rounded-lg p-6"> {/* Latar diubah ke putih, border biru muda */}
                <h2 className="text-xl font-bold mb-6">Daftar Kuesioner Aktif</h2>

                {mahasiswa && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                        <p><span className="font-medium">Mahasiswa:</span> {mahasiswa.nama}</p>
                        <p><span className="font-medium">Program Studi:</span> {mahasiswa.prodi}</p>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div> {/* Warna spinner diubah */}
                        <p className="mt-2">Memuat data kuesioner...</p>
                    </div>
                ) : kuesioners.length > 0 ? (
                    <div className="space-y-4">
                        {kuesioners.map((kuesioner) => {
                            const progress = calculateProgress(kuesioner.id);

                            return (
                                <div
                                    key={kuesioner.id}
                                    className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors" // Border dan hover diubah
                                    onClick={() => handleKuesionerSelect(kuesioner.id)}
                                >
                                    <h3 className="text-lg font-medium">{kuesioner.judul}</h3>
                                    {kuesioner.deskripsi && (
                                        <p className="text-muted-foreground mt-1">{kuesioner.deskripsi}</p>
                                    )}
                                    <div className="flex flex-wrap mt-2 text-sm text-muted-foreground">
                                        <p className="mr-4 mb-1">
                                            <span className="font-medium">Mulai:</span> {new Date(kuesioner.tanggal_mulai).toLocaleDateString('id-ID')}
                                        </p>
                                        <p className="mr-4 mb-1">
                                            <span className="font-medium">Selesai:</span> {new Date(kuesioner.tanggal_selesai).toLocaleDateString('id-ID')}
                                        </p>
                                    </div>
                                    <div className="mt-3">
                                        <div className="w-full bg-blue-100 rounded-full h-2.5"> {/* Latar progress bar diubah */}
                                            <div
                                                className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-in-out" // Warna progress bar diubah
                                                style={{ width: `${progress.progressPercentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-muted-foreground">
                                                {progress.completedCount} dari {progress.totalDosens} dosen telah dinilai
                                            </span>
                                            <span className="font-medium">
                                                {progress.progressPercentage}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-blue-700 bg-blue-50 rounded-lg"> {/* Styling pesan "tidak ada kuesioner" diubah */}
                        <p className="mb-2">Tidak ada kuesioner aktif saat ini.</p>
                        <p className="text-sm">Silakan periksa kembali nanti.</p>
                    </div>
                )}
            </div>
        );
    };

    // The form page for answering a selected questionnaire
    const renderKuesionerForm = () => {
        const selectedKuesionerData = kuesioners.find(k => k.id === selectedKuesioner);

        return (
            <div>
                <div className="flex items-center mb-6">
                    <button
                        onClick={handleBackToList}
                        className="mr-3 text-blue-600 hover:text-blue-800 flex items-center" // Warna tombol kembali diubah
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="m15 18-6-6 6-6"></path>
                        </svg>
                        Kembali
                    </button>
                    <h2 className="text-xl font-bold">{selectedKuesionerData?.judul}</h2>
                </div>

                <div className="bg-white border border-blue-200 rounded-lg p-6 mb-6"> {/* Latar dan border diubah */}
                    <h3 className="text-lg font-semibold mb-4">Pilih Dosen</h3>

                    {loadingPertanyaan ? (
                        <div className="text-center py-4">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div> {/* Warna spinner diubah */}
                            <p className="mt-2 text-sm text-blue-700">Memuat pertanyaan...</p> {/* Warna teks diubah */}
                        </div>
                    ) : availableDosens.length > 0 ? (
                        <div>
                            <label className="block mb-2" htmlFor="dosen">
                                Dosen (Program Studi: {mahasiswa?.prodi})
                            </label>
                            <select
                                id="dosen"
                                value={selectedDosen || ''}
                                onChange={(e) => setSelectedDosen(e.target.value || null)}
                                className="border-blue-300 bg-white text-gray-700 shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" // Styling select diubah
                                required
                            >
                                <option value="">-- Pilih Dosen --</option>
                                {availableDosens.map((d) => (
                                    <option key={d.id_dsn} value={d.id_dsn}>{d.nama}</option>
                                ))}
                            </select>

                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-sm text-blue-800">
                                    <span className="font-medium">Catatan:</span> Hanya dosen yang belum Anda nilai untuk kuesioner ini yang ditampilkan.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-center">
                            <p className="text-yellow-800">Anda sudah mengisi kuesioner untuk semua dosen pada kuesioner ini.</p>
                            <button
                                onClick={handleBackToList}
                                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" // Styling tombol diubah
                            >
                                Kembali ke Daftar Kuesioner
                            </button>
                        </div>
                    )}
                </div>

                {selectedDosen && pertanyaans.length > 0 ? (
                    <form onSubmit={handleSubmit}>
                        <div className="bg-white border border-blue-200 rounded-lg p-6"> {/* Latar dan border diubah */}
                            <h3 className="text-lg font-semibold mb-4">Jawab Pertanyaan</h3>

                            {pertanyaans.map((pertanyaan, idx) => (
                                <div key={pertanyaan.id} className="mb-6 pb-4 border-b border-border last:border-0">
                                    <p className="mb-3 font-medium">{idx + 1}. {pertanyaan.pertanyaan}</p>

                                    {pertanyaan.jenis_jawaban === 'skala_likert' && (
                                        <div className="flex flex-wrap items-center space-x-4 md:space-x-6 mt-2"> {/* Menggunakan flexbox untuk horizontal */}
                                            {opsis
                                                .filter(opsi => opsi.pertanyaan_id === pertanyaan.id)
                                                .sort((a, b) => a.urutan - b.urutan) // Pastikan urutan sesuai
                                                .map((opsi, opsiIdx) => (
                                                    <div key={opsi.id} className="flex items-center">
                                                        <input
                                                            type="radio"
                                                            id={`opsi-${opsi.id}`}
                                                            name={`opsi-group-${pertanyaan.id}`} // Group radio buttons per question
                                                            value={opsi.id} // Simpan ID opsi
                                                            checked={responses[pertanyaan.id]?.opsi_id === opsi.id}
                                                            onChange={() => handleResponseChange(pertanyaan.id, { opsi_id: opsi.id })}
                                                            className="h-4 w-4 border-gray-300 focus:ring-blue-500 text-blue-600" // Styling radio button diubah
                                                            required
                                                        />
                                                        <label htmlFor={`opsi-${opsi.id}`} className="ml-2 text-sm cursor-pointer"> {/* Tambah ml-2 */}
                                                            {opsi.teks} {/* Tampilkan teks opsi */}
                                                        </label>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {pertanyaan.jenis_jawaban === 'text' && (
                                        <div>
                                            <textarea
                                                id={`text-${pertanyaan.id}`}
                                                value={responses[pertanyaan.id]?.jawaban_teks || ''}
                                                onChange={(e) => handleResponseChange(pertanyaan.id, { jawaban_teks: e.target.value })}
                                                className="border-blue-300 bg-white text-gray-700 shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" // Styling textarea diubah
                                                rows={3}
                                                placeholder="Tulis jawaban Anda di sini..."
                                                required
                                            />
                                        </div>
                                    )}

                                </div>
                            ))}

                            {/* Status and submit button */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800">
                                    {success}
                                </div>
                            )}

                            <div className="flex justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={handleBackToList}
                                    className="px-4 py-2 mr-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md" // Styling tombol batal diubah
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" // Styling tombol simpan diubah
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Menyimpan...
                                        </span>
                                    ) : 'Simpan Jawaban'}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : selectedDosen && pertanyaans.length === 0 && !loadingPertanyaan ? (
                    <div className="bg-white border border-blue-200 rounded-lg p-6 text-center"> {/* Latar dan border diubah */}
                        <p className="text-muted-foreground">Tidak ada pertanyaan yang tersedia untuk kuesioner ini.</p>
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            <SidebarMahasiswa /> {/* Sidebar tetap */}
            <main className="flex-1 p-4 sm:p-6 md:p-8 bg-sky-100 ml-72"> {/* Tambahkan ml-72 */}
                <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow"> {/* Kontainer utama konten tetap putih */}
                    <div className="flex justify-between items-center mb-8"> {/* Warna judul diubah */}
                        <h1 className="text-2xl font-bold text-sky-700">Sistem Evaluasi Dosen</h1>
                    </div>
                    {activePage === 'list' ? renderQuesionerList() : renderKuesionerForm()}
                </div>
            </main>
        </div>
    );
};

export default KuesionerSystem;