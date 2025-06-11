'use client';

import { FC, useEffect, useState } from "react";
import { createClient } from '@/utils/supabase/client';

// Represents data directly from the 'dosen' table for this component's needs
interface BaseDosen {
  id_dsn: string;
  nama: string;
  nip: string;
  nuptk?: string | null; // Added NUPTK
  nidn: string | null;
  role: string;
  foto?: string | null;
}

// Represents a Dosen after being processed with Jabatan information
interface ProcessedDosen extends BaseDosen {
  jabatan_title: string | null;
  position_category: 'pimpinan' | 'kps' | 'laboratorium' | null;
  position_order: number | null;
  has_position: boolean;
}

interface JabatanStruktural {
  id: string;
  title: string;
  dosen_id: string;
  category: 'pimpinan' | 'kps' | 'laboratorium';
  order: number;
}

// Interface for prodi content fetched from cms_prodi
interface ProdiContent {
  id_prodi: string;
  title: string | null;
  deskripsi: string | null;
  visi: string | null;
  misi: string | null;
  tujuan: string | null;
  profil_lulusan: string | null;
  file: string | null; // URL for certificate or main prodi document
}

// --- Reusable Helper Functions and Card Renderer (Copied for this component) ---

// Helper to check if title includes a specific role keyword (case-insensitive)
const hasTitleKeyword = (title: string | null | undefined, keyword: string): boolean => {
  if (!title) return false;
  return title.toLowerCase().includes(keyword.toLowerCase());
};

// getBadgeColor and getBadgeTitle functions are removed as they are no longer used.

// Card style for dosen - ALL CARDS WILL HAVE MAROON BORDER
const getCardStyle = (): string => {
  return 'bg-white border-2 border-maroon-500'; // Uniform maroon border for all cards
};

// Render a dosen card (only foto, nama, nip, nidn)
const renderDosenCard = (dosen: ProcessedDosen) => (
  <div
    key={dosen.id_dsn}
    className={`${getCardStyle()} rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center`}
  >
    <div className="w-48 aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 mb-4 relative"> {/* Lebar foto disamakan */}
      {dosen.foto ? (
        <img
          src={dosen.foto}
          alt={dosen.nama}
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-maroon-400">
          {dosen.nama ? dosen.nama.charAt(0).toUpperCase() : '?'}
        </div>
      )}
    </div>
    <div className="text-center flex-grow flex flex-col items-center justify-start space-y-1 w-full">
      <h3 className="text-lg font-semibold text-maroon-800">{dosen.nama}</h3>
      {/* Badge rendering code removed */}
      {/* Always show NIP, display '-' if not available */}
      <p className="text-sm text-gray-600">NIP: {dosen.nip || '-'}</p>
      {/* Always show NUPTK, display '-' if not available */}
      <p className="text-sm text-gray-600">NUPTK: {dosen.nuptk || '-'}</p>
      {/* Email and Prodi are hidden */}
    </div>
  </div>
);

// Helper function to check for academic titles
const hasAcademicTitle = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  return lowerName.startsWith('prof.dr. ') || lowerName.startsWith('prof.dr ') || // Handle "Prof.Dr. " and "Prof.Dr "
         lowerName.startsWith('prof. ') ||
         lowerName.startsWith('dr. ');
};
// --- End of Reusable Functions ---


