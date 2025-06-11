'use client';

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Users, GraduationCap, MessageSquare } from "lucide-react";
import Link from "next/link";
import { createClient } from '@/utils/supabase/client'; // Import createClient

// Define TypeScript interfaces for data structures
interface JurusanStat {
  id: number;
  stat_type: 'program_studi' | 'tenaga_pendidik';
  name: string;
  count: number;
}

interface BeritaItem {
  id: number;
  title: string;
  slug: string;
  post_image: string;
  status: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  content: string;
  category_id?: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
}

interface AnimatedCounterProps {
  value: number;
  className: string;
  formatter?: (val: number) => string;
  delay?: number;
  triggerOnView?: boolean;
}

// Interface untuk item Kegiatan Publik
interface KegiatanPublikItem {
  id: string;
  image_urls: string[]; // Mengubah ke array untuk konsistensi, meskipun hanya pakai yg pertama
  description: string | null;
  created_at: string;
}

// Interface untuk item Testimoni Alumni
interface TestimoniAlumniItem {
  id: string;
  photo_url: string | null;
  storagePath?: string | null; // Tambahkan untuk keselarasan, opsional
  nama_alumni: string;
  prodi: string;
  angkatan: string;
  testimoni: string;
  created_at: string;
}

const images = ["/slide1.jpg", "/slide2.jpg", "/slide3.jpg"];

const companyLogos = [
  "/logo-pertamina.png",
  "/logo-pusri.png",
  "/logo-titiess.png",
  "/logo-chandraasri.png",
  "/logo-bukitasam.png",
  "/logo-lotte.jpg",
  "/logo-mayora.png",
  "/logo-pertasamtangas.png",
  "/logo-medco.png",
  "/logo-oki.jpg",
  "/logo-wilmar.jpg",
  "/logo-semenbr.png",
];

