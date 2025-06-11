"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent, ReactElement } from "react"; // Tambahkan ReactElement
import { useRouter } from "next/navigation";
import { User, GraduationCap, FileText, Edit } from "lucide-react";
import SidebarMahasiswa from "@/components/SidebarMahasiswa";
import { createClient } from "@/utils/supabase/client";

type Mahasiswa = {
    id_mhs: string;
    nama: string;
    nim: string;
    prodi: string;
    kelas: string; // Tambahkan field kelas
    angkatan: string;
    foto_profil?: string | null;
};

// Helper function to check if the string is a Base64 data URL (optional, but good practice)
const isBase64DataURL = (value: string | null | undefined): boolean => {
    if (!value) return false;
    return typeof value === 'string' && value.startsWith('data:image');
};

// Interface untuk field teks pada form
interface MahasiswaFormData {
    nama: string;
}

export default function DashboardMahasiswa() {
    const [user, setUser] = useState<Mahasiswa | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<MahasiswaFormData>({
        nama: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(
        "/default-profile.png"
    );
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const {
                    data: { user: sessionUser },
                } = await supabase.auth.getUser();

                if (!sessionUser) {
                    router.push("/sign-in");
                    return;
                }

                const { data, error } = await supabase
                    .from("mahasiswa")
                    .select("*")
                    .eq("id_mhs", sessionUser.id)
                    .single();

                if (error || !data) {
                    console.error("Gagal mengambil data mahasiswa:", error?.message);
                    return;
                }

                setUser(data);
                setFormData({ nama: data.nama || "" });
                setPhotoPreviewUrl(data.foto_profil || "/default-profile.png");
            } catch (error) {
                console.error("Error saat mengambil data mahasiswa:", error);
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
            });
            setSelectedFile(null); // Reset file yang dipilih
            setPhotoPreviewUrl(user.foto_profil || "/default-profile.png"); // Reset preview ke foto user saat ini
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setSelectedFile(null);
        if (user) {
            setFormData({ nama: user.nama });
            setPhotoPreviewUrl(user.foto_profil || "/default-profile.png");
        } else {
            // Fallback jika user null, meskipun seharusnya tidak terjadi jika sudah login
            setFormData({ nama: "" });
            setPhotoPreviewUrl("/default-profile.png");
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFotoProfilChange = (e: ChangeEvent<HTMLInputElement>) => {
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
            setPhotoPreviewUrl(user?.foto_profil || "/default-profile.png"); // Kembali ke foto user jika batal pilih
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!formData.nama || formData.nama.trim() === "") {
            alert("Nama tidak boleh kosong.");
            return;
        }

        setIsSubmitting(true);

        let fotoDataToSave: string | null = user.foto_profil || null;

        if (selectedFile && photoPreviewUrl) {
            // Jika file baru dipilih, photoPreviewUrl sudah berisi Base64 data URL
            fotoDataToSave = photoPreviewUrl;
        }

        const payloadToUpdate = {
            nama: formData.nama,
            foto_profil: fotoDataToSave,
        };

        try {
            const { data: updatedMahasiswa, error } = await supabase
                .from("mahasiswa")
                .update(payloadToUpdate)
                .eq("id_mhs", user.id_mhs)
                .select()
                .single();

            if (error) {
                console.error("Gagal mengupdate profil mahasiswa:", error.message);
                alert(`Gagal menyimpan perubahan: ${error.message}`);
            } else if (updatedMahasiswa) {
                setUser(updatedMahasiswa); // Update state user dengan data terbaru
                setIsEditing(false);
                setSelectedFile(null); // Reset file terpilih
                setPhotoPreviewUrl(updatedMahasiswa.foto_profil || "/default-profile.png"); // Update preview
                alert("Profil berhasil diperbarui!");
            }
        } catch (error) {
            console.error("Error saat mengupdate foto profil:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sky-100"> {/* Latar diubah */}
                <div className="text-center text-sky-700 text-xl font-light tracking-wide animate-pulse"> {/* Warna teks diubah */}
                    Memuat data...
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sky-100 text-sky-700"> {/* Latar dan warna teks diubah */}
                Gagal memuat data mahasiswa atau Anda tidak terautentikasi.
            </div>
        );
    }

    // Konfigurasi detail profil
    const profileDetails = [
        {
            icon: <User className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "Nama", // Label ini akan digunakan untuk identifikasi field yang bisa diedit
            value: user.nama,
        },
        {
            icon: <GraduationCap className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "NIM",
            value: user.nim,
        },
        {
            icon: <FileText className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "Program Studi",
            value: user.prodi,
        },
        {
            icon: <User className="text-[#7A4069] w-5 h-5 mr-3" />, // Anda bisa mengganti ikon jika ada yang lebih sesuai untuk kelas
            label: "Kelas",
            value: user.kelas.split('-')[0], // Ambil bagian sebelum tanda hubung
        },
        {
            icon: <FileText className="text-[#7A4069] w-5 h-5 mr-3" />,
            label: "Angkatan",
            value: user.angkatan,
        },
    ];

    // URL foto yang ditampilkan (preview saat edit, foto user saat view)
    const displayedPhotoUrl = isEditing ? photoPreviewUrl : user?.foto_profil;


    return (
        <div className="min-h-screen bg-sky-100 flex"> {/* Latar utama diubah ke sky-100 */}
            {/* Sidebar */}
            <SidebarMahasiswa />

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 flex items-center justify-center ml-72"> {/* Tambahkan ml-72 */}
                <div className="bg-white shadow-xl rounded-xl py-6 px-8 w-full max-w-md space-y-6 border border-sky-200"> {/* Ukuran card disamakan dengan profil dosen */}
                    <h2 className="text-2xl font-semibold text-sky-700 mb-6 text-center"> {/* Warna judul diubah */}
                        Profil Mahasiswa
                    </h2>

                    {/* Foto Profil dengan tombol edit */}
                    {user && ( // Pastikan user ada sebelum merender
                        <div className="flex flex-col items-center pt-4">
                            <div className="relative">
                                <img
                                    src={displayedPhotoUrl || "/default-profile.png"} // Gunakan URL yang sesuai mode
                                    alt="Foto Mahasiswa"
                                    className="w-32 h-32 object-cover rounded-full border-4 border-sky-500"
                                />
                                {!isEditing && (
                                    <button
                                        onClick={handleStartEdit}
                                        className="absolute bottom-0 right-0 bg-sky-600 text-white rounded-full p-2 hover:bg-sky-700 transition-colors"
                                        title="Edit Profil"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            {isEditing && (
                                <div className="mt-3 flex flex-col items-center">
                                    <label htmlFor="foto_profil_input" className="text-sm font-medium text-sky-700 cursor-pointer bg-sky-50 px-3 py-1 rounded-md border border-sky-300 hover:bg-sky-100">
                                        Ganti Foto
                                    </label>
                                    <input
                                        type="file"
                                        id="foto_profil_input"
                                        name="foto_profil"
                                        accept="image/*"
                                        onChange={handleFotoProfilChange}
                                        className="hidden" // Sembunyikan input file asli
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Profile Details Section */}
                    <div className="space-y-3 mt-6">
                        {user && profileDetails.map((item, index) => ( // Pastikan user ada sebelum map
                            <div
                                key={index}
                                className="flex items-center bg-sky-50 border border-sky-200 rounded-lg p-3"
                            >
                                {React.cloneElement(item.icon as ReactElement, { className: "text-sky-600 w-5 h-5 mr-3" })} {/* Cast item.icon */}
                                <div className="text-gray-700 flex-1"> {/* Gunakan flex-1 */}
                                    <span className="font-medium text-sky-700">{item.label}:</span>{' '}
                                    {/* Render input hanya untuk Nama saat editing */}
                                    {item.label === 'Nama' && isEditing ? (
                                        <input
                                            type="text"
                                            name="nama"
                                            value={formData.nama}
                                            onChange={handleInputChange}
                                            className="ml-2 rounded-md px-2 py-1 text-gray-800 bg-slate-50 focus:ring-sky-500 focus:outline-none focus:ring-1"
                                        />
                                    ) : (
                                        <span className="text-gray-600">{item.value}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tombol Aksi (hanya muncul saat editing) */}
                    {isEditing && (
                        <div className="flex justify-center items-center space-x-4 pt-6"> {/* Tambahkan padding atas */}
                                <button
                                    type="button" // Ubah type menjadi button
                                    onClick={handleSubmit} // Panggil handler langsung
                                    className="bg-sky-600 text-white rounded-lg px-6 py-2.5 hover:bg-sky-700 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                                </button>
                                <button type="button" onClick={handleCancelEdit} className="bg-gray-300 text-gray-700 rounded-lg px-6 py-2.5 hover:bg-gray-400 transition-colors">
                                    Batal
                                </button>
                            </div>
                    )}
                </div>
            </main>
        </div>
    );
}