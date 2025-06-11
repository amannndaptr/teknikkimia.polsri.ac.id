'use client';

import React, { useState, useEffect } from 'react'; // Added useEffect
import Link from 'next/link';
import { Award, Users, ChevronDown, ChevronUp } from 'lucide-react'; // Removed unused ArrowLeft, ExternalLink
import Image from 'next/image';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client'; // Import Supabase client

interface Scholarship {
  id: string;
  name: string;
  short_name: string | null; // Sesuai skema DB
  provider: string;
  logo_url?: string | null;
  description: string | null;
  general_eligibility: string[]; // Ini akan diambil dari JSONB
  benefits: string[]; // Ini akan diambil dari JSONB
  website_url: string | null;
  contact_info?: string | null;
  // created_at dan storage_path_logo tidak perlu di sini untuk tampilan
}

export default function BeasiswaPage() { // Pindahkan export default ke sini
  const [scholarshipsData, setScholarshipsData] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchScholarships = async () => {
      setLoading(true);
      setError(null);
      setScholarshipsData([]); // Reset data on new fetch attempt

      try {
        const { data, error: fetchError } = await supabase
          .from('cms_beasiswa') // Nama tabel Anda untuk beasiswa
          .select('id, name, short_name, provider, logo_url, description, general_eligibility, benefits, website_url, contact_info')
          .order('name', { ascending: true });

        if (fetchError) {
          console.error('Error fetching scholarships. Raw Supabase error object:', fetchError);
          // Attempt to get more details from the error object
          const message = (fetchError as any)?.message || 'Detail kesalahan tidak tersedia dari Supabase.';
          const code = (fetchError as any)?.code;
          const details = (fetchError as any)?.details;
          console.error(`Supabase Error Details - Message: ${message}, Code: ${code}, Details: ${details}`);

          if (code === 'PGRST116') { // Specific check for "no rows"
            setError('Data beasiswa tidak ditemukan.');
            // scholarshipsData is already empty, so no need to set it again
          } else {
            setError(`Gagal memuat data beasiswa: ${message}`);
          }
        } else {
          setScholarshipsData(data || []);
          if (!data || data.length === 0) {
            // setError('Belum ada informasi beasiswa yang tersedia saat ini.'); // Optional: set error or rely on empty state message
          }
        }
      } catch (err: any) { // Catch any other unexpected errors during the fetch process
        console.error('An unexpected error occurred during fetchScholarships:', err);
        setError(err.message || 'Terjadi kesalahan yang tidak terduga saat mengambil data.');
      } finally {
        setLoading(false);
      }
    };
    fetchScholarships();
  }, [supabase]);

// Utility function to truncate text
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const ScholarshipCard: React.FC<{ scholarship: Scholarship, index: number }> = ({ scholarship, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      onClick={() => {
        if (isExpanded) {
          setIsExpanded(false);
        }
      }}
      className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group flex flex-col"
    >
      <div className="relative h-36 overflow-hidden bg-gray-50"> {/* Mengurangi tinggi area gambar */}
        {/* Mengganti Next/Image dengan tag img standar */}
        <img
          src={scholarship.logo_url || "/placeholder.png"}
          alt={`${scholarship.provider} Logo`}
          className="w-full h-full object-contain p-4 transition-all duration-500" // Menyesuaikan class untuk img
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null; // Mencegah loop tak terbatas jika placeholder juga gagal
            target.src = "/placeholder.png"; // Fallback ke placeholder
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent"></div>
      </div>

      <div className="p-4 flex flex-col flex-grow"> {/* Mengurangi padding konten */}
        <a
          href={scholarship.website_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-bold mb-1 text-maroon-700 hover:text-blue-600 transition-colors line-clamp-2"
        >
          {scholarship.name}
        </a>
        <p className="text-xs text-gray-500 mb-3">Disediakan oleh: {scholarship.provider}</p>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2"> {/* Mengurangi line-clamp dan margin bawah */}
          {truncateText(scholarship.description || 'Informasi detail belum tersedia.', 80)} {/* Opsional: kurangi panjang teks truncate */}
        </p>

        {isExpanded && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '16px' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3 mb-4 text-xs">
              <div>
                <h4 className="font-semibold text-gray-700 mb-1 flex items-center">
                  <Users size={14} className="mr-1 text-maroon-600" /> Kriteria Umum:
                </h4>
                <ul className="list-disc list-inside text-gray-500 pl-2 space-y-0.5">
                  {Array.isArray(scholarship.general_eligibility) && scholarship.general_eligibility.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-1 flex items-center">
                  <Award size={14} className="mr-1 text-maroon-600" /> Manfaat:
                </h4>
                <ul className="list-disc list-inside text-gray-500 pl-2 space-y-0.5">
                  {Array.isArray(scholarship.benefits) && scholarship.benefits.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {scholarship.contact_info && (
              <p className="text-xs text-gray-500 italic mb-4">{scholarship.contact_info}</p>
            )}
          </motion.div>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Mencegah event klik menyebar ke card parent
              setIsExpanded(!isExpanded);
            }}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500 transition-colors"
          >
            {isExpanded ? 'Sembunyikan Detail' : 'Lihat Detail Lengkap'}
            {isExpanded ? <ChevronUp size={18} className="ml-2" /> : <ChevronDown size={18} className="ml-2" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Pindahkan export default function BeasiswaPage() ke atas
// export default function BeasiswaPage() {
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div><p className="ml-3">Memuat data beasiswa...</p></div>;
  }
  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">{error}</div>;
  }
  return ( // Pastikan return ini ada di dalam BeasiswaPage
    <div className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-6 md:px-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 text-center"> {/* Mengurangi margin bawah lebih lanjut ke mb-4 */}
          <h1 className="text-3xl font-bold text-maroon-700 mb-3 text-center"> {/* Mengurangi margin bawah */}
            Informasi Beasiswa
          </h1>
          <p className="mt-1 text-md text-gray-700"> {/* Mengurangi margin atas */}
            Temukan beasiswa yang tersedia di Politeknik Negeri Sriwijaya.
          </p>
        </div>

        {scholarshipsData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {scholarshipsData.map((scholarship, index) => (
              <ScholarshipCard key={scholarship.id} scholarship={scholarship} index={index} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">Belum ada informasi beasiswa yang tersedia saat ini.</p>
        )}

      </div>
    </div>
  );
}