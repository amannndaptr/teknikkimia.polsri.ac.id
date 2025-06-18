'use client';

import { FC, useEffect, useState } from "react";
import { createClient } from '@/utils/supabase/client';

// Define all types properly
interface Dosen {
    id_dsn: string;
    nama: string;
    nip: string;
    email: string;
    nidn: string | null;
    prodi: string | null;
    role: string; // Added role to the interface
    foto?: string | null;
    jabatan_title?: string | null;
    position_category?: 'pimpinan' | 'kps' | 'laboratorium' | null; // Allow null
    position_order?: number | null; // Allow null
    has_position: boolean;
    nuptk?: string | null; // Added NUPTK
    // status_dosen: string; // Assuming status_dosen is a column in your database but not used in logic here
}

// Interface for the raw data fetched from Supabase for 'dosen' table
interface FetchedDosen {
    id_dsn: string;
    nama: string;
    nip: string;
    email: string;
    nidn: string | null;
    prodi: string | null;
    foto?: string | null;
    role: string;
    nuptk?: string | null;
}

interface JabatanStruktural {
    id: string;
    title: string;
    dosen_id: string;
    category: 'pimpinan' | 'kps' | 'laboratorium';
    order: number;
}

// Simplified Group structure for organizing data
interface OrganizedDosenData {
    dosen: Dosen[]; // Combined list of all Dosen (with structural positions first)
    staff: Dosen[]; // List of all Staff (non-Dosen roles)
}

