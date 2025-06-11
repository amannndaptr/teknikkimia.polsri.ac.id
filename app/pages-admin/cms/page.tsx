'use client';

import Link from 'next/link';
import SidebarAdmin from '@/components/SidebarAdmin'; // Impor SidebarAdmin
import {
  Newspaper,      // Untuk Berita & Pengumuman
  Activity,       // Untuk Kegiatan
  Calendar,       // Untuk Kalender Akademik
  Award,          // Untuk Beasiswa
  MessageSquare,  // Untuk Testimoni Alumni
  Scroll,         // Untuk Sejarah
  Target,         // Untuk Visi & Misi
  Users,          // Untuk Struktur Organisasi
  BarChart3,      // Untuk Statistik Mahasiswa (sebelumnya Mahasiswa per Prodi)
  GraduationCap,  // Untuk Program Studi
  FlaskConical,   // Untuk Laboratorium
  FileText } from 'lucide-react'; // Untuk ikon judul utama
import { JSX } from 'react';

interface ContentItem {
  name: string;
  slug: string;
  icon: JSX.Element;
}

export default function CMSPage() {
  // Daftar item konten disesuaikan dengan menu di SidebarAdmin
  const contentItems: ContentItem[] = [
    {
      name: 'Berita & Pengumuman',
      slug: 'info/posts',
      icon: <Newspaper className="w-5 h-5 text-primary" />
    },
    {
      name: 'Kegiatan Jurusan',
      slug: 'info/kegiatan',
      icon: <Activity className="w-5 h-5 text-secondary" />
    },
    {
      name: 'Kalender Akademik',
      slug: 'info/kalender',
      icon: <Calendar className="w-5 h-5 text-accent" />
    },
    {
      name: 'Beasiswa',
      slug: 'info/beasiswa',
      icon: <Award className="w-5 h-5 text-destructive" />
    },
    {
      name: 'Sejarah Jurusan',
      slug: 'profil/sejarah',
      icon: <Scroll className="w-5 h-5 text-secondary" />
    },
    {
      name: 'Visi & Misi',
      slug: 'profil/visi-misi',
      icon: <Target className="w-5 h-5 text-accent" />
    },
    {
      name: 'Struktur Organisasi',
      slug: 'profil/struktur-organisasi',
      icon: <Users className="w-5 h-5 text-destructive" />
    },
    {
      name: 'Statistik Mahasiswa',
      slug: 'home/mhs-per-prodi',
      icon: <BarChart3 className="w-5 h-5 text-primary" />
    },
    {
      name: 'Program Studi',
      slug: 'prodi',
      icon: <GraduationCap className="w-5 h-5 text-secondary" />
    },
     {
      name: 'Laboratorium',
      slug: 'lab-content',
      icon: <FlaskConical className="w-5 h-5 text-accent" />
    },
  ];

  return (
    // Menghapus 'flex' dari div root, karena SidebarAdmin diasumsikan fixed/absolute
    // dan main content akan menggunakan margin untuk menghindarinya.
    <div className="min-h-screen theme-admin">
      <SidebarAdmin /> {/* Tampilkan SidebarAdmin */}
      {/* Area Konten Utama: tambahkan ml-72, w-calc, bg-background, dan overflow-y-auto */}
      <main className="ml-72 flex-1 p-6 md:p-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-foreground flex items-center"> {/* Gunakan text-foreground */}
            <FileText className="mr-4 w-8 h-8 text-primary" /> {/* Gunakan text-primary */}
            Manajemen Konten Sistem Informasi
          </h1>

          <div className="bg-card rounded-xl shadow-md p-6"> {/* Gunakan bg-card */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contentItems.map((item) => (
                <Link
                  key={item.slug}
                  href={`/pages-admin/cms/${item.slug}`}
                  className="w-full"
                >
                  <div className="flex items-center p-4 rounded-lg bg-card hover:bg-muted border border-border transition-colors duration-200 h-full shadow hover:shadow-md">
                    {item.icon}
                    <span className="ml-3 font-medium text-foreground">{item.name}</span> {/* text-foreground untuk nama item */}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}