export default function D3TeknikKimiaPSDKUSIAK() {
  const supabase = createClient();

  const [prodiDetails, setProdiDetails] = useState<ProdiContent | null>(null);
  const [loadingProdi, setLoadingProdi] = useState(true);
  const [errorProdi, setErrorProdi] = useState<string | null>(null);

  const [dosenPSDKU, setDosenPSDKU] = useState<ProcessedDosen[]>([]);
  const [loadingDosen, setLoadingDosen] = useState(true);
  const [errorDosen, setErrorDosen] = useState<string | null>(null);

  // Effect to fetch Prodi Details from cms_prodi for "D3 Teknik Kimia PSDKU SIAK"
  useEffect(() => {
    const fetchProdiDetails = async () => {
      setLoadingProdi(true);
      setErrorProdi(null);
      try {
        const { data, error } = await supabase
          .from('cms_prodi')
          .select('*')
          .eq('title', 'D3 Teknik Kimia PSDKU SIAK') // Fetch specifically for D3 Teknik Kimia PSDKU SIAK
          .single();

        if (error) {
          // console.error('Error fetching D3 Teknik Kimia PSDKU SIAK details:', JSON.stringify(error, null, 2));
          if (error.code === 'PGRST116') { // PostgREST error for "single() row not found"
            setErrorProdi(`Program studi "D3 Teknik Kimia PSDKU SIAK" tidak ditemukan di CMS.`);
          } else {
            setErrorProdi(`Gagal memuat detail Program Studi D3 Teknik Kimia PSDKU SIAK: ${error.message || 'Kesalahan tidak diketahui dari database.'}`);
          }
        } else if (data) {
          setProdiDetails(data);
        } else {
          setErrorProdi(`Program studi "D3 Teknik Kimia PSDKU SIAK" tidak ditemukan (data kosong).`);
        }
      } catch (err: any) {
        // console.error('Unexpected error fetching D3 Teknik Kimia PSDKU SIAK details:', err);
        setErrorProdi(`Terjadi kesalahan: ${err.message || err}`);
      } finally {
        setLoadingProdi(false);
      }
    };
    fetchProdiDetails();
  }, [supabase]);

  useEffect(() => {
    const fetchDosenPSDKU = async () => {
      setLoadingDosen(true);
      setErrorDosen(null); // Clear previous errors
      try {
        // Fetch dosen data, filtered by prodi and role on the server
        const { data, error } = await supabase
          .from('dosen')
          .select('id_dsn, nama, nip, nuptk, nidn, foto, role') // Added nuptk
          .eq('prodi', 'D3 Teknik Kimia PSDKU SIAK')     // Filter by prodi on the server
          .ilike('role', 'dosen');                       // Case-insensitive filter for role 'dosen' on the server

        if (error) {
          // console.error('Error fetching dosen. Raw error:', error, 'Message:', error?.message, 'Stack trace:', error?.stack);
          setErrorDosen('Gagal memuat data dosen D3 Teknik Kimia PSDKU SIAK');
          setLoadingDosen(false);
          return;
        }

        // Fetch all structural positions
        const { data: jabatanData, error: jabatanError } = await supabase
          .from('struktural_jabatan')
          .select('id, title, dosen_id, category, order')
          .not('dosen_id', 'is', null);

        if (jabatanError) {
          // console.warn('Could not fetch structural positions:', jabatanError);
          // Proceed without structural positions if fetching fails
        }

        // Create a map for quick lookup of positions by dosen_id
        const jabatanMap = new Map<string, JabatanStruktural>();
        jabatanData?.forEach(jabatan => {
          // Prioritize positions with lower 'order' if a dosen has multiple positions
          const existingJabatan = jabatanMap.get(jabatan.dosen_id);
          if (!existingJabatan || jabatan.order < existingJabatan.order) {
            jabatanMap.set(jabatan.dosen_id, jabatan);
          }
        });

        // Data from Supabase is already filtered by prodi and role.
        // We just need to map it to include jabatan information.
        let dosenWithJabatanProcessed: ProcessedDosen[] = data.map(dosen => {
          // Enhance filtered dosen with position info for sorting
          const jabatan = jabatanMap.get(dosen.id_dsn);
          if (jabatan) {
            return {
              ...dosen,
              jabatan_title: jabatan.title,
              position_category: jabatan.category,
              position_order: jabatan.order,
              has_position: true
            };
          }
          return {
            ...dosen,
            jabatan_title: null,
            position_category: null,
            position_order: null,
            has_position: false
          };
        });

        // --- Logic to move "Ir. Irawan Rusnadi, M.T." to the top ---
        const specialLecturerName = "Ir. Irawan Rusnadi, M.T.";
        let specialLecturerData: ProcessedDosen | null = null;

        const specialLecturerIndex = dosenWithJabatanProcessed.findIndex(d => d.nama === specialLecturerName);

        if (specialLecturerIndex > -1) {
          specialLecturerData = dosenWithJabatanProcessed[specialLecturerIndex];
          dosenWithJabatanProcessed.splice(specialLecturerIndex, 1); // Remove from the main list
        }
        // --- End of special lecturer logic ---

        // Separate Dosen with structural positions from regular Dosen
        const positionedDosen = dosenWithJabatanProcessed.filter(d => d.has_position);
        const nonPositionedDosen = dosenWithJabatanProcessed.filter(d => !d.has_position);

        const profDrDosen = nonPositionedDosen.filter(d => hasAcademicTitle(d.nama));
        const otherRegularDosen = nonPositionedDosen.filter(d => !hasAcademicTitle(d.nama));


        // Sort positioned Dosen:
        // 1. By category (Pimpinan, KPS, Laboratorium)
        // 2. By position_order within each category
        // 3. By name
        const categoryOrder = { pimpinan: 1, kps: 2, laboratorium: 3 };

        positionedDosen.sort((a, b) => {
          // position_category is guaranteed to be non-null for positionedDosen
          // and one of 'pimpinan', 'kps', 'laboratorium' as per JabatanStruktural interface
          const categoryAOrder = categoryOrder[a.position_category!];
          const categoryBOrder = categoryOrder[b.position_category!];

          if (categoryAOrder !== categoryBOrder) {
            return categoryAOrder - categoryBOrder;
          }

          // Within the same category, sort by position_order
          const orderA = a.position_order ?? Infinity;
          const orderB = b.position_order ?? Infinity;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          // Finally, sort by name
          return a.nama.localeCompare(b.nama);
        });

        // Sort regular Dosen alphabetically by name
        profDrDosen.sort((a, b) => a.nama.localeCompare(b.nama));
        otherRegularDosen.sort((a, b) => a.nama.localeCompare(b.nama));

        // Combine positioned Dosen first, then regular Dosen
        let finalSortedDosen = [...positionedDosen, ...profDrDosen, ...otherRegularDosen];

        if (specialLecturerData) {
          finalSortedDosen = [specialLecturerData, ...finalSortedDosen];
        }

        setDosenPSDKU(finalSortedDosen);

      } catch (err: any) {
        // console.error('Unexpected error fetching PSDKU dosen:', err);
        setErrorDosen(`Terjadi kesalahan saat memuat data dosen: ${err.message || err}`);
      } finally {
        setLoadingDosen(false);
      }
    };

    fetchDosenPSDKU();
  }, [supabase]); // Add supabase to dependency array

  if (loadingProdi) {
    return (
      <main className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-6 md:px-10 font-sans flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-maroon-700"></div>
        <p className="ml-4 text-xl text-maroon-700">Memuat data program studi...</p>
      </main>
    );
  }

  if (errorProdi && !prodiDetails) { // Show error only if details are not loaded at all
    return (
      <main className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-6 md:px-10 font-sans flex justify-center items-center">
        <div className="text-center p-8 bg-maroon-100 text-maroon-700 rounded-lg shadow-md">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{errorProdi}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-2 md:px-4 font-sans"> {/* Padding disamakan */}

      {/* Informasi Program Studi */}
      <section className="px-2 md:px-4">
        <h1 className="text-3xl font-bold text-maroon-700 mb-8 text-center">
          Program Studi {prodiDetails?.title || "D3 Teknik Kimia PSDKU SIAK"}
        </h1>

        {prodiDetails?.deskripsi ? (
          <p className="text-lg text-gray-700 mb-8 text-justify whitespace-pre-line">
            {prodiDetails.deskripsi}
          </p>
        ) : (
          <p className="text-lg text-gray-700 mb-8 text-justify">Deskripsi program studi belum tersedia.</p>
        )}
      </section>


      {/* Visi dan Misi */}
      <section className="px-2 md:px-4 mb-8">
        {prodiDetails?.visi && (
          <div className="mb-8 p-6 bg-maroon-50 rounded-xl shadow">
            <h2 className="text-2xl font-semibold text-maroon-700 mb-3">Visi</h2>
            <p className="text-lg text-gray-700 text-justify whitespace-pre-line leading-relaxed">
              {prodiDetails.visi}
            </p>
          </div>
        )}
        {!prodiDetails?.visi && !loadingProdi && <p className="text-gray-500">Visi belum tersedia.</p>}

        {prodiDetails?.misi && (
          <div className="p-6 bg-maroon-50 rounded-xl shadow">
            <h2 className="text-2xl font-semibold text-maroon-700 mb-3">Misi</h2>
            <ul className="space-y-3 text-lg text-gray-700 text-justify list-disc list-outside pl-5">
              {prodiDetails.misi.split('\n').map((item, index) =>
                item.trim() ? (
                  <li key={index} className="leading-relaxed">
                    {item.trim()}
                  </li>
                ) : null
              )}
            </ul>
          </div>
        )}
        {!prodiDetails?.misi && !loadingProdi && <p className="text-gray-500 mt-6">Misi belum tersedia.</p>}
      </section>

      {/* Tujuan */}
      <section className="px-2 md:px-4 mb-8">
        {prodiDetails?.tujuan && (
          <div className="p-6 bg-maroon-50 rounded-xl shadow">
            <h2 className="text-2xl font-semibold text-maroon-700 mb-3">Tujuan</h2>
            <ul className="space-y-3 text-lg text-gray-700 text-justify list-disc list-outside pl-5">
              {prodiDetails.tujuan.split('\n').map((item, index) =>
                item.trim() ? (
                  <li key={index} className="leading-relaxed">
                    {item.trim()}
                  </li>
                ) : null
              )}
            </ul>
          </div>
        )}
        {!prodiDetails?.tujuan && !loadingProdi && <p className="text-gray-500">Tujuan belum tersedia.</p>}
      </section>

      {/* Profil Lulusan from CMS */}
      <section className="px-2 md:px-4 mb-8">
        {prodiDetails?.profil_lulusan && (
          <div className="p-6 bg-maroon-50 rounded-xl shadow">
            <h2 className="text-2xl font-semibold text-maroon-700 mb-3">Profil Lulusan</h2>
            <ul className="space-y-3 text-lg text-gray-700 text-justify list-disc list-outside pl-5">
              {prodiDetails.profil_lulusan.split('\n').map((item, index) =>
                item.trim() ? (
                  <li key={index} className="leading-relaxed">
                    {item.trim()}
                  </li>
                ) : null
              )}
            </ul>
          </div>
        )}
        {!prodiDetails?.profil_lulusan && !loadingProdi && (
          <p className="text-gray-500">Profil Lulusan belum tersedia.</p>
        )}
      </section>

      {/* Sertifikat */}
      {prodiDetails?.file ? (
        <section className="flex justify-center mb-10">
          <img
            src={prodiDetails.file} // URL from Supabase Storage via cms_prodi table
            alt={`Sertifikat Akreditasi ${prodiDetails.title || "D3 Teknik Kimia PSDKU SIAK"}`}
            className="w-full max-w-3xl shadow-md rounded-lg"
          />
        </section>
      ) : (
        !loadingProdi && (
          <section className="text-center mb-10">
            <p className="text-gray-500">Sertifikat belum tersedia.</p>
          </section>
        )
      )}

      {/* Dosen D3 Teknik Kimia PSDKU SIAK Section */}
      <section className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-maroon-700 mb-8 text-center">
          Dosen D3 Teknik Kimia PSDKU SIAK
        </h1>

        {/* Loading indicator - Added w-full for better centering in parent flex */}
        {loadingDosen && (
          <div className="flex justify-center items-center w-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700 mx-auto mb-4"></div>
          </div>
        )}

        {/* Error message - Added w-full for better centering */}
        {errorDosen && (
          <div className="text-center p-8 bg-maroon-100 text-maroon-700 rounded-lg shadow-md w-full">
            <p className="text-xl font-semibold mb-2">Error</p>
            <p>{errorDosen}</p>
          </div>
        )}

        {/* No data message - Added w-full for better centering */}
        {!loadingDosen && !errorDosen && dosenPSDKU.length === 0 && (
          <div className="text-center p-8 bg-gray-100 text-gray-700 rounded-lg shadow-md w-full">
            <p className="text-xl font-semibold mb-2">Data Tidak Tersedia</p>
            <p>Tidak ada data dosen untuk Program Studi D3 Teknik Kimia PSDKU SIAK.</p>
          </div>
        )}

        {!loadingDosen && !errorDosen && dosenPSDKU.length > 0 && (
          // Flex container to center the grid
          <div className="flex justify-center">
            {/* Grid container for dosen cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-fit"> {/* Grid dan gap disamakan */}
              {dosenPSDKU.map(renderDosenCard)}
            </div>
          </div>
        )}
      </section>

      {/* Kurikulum */}
      <section className="px-2 md:px-4 mt-12"> {/* Increased top margin */}
        <h1 className="text-3xl font-bold text-maroon-700 mb-8 text-center">
          Kurikulum
        </h1>

        {/* Corrected layout for semester title and image */}
        {[1, 2, 3, 4, 5, 6].map((semester) => (
          <div key={semester} className="mb-8"> {/* Container for each semester block */}
            <h2 className="text-xl font-semibold text-maroon-700 mb-4 text-left"> {/* Centered semester title */}
              Semester {semester}
            </h2>
            <div className="flex"> {/* Flex container to center the image */}
              {/* [Image of Kurikulum Semester {semester}] */}
              <img
                src={`/kurikulumD3tekkimS${semester}.jpg`} // Assuming image names follow this pattern
                alt={`Kurikulum Semester ${semester}`}
                className="w-full max-w-3xl shadow-md rounded-lg" // Added rounded-lg
              />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