const DaftarDosen: FC = () => {
    const supabase = createClient();
    // Initialize state with the simplified structure
    const [dosenData, setDosenData] = useState<OrganizedDosenData>({
        dosen: [],
        staff: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // prodiList is no longer needed for main grouping, but keeping it might be useful elsewhere?
    // const [prodiList, setProdiList] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all dosen data
                const { data: dosenData, error: dosenError } = await supabase
                    .from('dosen')
                    .select('id_dsn, nama, nip, email, nidn, prodi, foto, role, nuptk') // Added nuptk to select
                    .order('nama'); // Initial sort by name

                if (dosenError) {
                    console.error('Error fetching dosen:', dosenError);
                    setError('Gagal memuat data dosen');
                    setLoading(false);
                    return;
                }

                // Tambahan: Handle jika dosenData null meskipun tidak ada dosenError
                if (!dosenData) {
                    console.error('Dosen data is null but no specific error from Supabase.');
                    setError('Data dosen tidak ditemukan atau format tidak sesuai.');
                    setLoading(false);
                    return;
                }

                // Fetch all structural positions
                const { data: jabatanData, error: jabatanError } = await supabase
                    .from('struktural_jabatan')
                    .select('id, title, dosen_id, category, order')
                    .not('dosen_id', 'is', null); // Only get positions assigned to a dosen

                if (jabatanError) {
                    console.error('Error fetching jabatan:', jabatanError);
                    console.warn('Could not fetch structural positions, proceeding without them:', jabatanError);
                    // Proceed even if fetching positions fails, but log a warning
                }

                // Create a map for quick lookup of positions by dosen_id
                const jabatanMap = new Map<string, JabatanStruktural>();
                jabatanData?.forEach((jabatan: JabatanStruktural) => {
                    // Prioritize positions with lower 'order' if a dosen has multiple positions
                    // This is a simplified approach; a more robust solution might be needed depending on data structure
                    const existingJabatan = jabatanMap.get(jabatan.dosen_id as string); // Ensure dosen_id is string for Map key
                    if (!existingJabatan || jabatan.order < existingJabatan.order) {
                        jabatanMap.set(jabatan.dosen_id, jabatan);
                    }
                });

                // Enhance dosen data with position information
                const enhancedDosenData: Dosen[] = dosenData.map(dosen => {
                    const jabatan = jabatanMap.get((dosen as FetchedDosen).id_dsn); // Cast to FetchedDosen to access id_dsn

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
                        jabatan_title: null, // Ensure these are null if no position
                        position_category: null,
                        position_order: null,
                        has_position: false
                    };
                });

                // --- START: Logic to prioritize a specific lecturer ---
                const targetLecturerName = "Ir. Irawan Rusnadi, M.T.";
                let prioritizedLecturer: Dosen | null = null;

                const filteredEnhancedDosenData = enhancedDosenData.filter(dosen => {
                    if (dosen.nama.trim() === targetLecturerName) {
                        prioritizedLecturer = dosen;
                        return false; // Remove from normal processing
                    }
                    return true;
                });
                // --- END: Logic to prioritize a specific lecturer ---

                // Organize data into two main lists: Dosen and Staff
                const allDosen: Dosen[] = [];
                const allStaff: Dosen[] = [];
                const pimpinanList: Dosen[] = [];
                const kpsList: Dosen[] = [];
                const laboratoriumList: Dosen[] = [];
                const potentialProfDrOrOtherDosenList: Dosen[] = [];

                // Use filteredEnhancedDosenData for categorization
                filteredEnhancedDosenData.forEach((dosen: Dosen) => {
                    const normalizedRole = dosen.role ? dosen.role.trim().toLowerCase() : null;

                    // 1. Handle Staff (non-'dosen' role)
                    if (normalizedRole !== 'dosen') {
                        if (dosen.role) {
                            allStaff.push(dosen);
                        } else {
                            console.warn(`Dosen '${dosen.nama}' (ID: ${dosen.id_dsn}) has no role specified.`);
                        }
                        return; // Stop processing this item, it's staff
                    }

                    // 2. Categorize Dosen based on specific structural positions
                    if (dosen.has_position) {
                        const category = dosen.position_category;

                        if (category === 'pimpinan') {
                            pimpinanList.push(dosen);
                            return; // Processed, move to next dosen
                        }
                        if (category === 'kps') {
                            kpsList.push(dosen);
                            return; // Processed
                        }
                        if (category === 'laboratorium') {
                            laboratoriumList.push(dosen);
                            return; // Processed
                        }
                        // If dosen.has_position is true, but category is not one of the above (or is null),
                        // they will fall through to be added to potentialProfDrOrOtherDosenList.
                    }
                    // If not returned by a specific structural category check (pimpinan, kps, lab),
                    // OR if dosen.has_position is false,
                    // add to the general pool for further sorting by academic title or as 'other'.
                    potentialProfDrOrOtherDosenList.push(dosen);
                }); // End of filteredEnhancedDosenData.forEach

                // Further categorize potentialProfDrOrOtherDosenList into Prof, Dr, and Other
                const profesorList: Dosen[] = [];
                const doktorList: Dosen[] = [];
                const otherDosenList: Dosen[] = [];

                potentialProfDrOrOtherDosenList.forEach(dosen => {
                    const namaLower = dosen.nama.toLowerCase();
                    if (/\bprof\./i.test(dosen.nama)) { // Check for "Prof." prefix
                        profesorList.push(dosen);
                    } else if (/\bdr\./i.test(dosen.nama)) { // Check for "Dr." prefix
                        doktorList.push(dosen);
                    } else {
                        otherDosenList.push(dosen);
                    }
                });

                // Sort all Dosen lists
                pimpinanList.sort((a, b) => (a.position_order ?? Infinity) - (b.position_order ?? Infinity) || a.nama.localeCompare(b.nama));
                kpsList.sort((a, b) => (a.position_order ?? Infinity) - (b.position_order ?? Infinity) || a.nama.localeCompare(b.nama));
                laboratoriumList.sort((a, b) => (a.position_order ?? Infinity) - (b.position_order ?? Infinity) || a.nama.localeCompare(b.nama));
                profesorList.sort((a, b) => a.nama.localeCompare(b.nama));
                doktorList.sort((a, b) => a.nama.localeCompare(b.nama));
                otherDosenList.sort((a, b) => a.nama.localeCompare(b.nama));

                // Combine sorted Dosen lists, adding the prioritized lecturer first
                if (prioritizedLecturer) {
                    allDosen.push(prioritizedLecturer);
                }

                allDosen.push(
                    // Add other categories after the prioritized one
                    ...pimpinanList,
                    ...kpsList,
                    ...laboratoriumList,
                    ...profesorList,
                    ...doktorList,
                    ...otherDosenList
                );

                // Sort Staff alphabetically by name
                allStaff.sort((a, b) => a.nama.localeCompare(b.nama));

                // Store the result
                setDosenData({ dosen: allDosen, staff: allStaff });

            } catch (err: any) {
                console.error('Unexpected error:', err);
                setError(`Terjadi kesalahan saat memuat data: ${err.message || err}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [supabase]); // Add supabase to dependency array

    // Generate a badge color based on position category or role
    const getBadgeColor = (dosen: Dosen): string => {
        if (dosen.has_position) {
            switch (dosen.position_category) {
                case 'pimpinan': return 'bg-red-100 text-red-800';
                case 'kps': return 'bg-maroon-100 text-maroon-800';
                case 'laboratorium': return 'bg-blue-100 text-blue-800';
                default: return 'bg-gray-100 text-gray-800'; // Should not happen if has_position is true and category is expected
            }
        }
        // Handle staff roles (normalized role is NOT 'dosen')
        const normalizedRole = dosen.role ? dosen.role.trim().toLowerCase() : null;
        if (normalizedRole !== 'dosen' && dosen.role) { // Check original role exists before coloring
            return 'bg-green-100 text-green-800'; // Color for staff
        }
        return 'bg-gray-100 text-gray-800'; // Default for regular dosen without specific position or staff role
    };

    // Get the display title for the badge
    // const getBadgeTitle = (dosen: Dosen): string | null => {
    //     if (dosen.has_position && dosen.jabatan_title) {
    //         return dosen.jabatan_title;
    //     }
    //     const normalizedRole = dosen.role ? dosen.role.trim().toLowerCase() : null;
    //     // Display the original role for staff if it's not 'dosen'
    //     if (normalizedRole !== 'dosen' && dosen.role) {
    //         return dosen.role; // Display the original role for staff
    //     }
    //     // For regular dosen without a specific structural title, maybe display "Dosen"?
    //     // Or leave null if no specific title is preferred. Let's leave null for now.
    //     return null;
    // };


    // Card style for dosen - ALL CARDS WILL HAVE MAROON BORDER
    const getCardStyle = (): string => { // Removed dosen parameter as style is uniform
        return 'bg-white border-2 border-maroon-500'; // Uniform maroon border for all cards
    };

    // Render a dosen card
    const renderDosenCard = (dosen: Dosen) => (

        <div
            key={dosen.id_dsn}
            className={`${getCardStyle()} rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center`}
        >
            <div className="w-48 aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 mb-3 relative"> {/* w-44 diubah menjadi w-48 */}
                {dosen.foto ? (
                    <img
                        src={dosen.foto}
                        alt={dosen.nama}
                        className="object-cover w-full h-full"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-maroon-400">
                        {/* Render initial if no photo */}
                        {dosen.nama ? dosen.nama.charAt(0).toUpperCase() : '?'}
                    </div>
                )}
            </div>
            <div className="text-center flex-grow flex flex-col items-center justify-start space-y-1 w-full"> {/* Use flex-grow to push footer down slightly */}
                <h3 className="text-base font-semibold text-maroon-800">{dosen.nama}</h3> {/* text-lg diubah menjadi text-base */}
                {(dosen.role && dosen.role.trim().toLowerCase() !== 'dosen') ? (
                    <>
                        <p className="text-sm text-gray-600 mt-1">NIP: {dosen.nip || '-'}</p>
                        {dosen.role && <p className="text-sm text-gray-600">{dosen.role}</p>}
                    </>
                ) : (
                    <>
                        <p className="text-sm text-gray-600 mt-1">NIP: {dosen.nip || '-'}</p>
                        <p className="text-sm text-gray-600">NUPTK: {dosen.nuptk || '-'}</p>
                    </>
                )}
                {/* Email and Prodi are hidden as requested */}
                {/* {dosen.email && <p className="text-sm text-gray-600 truncate max-w-full">{dosen.email}</p>} */}
                {/* {(dosen.role ? dosen.role.trim().toLowerCase() : null) === 'dosen' && dosen.prodi && <p className="text-sm text-gray-600">Prodi: {dosen.prodi}</p>} */}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700 mx-auto mb-4"></div>
                    <p className="text-xl text-maroon-700">Memuat data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-maroon-50 text-maroon-700">
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <p className="text-xl font-semibold mb-2">Error</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Check if there is any data to display
    const hasData = dosenData.dosen.length > 0 || dosenData.staff.length > 0;

    if (!hasData) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 text-gray-700">
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <p className="text-xl font-semibold mb-2">Data Tidak Tersedia</p>
                    <p>Tidak ada data dosen atau staff yang ditemukan.</p>
                </div>
            </div>
        );
    }


    return (
        <main className="bg-gradient-to-b from-gray-50 to-maroon-50 min-h-screen py-8 px-4 md:px-10 font-sans">
            <section className="max-w-7xl mx-auto space-y-12"> {/* Increased space */}
                <header className="text-center mb-10"> {/* Increased margin bottom */}
                    <h1 className="text-4xl font-bold text-maroon-800 mb-3"> {/* Increased margin bottom */}
                        Dosen dan Staff
                    </h1>
                    <p className="text-lg text-gray-600">Jurusan Teknik Kimia</p>
                </header>

                {/* Dosen Section (Includes structural and regular Dosen) */}
                {dosenData.dosen.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold border-red-800 pb-3 border-b-2"> {/* Increased padding/border */}
                            Dosen
                        </h2>
                        {/* Flex container to center the grid */}
                        <div className="flex justify-center">
                            {/* Mengubah lg:grid-cols-4 menjadi lg:grid-cols-5 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 w-fit"> {/* Gap disesuaikan menjadi gap-6 */}
                                {dosenData.dosen.map(renderDosenCard)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff Tenaga Pendidik Section */}
                {dosenData.staff.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold border-red-800 pb-3 border-b-2">
                            Tenaga Kependidikan
                        </h2>
                        {/* Flex container to center the grid */}
                        <div className="flex justify-center">
                            {/* Pastikan bagian staff juga menggunakan lg:grid-cols-5 jika belum */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 w-fit"> {/* Gap disesuaikan menjadi gap-6 */}
                                {dosenData.staff.map(renderDosenCard)}
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
};

export default DaftarDosen;