export default function Home() {
  const [postsData, setPostsData] = useState<BeritaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [prodiStats, setProdiStats] = useState<JurusanStat[]>([]);
  const [pendidikStats, setPendidikStats] = useState<JurusanStat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [kegiatanData, setKegiatanData] = useState<KegiatanPublikItem[]>([]);
  const [kegiatanError, setKegiatanError] = useState<string | null>(null);
  const [testimoniData, setTestimoniData] = useState<TestimoniAlumniItem[]>([]);
  const [testimoniError, setTestimoniError] = useState<string | null>(null);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [testimonialDirection, setTestimonialDirection] = useState(0);
  
  const [expandedKegiatan, setExpandedKegiatan] = useState<Set<string>>(new Set());
  // State untuk menyimpan string translasi X yang dinamis untuk carousel testimoni
  const getInitialXTranslation = (index: number): string => {
    let initialItemWidthPercent = 90; // Default untuk mobile (w-[90%])
    if (typeof window !== "undefined") {
      if (window.matchMedia('(min-width: 1024px)').matches) { // lg (lg:w-[45%])
        initialItemWidthPercent = 45;
      } else if (window.matchMedia('(min-width: 768px)').matches) { // md (md:w-[60%])
        initialItemWidthPercent = 60;
      }
    }
    const initialOffsetPercent = (100 - initialItemWidthPercent) / 2;
    return `calc(-${index * initialItemWidthPercent}% + ${initialOffsetPercent}%)`;
  };
  const [testimonialXTranslation, setTestimonialXTranslation] = useState(() => getInitialXTranslation(currentTestimonialIndex));
  const [combinedPostsData, setCombinedPostsData] = useState<BeritaItem[]>([]);
  const supabase = createClient(); // Inisialisasi Supabase client

  // Varian animasi untuk kartu dan filter gambar
  const cardEntryVariants = {
    initial: { opacity: 0, y: 30 },
    inView: { opacity: 1, y: 0 },
    // hover: { scale: 1.02, transition: { duration: 0.3 } } // Contoh efek hover pada kartu
  };

  const imageFilterVariants = {
    initial: { filter: "grayscale(100%)" },
    inView: {
      filter: "grayscale(0%)",
      transition: { duration: 0.6, ease: "easeOut", delay: 0.4 } // Delay ditingkatkan menjadi 0.4 detik
    },
    hover: {
      filter: "grayscale(0%)",
      transition: { duration: 0.3, ease: "easeOut", delay: 0.1 } // Delay ditambahkan 0.1 detik untuk hover
    },
  };
  const autoSlideIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Replace the existing useEffect for program studi
  useEffect(() => {
    const fetchJurusanStats = async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('jurusan_stats')
          .select('*')
          .order('id');

        if (error) throw error;

        // Separate the data by stat_type
        if (data) {
          setProdiStats(data.filter(stat => stat.stat_type === 'program_studi'));
          setPendidikStats(data.filter(stat => stat.stat_type === 'tenaga_pendidik'));
        }
      } catch (error) {
        console.error("Gagal memuat jumlah mahasiswa dan dosen:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJurusanStats();
  }, []);

  const fetchAllPosts = async () => {
    try {
      setIsLoading(true);

      const { data: postsWithCategories, error: postsError } = await supabase
        .from('berita')
        .select(`
          *,
          category:category_id(id, name, slug)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error("Gagal memuat berita", postsError);
        setCombinedPostsData([]);
        return;
      }

      // Process the data
      const formattedPosts = postsWithCategories.map(post => {
        return {
          ...post,
          content: post.content || (post.sections && post.sections.length > 0 ? post.sections[0].content : '')
        };
      });

      setCombinedPostsData(formattedPosts || []);
    } catch (error) {
      console.error("Gagal memuat informasi:", error);
      setCombinedPostsData([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAllPosts();
    fetchKegiatanPublik();
    fetchTestimoniAlumni();
  }, []);

  const fetchKegiatanPublik = async () => {
    try {
      console.log("Attempting to fetch kegiatan publik...");
      setKegiatanError(null);
      const { data, error } = await supabase
        .from('kegiatan')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error("Supabase error fetching kegiatan publik:", error);
        setKegiatanError(`Gagal memuat kegiatan: ${error.message}. Periksa RLS dan nama tabel.`);
        setKegiatanData([]);
        return;
      }

      if (data) {
        console.log("Supabase data fetched for kegiatan publik:", data);
        // Pastikan image_urls selalu array
        const formattedData = data.map(item => ({
          ...item,
          image_urls: Array.isArray(item.image_urls) ? item.image_urls : (item.image_urls ? [String(item.image_urls)] : [])
        }));
        setKegiatanData(formattedData as KegiatanPublikItem[]);
        if (data.length === 0) {
          console.log("Fetch kegiatan publik berhasil, namun tabel 'kegiatan' kosong atau tidak ada data yang cocok.");
        }
      } else {
        console.log("Supabase data for kegiatan publik is null (no error, but no data), setting kegiatanData to empty array.");
        setKegiatanData([]);
      }
    } catch (error: any) {
      console.error("Exception during fetchKegiatanPublik:", error);
      setKegiatanError(`Terjadi kesalahan (exception) saat memuat kegiatan: ${error.message || 'Unknown error'}`);
      setKegiatanData([]);
    }
  };

  const fetchTestimoniAlumni = async () => {
    try {
      console.log("Attempting to fetch testimoni alumni...");
      setTestimoniError(null);
      const { data, error } = await supabase
        .from('testimoni_alumni') // Pastikan nama tabel ini benar
        .select('id, photo_url, nama_alumni, prodi, angkatan, testimoni, created_at') // Hapus storagePath jika tidak ada
        .order('created_at', { ascending: false }); // Hapus limit untuk mengambil semua testimoni

      if (error) {
        console.error("Supabase error fetching testimoni alumni:", error);
        // Construct a more informative message if error.message is not available
        const errorMessage = error.message || "Terjadi kesalahan dari Supabase (detail tidak tersedia)";
        setTestimoniError(`Gagal memuat testimoni: ${errorMessage}. Periksa RLS, nama tabel, dan koneksi jaringan.`);
        setTestimoniData([]);
        setCurrentTestimonialIndex(0); // Reset index on error
        return;
      }

      if (data && data.length > 0) {
        console.log("Supabase data fetched for testimoni alumni:", data);
        setTestimoniData(data);
        // Calculate the middle index and set it
        // This will ensure the carousel starts from the middle testimonial
        const middleIndex = Math.floor(data.length / 2);
        setCurrentTestimonialIndex(middleIndex);
      } else {
        console.log("data for testimoni alumni is null or empty, setting testimoniData to empty array.");
        setTestimoniData([]);
        setCurrentTestimonialIndex(0); // Reset index if no data
      }
    } catch (error: any) {
      console.error("Exception during fetchTestimoniAlumni:", error);
      setTestimoniError(`Terjadi kesalahan (exception) saat memuat testimoni: ${error.message || 'Unknown error'}`);
      setTestimoniData([]);
      setCurrentTestimonialIndex(0); // Reset index on exception
    }
  };

  // Efek untuk mengkalkulasi ulang translasi X carousel testimoni saat ukuran layar berubah atau indeks testimoni berubah
  useEffect(() => {
    const calculateTestimonialXTranslation = () => {
      let currentItemWidthPercent = 90; // Default untuk mobile (sesuai dengan class w-[90%])
      
      if (typeof window !== "undefined") { // Pastikan window object tersedia
        // Urutan penting: dari besar ke kecil, sesuai dengan cara kerja media query CSS
        if (window.matchMedia('(min-width: 1024px)').matches) { // lg dan lebih besar (sesuai dengan lg:w-[45%])
          currentItemWidthPercent = 45;
        } else if (window.matchMedia('(min-width: 768px)').matches) { // md hingga sebelum lg (sesuai dengan md:w-[60%])
          currentItemWidthPercent = 60;
        }
        // Jika tidak ada yang cocok, tetap 90%
      }

      const offsetPercent = (100 - currentItemWidthPercent) / 2;
      setTestimonialXTranslation(`calc(-${currentTestimonialIndex * currentItemWidthPercent}% + ${offsetPercent}%)`);
    };

    calculateTestimonialXTranslation(); // Panggil saat mount dan saat currentTestimonialIndex berubah
    window.addEventListener('resize', calculateTestimonialXTranslation);
    return () => window.removeEventListener('resize', calculateTestimonialXTranslation);
  }, [currentTestimonialIndex]); // Dependensi pada currentTestimonialIndex
  
  // Image carousel auto-rotation
  useEffect(() => {
    const startAutoSlide = () => {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
      }
      autoSlideIntervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 5000);
    };
    startAutoSlide();
    return () => {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
      }
    };
  }, [images.length]); // Tambahkan images.length sebagai dependensi jika bisa berubah, atau biarkan kosong jika images konstan

  const handleManualNavigation = (direction: number) => {
    setCurrentIndex(
      (prevIndex) => (prevIndex + direction + images.length) % images.length
    );

    // Reset the auto-slide timer
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
    }
    autoSlideIntervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Mulai interval baru
  };

  // Alternative approach using a map for more consistent category colors
  const categoryColorMap: Record<string, string> = {
    "Berita": "bg-emerald-500",
    "Lowongan Kerja": "bg-blue-500",
    "Pengumuman": "bg-amber-500",
    "Akademik": "bg-purple-500",
  };

  // Color mapping for program studi
  const getProdiColor = (index: number): string => {
    const colors = [
      "bg-emerald-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-red-500",
      "bg-orange-500"
    ];
    return colors[index % colors.length];
  };

  // Function to get color based on category name
  const getCategoryColor = (category: { name: string } | undefined): string => {
    if (!category) return "bg-gray-600"; // Default color

    // Return specific color if exists in map, otherwise use default
    return categoryColorMap[category.name] || "bg-gray-600";
  };

  const paginateTestimonials = (newDirection: number) => {
    if (testimoniData.length <= 1) return; // Don't paginate if 1 or no items
    setTestimonialDirection(newDirection);
    setCurrentTestimonialIndex(prevIndex => {
      let newIndex = prevIndex + newDirection;
      if (newIndex < 0) {
        newIndex = testimoniData.length - 1;
      } else if (newIndex >= testimoniData.length) {
        newIndex = 0;
      }
      return newIndex;
    });
  };

  const toggleKegiatanExpansion = (id: string) => {
    setExpandedKegiatan(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const slideVariants = {
  };

  return (
    <main className="w-full h-full items-center justify-center">
      {/* Hero Section with Slideshow */}
      <section className="relative w-full h-[500px] overflow-hidden">
        <AnimatePresence>
          {images.map(
            (src, index) =>
              index === currentIndex && (
                <motion.div
                  key={src}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0"
                >
                  <img
                    src={src}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full brightness-75 object-cover"
                  />
                </motion.div>
              )
          )}
        </AnimatePresence>

        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col justify-end items-start text-left text-white bg-black/30 p-8 sm:p-12 md:p-16">
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl font-[Arial] font-bold tracking-tight mb-2 max-w-3xl"
          >
            Jurusan Teknik Kimia
            <br />
            Politeknik Negeri Sriwijaya
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, delay: 0.3 }}
            className="text-sm sm:text-base md:text-base font-light max-w-full md:max-w-3xl whitespace-normal"
          >
            Menyediakan informasi terkini mengenai akademik, kegiatan, dan layanan administrasi Jurusan Teknik Kimia.
          </motion.p>
        </div>
      </section>

      {/* Company Logos Section with distinct background */}
      <section className="py-5 bg-gradient-to-r from-gray-100 to-gray-200"> {/* Mengurangi padding vertikal lagi */}
        <div className="container mx-auto px-6">
          <div className="flex justify-center items-center overflow-hidden bg-white rounded-xl shadow-lg p-4"> {/* Mengurangi padding internal */}
            <motion.div
              className="flex items-center space-x-12"
              animate={{
                x: [0, -50 * companyLogos.length],
                transition: {
                  x: { repeat: Infinity, duration: 20, ease: "linear" },
                },
              }}
            >
              {[...companyLogos, ...companyLogos].map((logo, index) => (
                <div key={index} className="flex-shrink-0">
                  <img
                    src={logo}
                    alt="Company Logo"
                    className="object-contain h-[70px] w-auto" // Mengecilkan tinggi logo
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-4 bg-gradient-to-r from-gray-100 to-gray-200">
        <div className="max-w-screen-4xl mx-auto px-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Memuat data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 2xl:grid-cols-6 gap-4">
              {[...prodiStats, ...pendidikStats].map((stat, index) => {
                const isProdi = index < prodiStats.length;
                const color = isProdi ? getProdiColor(index) : "bg-emerald-500";
                let iconColor;
                if (isProdi) {
                  if (stat.name === "D4 Teknik Energi") {
                    iconColor = "text-purple-600"; // Warna ungu spesifik untuk ikon D4 Teknik Energi (sedikit digelapkan untuk kontras)
                  } else {
                    iconColor = `text-${getProdiColor(index).replace("bg-", "")}`;
                  }
                } else {
                  iconColor = "text-emerald-600"; // Untuk tenaga pendidik
                }
                const iconBg = isProdi
                  ? `${getProdiColor(index)} bg-opacity-20`
                  : "bg-emerald-100";
                let textColor;
                if (isProdi) {
                  const baseColorName = getProdiColor(index).replace("bg-", ""); // e.g., "emerald-500"
                  if (stat.name === "D4 Teknik Energi") {
                    textColor = "text-purple-700"; // Warna ungu untuk jumlah mahasiswa D4 Teknik Energi
                  } else if (stat.name === "S2 Energi Terbarukan") {
                    textColor = "text-orange-500"; // Warna oranye spesifik untuk S2
                  } else {
                    textColor = `text-${baseColorName.replace("-500", "-700")}`;
                  }
                } else {
                  textColor = "text-emerald-700"; // Untuk tenaga pendidik
                }

                const value = stat.count || 0;

                return (
                  <div
                    key={stat.id}
                    className="flex flex-col bg-white rounded-xl shadow hover:shadow-md transition-shadow duration-300 p-4 md:p-5"
                  >
                    <div className={`${color} h-1 mb-3 rounded`}></div>
                    <div className="flex items-center mb-3">
                      <div className={`${iconBg} p-3 rounded-full`}>
                        <Users className={`${iconColor}`} size={22} />
                      </div>
                      <h3 className="text-base font-semibold text-gray-700 ml-2">
                        {stat.name}
                      </h3>
                    </div>
                    <div className="mt-auto pt-3 border-t flex items-center">
                      <Users className="text-gray-400" size={18} />
                      <div className="ml-2 flex items-baseline">
                        <AnimatedCounter
                          value={value}
                          className={`text-xl font-bold ${textColor}`}
                          formatter={(value) =>
                            value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                          }
                          delay={index * 100}
                          triggerOnView={true}
                        />
                        <span className="text-sm text-gray-500 ml-1">
                          {isProdi ? "mahasiswa" : "dosen/tendik"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>


      <section className="py-8 bg-gradient-to-r from-gray-100 to-gray-200">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-1">
            INFORMASI TERKINI
          </h2>
          <p className="text-gray-600 text-center mb-6 max-w-2xl mx-auto">
            Dapatkan update terbaru seputar berita, dan pengumuman resmi dari Jurusan Teknik Kimia.
          </p>

          <div className="relative">
            {isLoading ? (
              <div className="flex justify-center items-center h-64 bg-white/50 backdrop-blur-sm rounded-xl">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Memuat data...</span>
              </div>
            ) : combinedPostsData.length === 0 ? (
              <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-md">
                <p className="text-gray-500">Tidak ada informasi terbaru</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {combinedPostsData
                    .slice(0, 8)
                    .map((post, index) => (
                      <motion.div
                        key={post.id}
                        variants={cardEntryVariants}
                        initial="initial"
                        whileInView="inView"
                        whileHover="hover" // Meneruskan state hover ke children
                        transition={{ duration: 0.12, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="group bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1" // Tambahkan 'group'
                      >
                        <div className="relative h-48 overflow-hidden">
                          <motion.div
                            className="w-full h-full"
                            variants={imageFilterVariants}
                            // Transisi untuk filter dikelola dalam imageFilterVariants
                          > <img
                              src={post.post_image || "/placeholder.png"}
                              alt={post.title}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.png";
                              }}
                              className="w-full h-full object-cover" // Kelas filter dan group-hover dihapus
                            />
                          </motion.div>
                          
                          <div className="absolute top-4 left-4 z-10">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold shadow-md ${getCategoryColor(post.category)} text-white`}
                            >
                              {post.category?.name || "Informasi"}
                            </span>
                          </div>

                          {/* Gradient overlay, pastikan ini di atas gambar jika diperlukan */}
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent z-0"></div>
                        </div>

                        <div className="p-6">
                          <h3 className="text-lg font-bold mb-2 line-clamp-2 text-gray-800 group-hover:text-red-800 transition-colors"> {/* Ubah ke group-hover:text-red-800 */}
                            {post.title}
                          </h3>
                          <p className="text-gray-500 text-sm mb-4 line-clamp-3">
                            {post.content}
                          </p>

                          <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100">
                            <span className="text-xs text-gray-400">
                              {post.published_at || post.created_at ? new Date(post.published_at || post.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              }) : "Recent"}
                            </span>
                            <Link
                              href={`/info/berita/${post.slug}`}
                              className={`text-sm font-medium flex items-center text-${getCategoryColor(post.category).replace('bg-', '').replace('-500', '-600')} hover:text-red-700`}
                            >
                              Lihat Detail
                              <ChevronRight size={16} className="ml-1" />
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
                {/* Tautan Lihat Semua Berita */}
                {combinedPostsData.length > 0 && (
                  <div className="mt-4 text-right">
                    <Link
                      href="/info/berita"
                      className="text-red-800 hover:text-red-900 text-sm font-medium transition-colors duration-300 inline-flex items-center group"
                    >
                      Lihat Semua Berita
                      <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Section Kegiatan Jurusan */}
      <section className="pt-2 pb-8 bg-gradient-to-r from-gray-100 to-gray-200">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-1">
            KEGIATAN JURUSAN
          </h2>
          <p className="text-gray-600 text-center mb-6 max-w-2xl mx-auto">
            Lihat kegiatan yang telah dilaksanakan serta jadwal kegiatan yang akan dilaksanakan oleh Jurusan Teknik Kimia.
          </p>

          {isLoading && kegiatanData.length === 0 && !kegiatanError ? (
            <div className="flex justify-center items-center h-64 bg-white/50 backdrop-blur-sm rounded-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Memuat kegiatan...</span>
            </div>
          ) : kegiatanError ? (
            <div className="flex flex-col justify-center items-center h-64 bg-red-50 text-red-700 rounded-xl shadow-md p-4">
              <p className="font-semibold">Tidak dapat menampilkan kegiatan.</p>
              <p className="text-sm mt-1">Error: {kegiatanError}</p>
            </div>
          ) : kegiatanData.length === 0 ? (
            <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-md">
              <p className="text-gray-500">Belum ada kegiatan yang dipublikasikan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {kegiatanData.map((kegiatan, index) => {
                const isExpanded = expandedKegiatan.has(kegiatan.id);
                return (
                  <motion.div
                    key={kegiatan.id}
                    initial={{ opacity: 0, y: 30 }}
                    variants={cardEntryVariants}
                    whileInView="inView"
                    whileHover="hover" // Meneruskan state hover
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1" // Tambahkan 'group'
                  >
                    {/* Container untuk gambar, tanpa Link */}
                    <div className="relative h-60 overflow-hidden"> {/* Memperpanjang tinggi gambar menjadi h-60 */}
                      <motion.div
                        className="absolute top-0 left-0 w-full h-full"
                        variants={imageFilterVariants}
                      // Transisi untuk filter dikelola dalam imageFilterVariants
                      > <img
                          src={(kegiatan.image_urls && kegiatan.image_urls.length > 0 ? kegiatan.image_urls[0] : "/placeholder.png")}
                          alt={kegiatan.description || "Gambar Kegiatan"}
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent z-0"></div>
                    </div>
                    <div className="p-6">
                      <h3
                        className={`text-lg font-bold mb-2 text-gray-800 group-hover:text-red-800 transition-colors cursor-pointer ${!isExpanded ? 'line-clamp-2' : ''}`} // Ubah ke group-hover:text-red-800
                        onClick={() => toggleKegiatanExpansion(kegiatan.id)}
                        title={isExpanded ? "Klik untuk meringkas" : "Klik untuk selengkapnya"}
                      >
                        {kegiatan.description ?
                          (isExpanded ? kegiatan.description : (kegiatan.description.length > 70 ? kegiatan.description.substring(0, 70) + "..." : kegiatan.description))
                          : <span className="italic text-gray-500">Kegiatan</span>
                        }
                      </h3>
                      <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400">
                          {new Date(kegiatan.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          {/* Tautan Lihat Semua Kegiatan */}
          {kegiatanData.length > 0 && !kegiatanError && (
            <div className="mt-4 text-right">
              <Link
                href="/info/kegiatan"
                className="text-red-800 hover:text-red-900 text-sm font-medium transition-colors duration-300 inline-flex items-center group"
              >
                Lihat Semua Kegiatan
                <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Section Testimoni Alumni */}
      <section className="py-8 bg-gradient-to-r from-gray-100 to-gray-200"> {/* Sedikit ubah background untuk variasi jika diinginkan, atau tetap putih */}
        <div className="container mx-auto px-2">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-1">
            APA KATA ALUMNI?
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto">
            Dengarkan pengalaman dan kesan dari para alumni Teknik Kimia Politeknik Negeri Sriwijaya.
          </p>

          {isLoading && testimoniData.length === 0 && !testimoniError ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Memuat testimoni...</span>
            </div>
          ) : testimoniError ? (
            <div className="flex flex-col justify-center items-center h-64 bg-red-50 text-red-700 rounded-xl shadow-md p-4">
              <p className="font-semibold">Tidak dapat menampilkan testimoni.</p>
              <p className="text-sm mt-1">Error: {testimoniError}</p>
            </div>
          ) : testimoniData.length === 0 ? (
            <div className="flex justify-center items-center h-64 bg-gray-50 rounded-xl shadow-md">
              <p className="text-gray-500">Belum ada testimoni yang dipublikasikan.</p>
            </div>
          ) : (
            <div className="relative w-full mx-auto overflow-hidden py-4">
              <motion.div
                className="flex"
                animate={{ x: testimonialXTranslation }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }} // Sedikit penyesuaian pada transisi untuk feel
              >
                {testimoniData.map((testimoni, index) => {
                  const testimoniText = testimoni.testimoni;
                  return (
                    <motion.div
                      key={testimoni.id}
                      className="w-[90%] md:w-[60%] lg:w-[45%] flex-shrink-0 p-3 md:p-4 transition-opacity duration-300" // Item lebih lebar: 90% di mobile, 60% di md, 45% di lg
                      animate={{
                        scale: index === currentTestimonialIndex ? 1.0 : 0.9, // Item aktif scale 1, item lain sedikit lebih kecil
                        opacity: index === currentTestimonialIndex ? 1 : 0.6,  // Item aktif full opacity, item lain lebih transparan
                        zIndex: index === currentTestimonialIndex ? 10 : 1,    // Item aktif di atas
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="bg-white rounded-xl shadow-lg pt-6 px-6 pb-4 flex flex-col transition-all duration-300 h-full"> {/* Menghilangkan hover:shadow-2xl */}
                        <div className="flex flex-col sm:flex-row items-start mb-4 w-full">
                          <div className="relative w-32 md:w-36 rounded-md overflow-hidden shadow-md flex-shrink-0" style={{ aspectRatio: '3/4' }}>
                            <img
                              src={testimoni.photo_url || "/avatar-placeholder.png"}
                              alt={testimoni.nama_alumni}
                              onError={(e) => { (e.target as HTMLImageElement).src = "/avatar-placeholder.png"; }}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="sm:ml-5 mt-2 sm:mt-0 flex flex-col flex-grow">
                            <h3 className="text-lg md:text-xl font-semibold text-gray-800">
                              <span className="text-base md:text-lg font-semibold text-gray-800">{testimoni.nama_alumni}</span>
                            </h3> {/* Garis pemisah */}
                            <div className="w-full h-[1.5px] bg-gray-200 my-2"></div> {/* Garis pemisah ditebalkan */}
                            <p className="text-sm text-gray-700 font-semibold mb-2"> {/* Tambahkan mb-2 di sini */}
                              {testimoni.prodi} - {testimoni.angkatan}
                            </p>
                            <p className="text-gray-700 italic text-sm leading-relaxed mb-0">
                              "{/* Tanda kutip pembuka */}<span className="inline">{testimoniText}</span>{/* Teks testimoni */}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
              {/* Tombol Navigasi Slideshow */}
              {testimoniData.length > 1 && (
                <>
                  <button
                    onClick={() => paginateTestimonials(-1)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg transition-all z-20" // z-20 agar di atas konten
                    aria-label="Testimoni Sebelumnya"
                  >
                    <ChevronLeft className="text-gray-700" size={28} />
                  </button>
                  <button
                    onClick={() => paginateTestimonials(1)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg transition-all z-20" // z-20 agar di atas konten
                    aria-label="Testimoni Berikutnya"
                  >
                    <ChevronRight className="text-gray-700" size={28} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}



// Animated Counter Component implementation with TypeScript support
const AnimatedCounter = ({
  value,
  className,
  formatter = (val) => val.toString(),
  delay = 0,
  triggerOnView = false
}: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!triggerOnView);

  // Handle visibility detection if triggerOnView is true
  useEffect(() => {
    if (!triggerOnView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once it's visible, we don't need the observer anymore
          if (counterRef.current) {
            observer.unobserve(counterRef.current);
          }
        }
      },
      { threshold: 0.1 } // Trigger when at least 10% of the element is visible
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, [triggerOnView]);

  // Animate the counter
  useEffect(() => {
    if (!isVisible) return;

    let startValue = 0;
    let endValue = value;
    let duration = 2000; // 2 seconds total animation time

    // If the value is very large, adjust the animation speed
    if (value > 1000) {
      duration = 2500;
    }

    // Delay start if specified
    const timeoutId = setTimeout(() => {
      let startTime: number | null = null;

      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);

        // Ease out function for smoother ending
        const easeOutQuad = (t: number) => t * (2 - t);
        const easedProgress = easeOutQuad(progress);

        setCount(Math.floor(startValue + easedProgress * (endValue - startValue)));

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          setCount(endValue); // Ensure we end at exactly the target value
        }
      };

      window.requestAnimationFrame(step);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, delay, isVisible]);

  return (
    <div ref={counterRef} className={className}>
      {formatter(count)}
    </div>
  );
};