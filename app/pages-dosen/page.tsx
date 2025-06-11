"use client";

import React from 'react'; // <-- TAMBAHKAN IMPORT INI
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Pastikan ini dari next/navigation
import { User, GraduationCap, FileText, Edit, Mail, Briefcase, Info, Building } from "lucide-react"; // Tambahkan ikon yang relevan
import SidebarDosen from "@/components/SidebarDosen";
import { createClient } from "@/utils/supabase/client";

type Dosen = {
    id_dsn: string;
    email: string; // Tambahkan email
    nama: string;
    nip: string | null;
    nidn: string | null;
    nuptk: string | null; // Tambahkan NUPTK
    prodi: string | null; // Ubah menjadi string | null agar konsisten
    foto?: string | null;
    status_dosen?: string | null;
    role: string | null; // Tambahkan role
};

// Interface untuk field teks pada form
interface DosenTextFormData {
    nama: string;
    nip: string;
    nidn: string;
    nuptk: string;
    prodi: string;
    status_dosen: string;
}

// Helper function to check if the string is a Base64 data URL
const isBase64DataURL = (value: string | null | undefined): boolean => {
    if (!value) return false;
    return typeof value === 'string' && value.startsWith('data:image');
};

export default function DashboardDosen() {
    const [user, setUser] = useState<Dosen | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // Untuk status submit form
    const [isEditing, setIsEditing] = useState(false);
    const [photoVersion, setPhotoVersion] = useState(Date.now()); // State untuk cache busting foto
    const [formData, setFormData] = useState<DosenTextFormData>({
        nama: "",
        nip: "",
        nidn: "",
        nuptk: "",
        prodi: "",
        status_dosen: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null); // File foto yang dipilih
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null); // URL untuk preview foto di form

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const {
                    data: { user: sessionUser },
                } = await supabase.auth.getUser();

                if (!sessionUser) {
                    router.push("/auth/login");
                    return;
                }

                const { data, error } = await supabase
                    .from("dosen")
                    .select("id_dsn, email, nama, nip, nidn, nuptk, prodi, foto, status_dosen, role") // Ambil semua field yang relevan
                    .eq("id_dsn", sessionUser.id)
                    .single();

                if (error || !data) {
                    console.error("Gagal mengambil data dosen:", error?.message);
                    return;
                }

                setUser(data);
                setFormData({ // Hanya data teks, foto dihandle oleh user.foto dan photoPreviewUrl
                    nama: data.nama || "",
                    nip: data.nip || "",
                    nidn: data.nidn || "",
                    nuptk: data.nuptk || "",
                    prodi: data.prodi || "",
                    status_dosen: data.status_dosen || "",
                });
                setPhotoPreviewUrl(data.foto || "/default-profile.jpg"); // Set preview awal
            } catch (error) {
                console.error("Error saat mengambil data dosen:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [router, supabase]);

    const handleStartEdit = () => {
        if (user) {
            setFormData({
                nama: user.nama,
                nip: user.nip || "",
                nidn: user.nidn || "",
                nuptk: user.nuptk || "",
                prodi: user.prodi || "",
                status_dosen: user.status_dosen || "",
            });
            setSelectedFile(null); // Reset file yang dipilih
            setPhotoPreviewUrl(user.foto || "/default-profile.jpg"); // Reset preview ke foto user saat ini
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setSelectedFile(null);
        if (user) {
            setFormData({ nama: user.nama, nip: user.nip || "", nidn: user.nidn || "", nuptk: user.nuptk || "", prodi: user.prodi || "", status_dosen: user.status_dosen || "" });
            setPhotoPreviewUrl(user.foto || "/default-profile.jpg");
        } else {
            setPhotoPreviewUrl("/default-profile.jpg");
        }
    };

    const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file); // Simpan objek File

            // Buat Data URL untuk preview lokal
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setSelectedFile(null);
            setPhotoPreviewUrl(user?.foto || "/default-profile.jpg"); // Kembali ke foto user jika batal pilih
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);

        if (!formData.nidn || formData.nidn.trim() === "") {
            console.error("Gagal mengupdate data dosen: NIDN tidak boleh kosong.");
            alert("NIDN tidak boleh kosong. Mohon isi NIDN Anda.");
            setIsSubmitting(false);
            return;
        }

        // Validasi tambahan: Nama tidak boleh kosong karena akan digunakan untuk nama file
        if (!formData.nama || formData.nama.trim() === "") {
            alert("Nama dosen tidak boleh kosong, karena akan digunakan untuk nama file foto.");
            setIsSubmitting(false);
            return;
        }

        let fotoDataToSave: string | null = user.foto || null; // Default ke foto yang sudah ada (bisa URL lama atau Base64 baru)

        try {
            if (selectedFile && photoPreviewUrl) {
                // Jika file baru dipilih, photoPreviewUrl sudah berisi Base64 data URL
                fotoDataToSave = photoPreviewUrl;
            }
            // Bagian Supabase Storage dihapus
            /*
                const fileExt = selectedFile.name.split('.').pop() || 'jpg'; // Ambil ekstensi file
                const fileName = `profile.${fileExt}`; // Nama file konsisten untuk overwrite
                const filePath = `foto/dosen/${user.id_dsn}/${fileName}`;
                
                // Fungsi untuk membersihkan nama dosen menjadi nama file yang aman
                const sanitizeFilename = (name: string): string => {
                    if (!name || name.trim() === "") return "profil_dosen"; // Fallback jika nama kosong
                    return name
                        .trim()
                        .toLowerCase()
                        .replace(/\s+/g, '_') // Ganti spasi dengan underscore
                        .replace(/[^\w-]/g, '') // Hapus semua karakter kecuali huruf, angka, underscore, dan tanda hubung
                        .replace(/_{2,}/g, '_') // Ganti multiple underscore dengan satu
                        .replace(/--+/g, '-')   // Ganti multiple tanda hubung dengan satu
                        .replace(/^-+|-+$/g, '') // Hapus tanda hubung/underscore di awal/akhir
                        .substring(0, 50); // Batasi panjang nama file (misalnya 50 karakter)
                };

                const baseFileName = sanitizeFilename(formData.nama); // Gunakan nama dari form data
                const newFileName = `${baseFileName}.${fileExt}`;
                const newFilePath = newFileName;

                // Ganti 'NAMA_BUCKET_ANDA' dengan nama bucket Anda di Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage // Pastikan nama bucket di sini adalah 'dosen'
                    .from('dosen')
                    .upload(newFilePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: true, // true: timpa jika file sudah ada
                    });

                if (uploadError) {
                    console.error("Gagal mengunggah foto:", uploadError.message);
                    alert(`Gagal memproses foto: ${uploadError.message}. Perubahan tidak disimpan.`);
                    setIsSubmitting(false);
                    return;
                }

                const { data: publicUrlData } = supabase.storage // Pastikan nama bucket di sini adalah 'dosen'
                    .from('dosen')
                    .getPublicUrl(newFilePath);

                if (!publicUrlData?.publicUrl) {
                    console.error("Gagal mendapatkan URL publik foto setelah upload.");
                    alert("Gagal memproses URL foto. Perubahan tidak disimpan.");
                    setIsSubmitting(false);
                    return;
                }
                fotoDataToSave = publicUrlData.publicUrl;
            */

            const payloadToUpdate = {
                ...formData, // nama, nidn, prodi, dll.
                nip: formData.nip || null,
                nuptk: formData.nuptk || null,
                prodi: formData.prodi || null,
                status_dosen: formData.status_dosen || null,
                foto: fotoDataToSave, // String Base64 atau URL lama atau null
            };

            console.log("Payload yang akan diupdate:", payloadToUpdate);

            const { data: updatedDosen, error: dbError } = await supabase
                .from("dosen")
                .update(payloadToUpdate)
                .eq("id_dsn", user.id_dsn)
                .select()
                .single();

            if (dbError) {
                console.error("Gagal mengupdate data dosen di DB:", dbError.message);
                alert(`Gagal menyimpan perubahan: ${dbError.message}`);
            } else if (updatedDosen) {
                setUser(updatedDosen);
                setIsEditing(false);
                setSelectedFile(null); // Reset file terpilih
                setPhotoPreviewUrl(updatedDosen.foto || "/default-profile.jpg"); // Update preview dengan foto baru (Base64 atau URL)
                // Update photo version to bust cache for the displayed image
                setPhotoVersion(Date.now());
                alert("Profil berhasil diperbarui!");
            }
        } catch (error) {
            console.error("Error saat mengupdate data dosen:", error);
            alert("Terjadi kesalahan saat menyimpan perubahan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#B3C7D6] to-[#A8B8C8] transition-all duration-500"> {/* Latar loading disesuaikan */}
                <div className="text-center text-gray-700 text-xl font-light tracking-wide animate-pulse"> {/* Teks loading disesuaikan */}
                    Memuat data dosen...
                </div>
            </div>
        );
    }

    if (!user && !loading) { // Hanya tampilkan jika loading selesai dan user masih null
        return ( // Tambahkan !loading
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#B3C7D6] to-[#A8B8C8] text-gray-700"> {/* Latar dan teks disesuaikan */}
                Gagal memuat data dosen atau Anda tidak memiliki akses.
            </div>
        );
    }

    const profileDetails = [
        {
            icon: <User className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "Nama", // Warna ikon akan diubah di JSX
            value: user?.nama || '-', // Menggunakan optional chaining
        },
        {
            icon: <FileText className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "NIP", // Warna ikon akan diubah di JSX
            value: user?.nip || '-', // Menggunakan optional chaining
        },
        {
            icon: <GraduationCap className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "NIDN", // Warna ikon akan diubah di JSX
            value: user?.nidn || '-', // Menggunakan optional chaining
        },
        {
            icon: <Info className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "NUPTK", // Warna ikon akan diubah di JSX
            value: user?.nuptk || '-', // Menggunakan optional chaining
        },
        {
            icon: <Building className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "Program Studi", // Warna ikon akan diubah di JSX
            value: user?.prodi || '-', // Menggunakan optional chaining
        },
        {
            icon: <Briefcase className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "Golongan/Pangkat", // Warna ikon akan diubah di JSX
            value: user?.status_dosen || '-', // Menggunakan optional chaining
        },
    ];

    const editableFieldsConfig = [
        { name: "nama", label: "Nama", type: "text", icon: <User className="text-teal-700 w-5 h-5 mr-3" /> },
        { name: "nip", label: "NIP", type: "text", icon: <FileText className="text-teal-700 w-5 h-5 mr-3" /> },
        { name: "nidn", label: "NIDN", type: "text", icon: <GraduationCap className="text-teal-700 w-5 h-5 mr-3" /> },
        { name: "nuptk", label: "NUPTK", type: "text", icon: <Info className="text-teal-700 w-5 h-5 mr-3" /> },
        { name: "prodi", label: "Program Studi", type: "text", icon: <Building className="text-teal-700 w-5 h-5 mr-3" /> },
        { name: "status_dosen", label: "Golongan/Pangkat", type: "text", icon: <Briefcase className="text-teal-700 w-5 h-5 mr-3" /> },
    ];

    // Foto untuk ditampilkan di <img> dalam form edit
    const formImagePreviewSrc = photoPreviewUrl || "/default-profile.jpg";


    return (
        <div className="min-h-screen bg-[#D1D9E6] flex"> {/* Latar belakang halaman disesuaikan dengan tema sidebar */}
            <SidebarDosen /> {/* Panggil SidebarDosen tanpa props */}

            <main className="flex-1 p-6 md:p-10 flex items-center justify-center">
                <div className="bg-[#BAC3D0] shadow-2xl rounded-2xl py-3 px-6 w-full max-w-xl space-y-3 border border-gray-400 -mt-6"> {/* Latar card digelapkan lagi menjadi #BAC3D0 */}
                    <h2 className="text-2xl font-semibold text-teal-800 text-center"> {/* Warna judul diubah */}
                        Profil Dosen
                    </h2>

                    {/* Foto Profil dengan tombol edit */}
                    {!isEditing && user && ( /* Tambahkan pengecekan user sebelum mengakses propertinya */
                        <>
                            <div className="relative flex justify-center pt-1"> {/* Mengurangi padding atas dari pt-2 menjadi pt-1 */}
                                <img
                                    src={user.foto
                                        ? (isBase64DataURL(user.foto)
                                            ? user.foto
                                            : `${user.foto}?v=${photoVersion}`)
                                        : "/default-profile.jpg"}
                                    alt="Foto Dosen"
                                    className="w-32 h-32 object-cover rounded-full border-4 border-teal-600" // Border foto diubah
                                />
                                <button
                                    onClick={handleStartEdit}
                                    className="absolute bottom-0 right-0 bg-teal-600 text-white rounded-full p-2 hover:bg-teal-700 transition-colors" // Tombol edit foto diubah
                                    title="Edit Profil"
                                >
                                    <Edit className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-3"> {/* Mengurangi space-y di dalam detail profil */}
                                {profileDetails.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center bg-gray-100 border border-gray-300 rounded-xl p-4" // Latar item diubah dari bg-white menjadi bg-gray-100
                                    >
                                        {/* Mengganti warna ikon di sini */}
                                        {React.cloneElement(item.icon as React.ReactElement, { className: "text-teal-700 w-5 h-5 mr-3" })}
                                        <div className="text-gray-800 font-medium">
                                            {item.label}: <span className="font-normal text-gray-700">{item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Form Edit Profil */}
                    {isEditing && user && ( /* Tambahkan pengecekan user saat mode edit */
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Foto Profil Edit */}
                            <div className="flex flex-col items-center space-y-2">
                                <img
                                    src={formImagePreviewSrc} // Gunakan URL preview
                                    alt="Preview Foto Dosen"
                                    className="w-32 h-32 object-cover rounded-full border-4 border-teal-600" // Border foto di form diubah
                                />
                                <label htmlFor="foto" className="text-sm font-medium text-teal-700 cursor-pointer bg-teal-50 px-3 py-1 rounded-md border border-teal-300 hover:bg-teal-100"> {/* Tombol ganti foto diubah */}
                                    Ganti Foto
                                </label>
                                <input
                                    type="file"
                                    id="foto"
                                    name="foto"
                                    accept="image/*"
                                    onChange={handleFotoChange}
                                    className="hidden" // Sembunyikan input file asli
                                />
                            </div>

                            {/* Input Fields untuk Data Lain */}
                            {editableFieldsConfig.map((field) => (
                                <div key={field.name} className="flex flex-col space-y-1">
                                    <label htmlFor={field.name} className="text-sm font-medium text-gray-800 flex items-center"> {/* Warna label form diubah */}
                                        {field.icon}
                                        <span className="ml-1">{field.label}</span>
                                    </label>
                                    <input
                                        type={field.type}
                                        id={field.name}
                                        name={field.name}
                                        value={formData[field.name as keyof DosenTextFormData]}
                                        onChange={handleInputChange}
                                        className="border border-gray-300 rounded-xl p-3 focus:ring-teal-500 focus:border-teal-500 transition-all bg-slate-50" // Latar belakang input diubah dari bg-white menjadi bg-slate-50
                                        placeholder={field.label}
                                    />
                                </div>
                            ))}
                            
                            {/* Tombol Aksi */}
                            <div className="flex justify-center items-center space-x-4 pt-3"> {/* Mengurangi padding atas tombol */}
                                <button
                                    type="submit"
                                    className="bg-teal-700 text-white rounded-xl px-6 py-2.5 hover:bg-teal-800 transition-colors" // Tombol simpan diubah
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="bg-gray-300 text-gray-800 rounded-xl px-6 py-2.5 hover:bg-gray-400 transition-colors" // Tombol batal diubah
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}