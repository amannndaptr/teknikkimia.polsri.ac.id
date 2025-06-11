"use client";

import { useState } from "react";
import { GraduationCap, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import SidebarAdmin from "@/components/SidebarAdmin"; // Impor SidebarAdmin

export default function DataSelectionPage() {
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    const dataOptions = [
        {
            id: "mahasiswa",
            title: "Data Mahasiswa",
            description: "Kelola data mahasiswa, termasuk informasi profil, kelas, dan akademik",
            icon: <GraduationCap size={48} />,
            color: "bg-gradient-to-br from-primary/80 to-primary", // Gunakan warna tema
            hoverColor: "bg-gradient-to-br from-primary to-primary/70", // Gunakan warna tema
            path: "/pages-admin/data-management/mahasiswa"
        },
        {
            id: "dosen",
            title: "Data Dosen",
            description: "Kelola data dosen, termasuk informasi profil, mata kuliah, dan jadwal mengajar",
            icon: <Users size={48} />,
            color: "bg-gradient-to-br from-secondary/80 to-secondary", // Gunakan warna tema
            hoverColor: "bg-gradient-to-br from-secondary to-secondary/70", // Gunakan warna tema
            path: "/pages-admin/data-management/dosen"
        },
        {
            id: "alumni",
            title: "Data Alumni",
            description: "Kelola data alumni, termasuk informasi profil, prodi, angkatan, dan pekerjaan",
            icon: <GraduationCap size={48} />, // Bisa ganti icon jika perlu
            color: "bg-gradient-to-br from-accent/80 to-accent",  // Gunakan warna tema lain
            hoverColor: "bg-gradient-to-br from-accent to-accent/70",  // Gunakan warna tema lain
            path: "/pages-admin/data-management/alumni"
        },
    ];

    return (
        <div className="flex min-h-screen theme-admin"> {/* Terapkan flexbox dan theme-admin */}
            <SidebarAdmin /> {/* Tampilkan SidebarAdmin */}

            {/* Area Konten Utama */}
            <div className="flex-1 p-6 bg-white"> {/* Gunakan flex-1 dan bg-white */}
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground">Manajemen Data</h1> {/* Gunakan text-foreground */}
                        <p className="text-muted-foreground mt-2"> {/* Gunakan text-muted-foreground */}
                            Pilih kategori data yang ingin Anda kelola
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {dataOptions.map((option) => (
                            <Link
                                href={option.path}
                                key={option.id}
                                onMouseEnter={() => setHoveredCard(option.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <div className={`
                                ${hoveredCard === option.id ? option.hoverColor : option.color}
                                rounded-xl p-6 h-full shadow-lg transform transition-all duration-300
                                ${hoveredCard === option.id ? "scale-105" : ""}
                                hover:shadow-xl cursor-pointer relative
                            `}>
                                <div className="text-white opacity-90 mb-4">
                                    {option.icon}
                                </div>
                                {/* Gunakan primary-foreground atau secondary-foreground tergantung warna dasar kartu */}
                                <h2 className={`text-xl font-bold ${option.id === 'mahasiswa' ? 'text-primary-foreground' : option.id === 'dosen' ? 'text-secondary-foreground' : 'text-accent-foreground'} mb-2`}>
                                    {option.title}
                                </h2>
                                <p className={`${option.id === 'mahasiswa' ? 'text-primary-foreground' : option.id === 'dosen' ? 'text-secondary-foreground' : 'text-accent-foreground'} opacity-90 mb-4`}>
                                    {option.description}
                                </p>
                                <div className={`flex items-center ${option.id === 'mahasiswa' ? 'text-primary-foreground' : option.id === 'dosen' ? 'text-secondary-foreground' : 'text-accent-foreground'} font-medium`}>
                                    <span>Lihat Data</span>
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </div>
                                {/* Tambahkan overlay saat hover */}
                                {hoveredCard === option.id && (
                                    <div className="absolute inset-0 bg-black opacity-10 rounded-xl transition-opacity duration-300"></div>
                                )}
                            
                           

                            </div>
                        </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}