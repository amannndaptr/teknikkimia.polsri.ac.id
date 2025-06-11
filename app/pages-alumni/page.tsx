'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import SidebarAlumni from '@/components/SidebarAlumni';
import {
    getMyAlumniProfileWithTestimonial, // updateMyAlumniProfileAndTestimonial akan tetap ada jika form submit masih relevan
    updateMyAlumniProfileAndTestimonial, // Jika tidak ada tombol submit, ini mungkin tidak terpakai lagi
    AlumniProfileData,
} from '@/app/alumni_actions';
import { Loader2, AlertCircle, User, Briefcase, Building, CalendarDays } from 'lucide-react'; // Edit, Save, ImageIcon, NextImage dihapus

interface FormDataState {
    id: number;
    nama: string;
    prodi: string;
    angkatan: string; // Simpan sebagai string untuk input form
    pekerjaan: string;
    current_foto_path: string | null;
}

interface AlertState {
    show: boolean;
    message: string;
    type: 'success' | 'error';
}

export default function AlumniTestimonialPage() {
    const [alumniDbProfile, setAlumniDbProfile] = useState<AlumniProfileData | null>(null); // Data asli dari DB
    const [formData, setFormData] = useState<FormDataState>({
        id: 0,
        nama: '',
        prodi: '',
        angkatan: '',
        pekerjaan: '',
        current_foto_path: null,
    });
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'success' });

    const prodiOptions = [
        "D3 Teknik Kimia", "D3 Teknik Kimia PSDKU SIAK", "D4 Teknik Energi",
        "D4 Teknologi Kimia Industri", "S2 Energi Terbarukan"
    ];
    const currentYear = new Date().getFullYear();
    const angkatanOptions = Array.from({ length: 20 }, (_, i) => currentYear - 15 + i); // Rentang 20 tahun

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            const profile = await getMyAlumniProfileWithTestimonial(); // Ini adalah server action
            if (profile) {
                setAlumniDbProfile(profile);
                setFormData({
                    id: profile.id,
                    nama: profile.nama || '',
                    prodi: profile.prodi || '',
                    angkatan: profile.angkatan?.toString() || '',
                    pekerjaan: profile.pekerjaan || '',
                    current_foto_path: profile.foto || null,
                });
            } else {
                showAlert('Gagal memuat profil alumni. Pastikan Anda sudah login dan data alumni Anda terdaftar.', 'error');
            }
            setIsLoading(false);
        };
        fetchProfile();
    }, []);

    const showAlert = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: FormDataState) => ({ ...prev, [name]: value }));
    };

    // handleSubmit mungkin tidak akan terpicu jika tidak ada tombol submit yang visible
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!alumniDbProfile) return;

        setIsSubmitting(true);
        const formPayload = new FormData(event.currentTarget); // Ambil file dari event.currentTarget
        formPayload.set('alumni_id', alumniDbProfile.id.toString());
        if (formData.current_foto_path) { // Kirim path foto saat ini
            formPayload.set('current_foto_path', formData.current_foto_path);
        }

        const result = await updateMyAlumniProfileAndTestimonial(formPayload);

        if (result.success) {
            showAlert(result.success, 'success');
            // Re-fetch profile untuk mendapatkan data terbaru, termasuk URL foto baru jika ada
            const updatedProfile = await getMyAlumniProfileWithTestimonial();
            if (updatedProfile) {
                setAlumniDbProfile(updatedProfile);
                setFormData((prev: FormDataState) => ({
                    ...prev,
                    nama: updatedProfile.nama || '',
                    prodi: updatedProfile.prodi || '',
                    angkatan: updatedProfile.angkatan?.toString() || '',
                    pekerjaan: updatedProfile.pekerjaan || '',
                    current_foto_path: updatedProfile.foto || null,
                }));
            }
        } else if (result.error) {
            showAlert(result.error, 'error');
        }
        setIsSubmitting(false);
    };


    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background theme-alumni">
                <Loader2 className="h-12 w-12 animate-spin text-sky-600" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100"> {/* Latar belakang utama diubah */}
            <SidebarAlumni />
            <main className="flex-1 p-4 py-8 md:p-8 ml-72 flex flex-col items-center justify-center"> {/* Ditambahkan justify-center untuk penengahan vertikal */}
                <div className="max-w-xl w-full"> {/* Mengurangi max-width dari 2xl menjadi xl */}
                    <header className="mb-8">
                    </header>

                    {alert.show && (
                        <div className={`mb-4 p-4 rounded-lg flex items-center text-sm ${alert.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                            {alert.message}
                        </div>
                    )}

                    {!alumniDbProfile && !isLoading && (
                        <p className="text-muted-foreground">Tidak dapat memuat data profil. Silakan coba lagi atau hubungi administrator.</p>
                    )}

                    {alumniDbProfile && (
                        // `form` tag dipertahankan jika ada rencana submit di masa depan, jika tidak bisa diganti `div`
                        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
                            {/* Profile Details - Selalu dalam mode tampilan (read-only) */}
                            <div className="space-y-5"> {/* Sedikit menambah spasi antar item */}
                                {/* Nama */}
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <User className="text-sky-600 w-6 h-6 mr-4 flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Nama Lengkap</p>
                                        <p className="text-lg text-gray-800 font-medium">{alumniDbProfile.nama || <span className="text-gray-400 italic">Belum diisi</span>}</p>
                                    </div>
                                </div>
                                {/* Prodi */}
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <Building className="text-sky-600 w-6 h-6 mr-4 flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Program Studi</p>
                                        <p className="text-lg text-gray-800 font-medium">{alumniDbProfile.prodi || <span className="text-gray-400 italic">Belum diisi</span>}</p>
                                    </div>
                                </div>
                                {/* Angkatan */}
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <CalendarDays className="text-sky-600 w-6 h-6 mr-4 flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Angkatan</p>
                                        <p className="text-lg text-gray-800 font-medium">{alumniDbProfile.angkatan?.toString() || <span className="text-gray-400 italic">Belum diisi</span>}</p>
                                    </div>
                                </div>
                                {/* Pekerjaan */}
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <Briefcase className="text-sky-600 w-6 h-6 mr-4 flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Pekerjaan Saat Ini</p>
                                        <p className="text-lg text-gray-800 font-medium">{alumniDbProfile.pekerjaan || <span className="text-gray-400 italic">Belum diisi</span>}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Jika ada tombol submit, letakkan di sini dengan styling yang sesuai */}
                            {/* Contoh:
                            <div className="pt-6 border-t border-gray-200 mt-6 flex justify-end">
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow hover:bg-sky-700 transition-colors duration-200 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mr-2 inline-block" /> : null}
                                    Simpan Perubahan
                                </button>
                            </div>
                            */}
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
