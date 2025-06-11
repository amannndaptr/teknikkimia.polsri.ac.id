'use client';

import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import * as LucideIcons from 'lucide-react'; // Import all icons
import { createClient } from '@/utils/supabase/client'; // Supabase client

// --- Interfaces for fetched data (mirroring SupabaseLabData from CMS) ---
interface LabMainImage {
  url: string;
  alt: string;
  storagePath: string; // Keep for potential future use, not directly rendered
}

// Interface for equipment data as stored/fetched, iconName is string initially
interface RawLabEquipment {
  name: string;
  description: string;
  category: string; // Category as fetched from DB
  imageUrl: string;
  iconName: string; // Icon name as string from DB
  storagePath: string;
}

interface LabEquipment {
  name: string;
  description: string;
  imageUrl: string;
  iconName: keyof typeof LucideIcons; // Ensure iconName is a valid Lucide icon key
  storagePath: string; // Keep for potential future use
}

interface LaboratoriumPageData {
  displayName: string;
  description: string;
  mainImages: LabMainImage[];
  equipmentCategories: LabEquipmentCategory[];
}

interface LabEquipmentCategory {
  categoryName: string;
  equipment: LabEquipment[]; // Uses the LabEquipment with typed iconName
}

const LAB_ID = "lab-analisis"; // The ID for this specific lab page

export default function LaboratoriumAnalisis() {
  const supabase = createClient();
  const [labData, setLabData] = useState<LaboratoriumPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLabData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('cms_laboratorium')
          .select('title, deskripsi, main_images, equipments') // Select new columns
          .eq('id_lab', LAB_ID) // Use id_lab for matching
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') { // PGRST116: "Query returns no rows"
            setError('Data laboratorium tidak ditemukan.');
          } else {
            console.error("Error fetching lab data:", fetchError);
            setError(fetchError.message || 'Gagal memuat data laboratorium.');
          }
          return; // Exit if error
        }

        if (data) {
          const rawEquipments: RawLabEquipment[] = data.equipments || [];
          
          // Group equipments by category
          const groupedByCategory: Record<string, LabEquipment[]> = {};
          rawEquipments.forEach(rawEq => {
            const category = rawEq.category || 'Lain-lain'; // Default category if empty
            if (!groupedByCategory[category]) {
              groupedByCategory[category] = [];
            }
            groupedByCategory[category].push({
              name: rawEq.name,
              description: rawEq.description,
              imageUrl: rawEq.imageUrl,
              iconName: rawEq.iconName as keyof typeof LucideIcons, // Cast string to keyof, renderIcon handles fallback
              storagePath: rawEq.storagePath,
            });
          });

          const equipmentCategoriesResult: LabEquipmentCategory[] = Object.entries(groupedByCategory)
            .map(([categoryName, equipmentList]) => ({
              categoryName,
              equipment: equipmentList,
            }));

          setLabData({
            displayName: data.title || 'Laboratorium Analisis', // Use new 'title' field
            description: data.deskripsi || '', // Use new 'deskripsi' field
            mainImages: (data.main_images as LabMainImage[]) || [], // 'main_images' directly maps
            equipmentCategories: equipmentCategoriesResult,
          });
        } else {
          setError('Data laboratorium tidak ditemukan.');
        }
      } catch (err: any) {
        console.error("Error fetching lab data:", err);
        setError(err.message || 'Gagal memuat data laboratorium.');
      } finally {
        setLoading(false);
      }
    };

    fetchLabData();
  }, [supabase]);

  const renderIcon = (iconName: keyof typeof LucideIcons | string) => {
    // Type guard to ensure iconName is a valid key
    if (iconName in LucideIcons) {
      const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as LucideIcons.LucideIcon;
      return <IconComponent className="w-6 h-6 text-maroon-700" />;
    }
    return <LucideIcons.FlaskConical className="w-6 h-6 text-maroon-700" />; // Default icon
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-maroon-700"></div>
        <p className="ml-4 text-xl text-maroon-700">Memuat data laboratorium...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center px-6">
        <LucideIcons.AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-600 mb-2">Terjadi Kesalahan</h2>
        <p className="text-gray-700">{error}</p>
        <p className="text-gray-500 mt-2">Silakan coba muat ulang halaman atau hubungi administrator.</p>
      </div>
    );
  }

  if (!labData) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center px-6">
         <LucideIcons.SearchX className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-600 mb-2">Data Tidak Ditemukan</h2>
        <p className="text-gray-500">Konten untuk laboratorium ini belum tersedia.</p>
      </div>
    );
  }

  return (
    <main className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-6 md:px-10 font-sans">
      {/* Foto Laboratorium */}
      <section className="px-2 md:px-4">
      <h1 className="text-3xl font-bold text-maroon-700 mb-8 text-center">{labData.displayName}</h1>
        {/* Deskripsi Laboratorium */}
        <div className="px-0">
          {labData.description.split('\n').map((paragraph, index) => (
            <p key={index} className="text-lg text-gray-700 text-justify mb-4">
              {paragraph}
            </p>
          ))}
        </div>

<section className="mb-8">
  <Swiper
    modules={[Autoplay, Pagination]}
    autoplay={{ delay: 3000 }}
    pagination={{ clickable: true }}
    loop
    className="aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl"
  >
    {labData.mainImages.map((img, index) => (
      <SwiperSlide key={index}>
        <img
          src={img.url}
          alt={img.alt}
          className="w-full h-full object-cover"
        />
      </SwiperSlide>
    ))}
  </Swiper>
</section>

        {/* Daftar Alat Laboratorium per Kategori */}
        {labData.equipmentCategories.map((category, catIndex) => (
          <section key={catIndex} className="mb-12">
            <h2 className="text-2xl font-semibold text-center text-maroon-700 mb-8">
              {category.categoryName}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {category.equipment.map((alat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden flex"
                >
                  {/* Gambar (1:1) */}
                  <div className="w-1/2 aspect-square overflow-hidden flex-shrink-0">
                    <img
                      src={alat.imageUrl}
                      alt={alat.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop if placeholder also fails
                        target.src = '/placeholder-alat.png'; // Path to your placeholder image
                      }}
                    />
                  </div>

                  {/* Deskripsi Centered */}
                  <div className="w-1/2 p-4 flex flex-col justify-center text-sm text-gray-700">
                    <div className="flex items-center gap-2 text-maroon-700 mb-3">
                      {renderIcon(alat.iconName)}
                      <h3 className="text-sm font-semibold">{alat.name}</h3>
                    </div>
                    <p>{alat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
