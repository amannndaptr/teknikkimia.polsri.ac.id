'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { FaUserCircle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

interface DropdownState {
    profil: boolean;
    prodi: boolean;
    lab: boolean;
    info: boolean;
    direktori: boolean;
}

type DropdownKey = keyof DropdownState;

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
    const [dropdownOpen, setDropdownOpen] = useState<DropdownState>({
        profil: false,
        prodi: false,
        lab: false,
        info: false,
        direktori: false,
    });
    const [scrolled, setScrolled] = useState<boolean>(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Create refs for each dropdown
    const dropdownRefs = {
        profil: useRef<HTMLDivElement>(null),
        prodi: useRef<HTMLDivElement>(null),
        lab: useRef<HTMLDivElement>(null),
        info: useRef<HTMLDivElement>(null),
        direktori: useRef<HTMLDivElement>(null),
    };

    // Refs for mobile menu elements
    const mobileMenuButtonRef = useRef<HTMLDivElement>(null);
    const mobileMenuContainerRef = useRef<HTMLDivElement>(null);

    const openDropdown = (menu: DropdownKey) => {
        setDropdownOpen({
            profil: false,
            prodi: false,
            lab: false,
            info: false,
            direktori: false,
            [menu]: true,
        });
    };

    // Function to toggle mobile accordion sections (only one open, click again to close)
    const toggleMobileAccordionSection = (menu: DropdownKey) => {
        setDropdownOpen(prev => {
            const isCurrentlyOpen = prev[menu];
            // Reset all to false
            const newState: DropdownState = {
                profil: false,
                prodi: false,
                lab: false,
                info: false,
                direktori: false,
            };
            // If it wasn't open, open it. Otherwise, it remains closed (toggled off).
            if (!isCurrentlyOpen) {
                newState[menu] = true;
            }
            return newState;
        });
    };

    const closeDropdown = (menu: DropdownKey) => {
        // Optional: Add a small delay before closing to allow mouse to move to dropdown content
        // setTimeout(() => {
            setDropdownOpen(prev => ({
                ...prev,
                [menu]: false,
            }));
        // }, 100); 
    };

    const closeAllDropdowns = () => {
        setDropdownOpen({
                profil: false,
                prodi: false,
                lab: false,
                info: false,
                direktori: false,
        });
    }

    // Handle outside clicks
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            // If mobile menu is open
            if (mobileMenuOpen) {
                // Check if the click is outside the mobile menu button AND outside the mobile menu container
                if (
                    mobileMenuButtonRef.current && !mobileMenuButtonRef.current.contains(target) &&
                    mobileMenuContainerRef.current && !mobileMenuContainerRef.current.contains(target)
                ) {
                    setMobileMenuOpen(false); // Close the entire mobile menu
                    // No need to call closeAllDropdowns() here as sub-sections are inside mobileMenuContainerRef
                }
                // Do NOT proceed to desktop dropdown closing logic if mobile menu is open
                return;
            }

            // Desktop dropdown closing logic (only runs if mobile menu is NOT open)
            Object.keys(dropdownRefs).forEach((menu) => {
                const key = menu as DropdownKey;
                const currentDropdownElement = dropdownRefs[key].current; // Simpan ke variabel

                if (
                    dropdownOpen[key] &&
                    currentDropdownElement && // Periksa apakah elemen ada
                    !currentDropdownElement.contains(target as Node) // Sekarang gunakan langsung, tanpa optional chaining
                ) {
                    closeDropdown(key); // This will close the desktop dropdown
                }
            });
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [mobileMenuOpen, dropdownOpen]); // Add mobileMenuOpen to dependencies
    // dropdownRefs are stable, so not strictly needed in deps array if initialized once.

    const dropdownVariants = {
        hidden: { opacity: 0, y: -5, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.2 }
        },
        exit: {
            opacity: 0,
            y: -5,
            scale: 0.95,
            transition: { duration: 0.1 }
        }
    };

    return (
        <header className={`w-full transition-all duration-300 ${scrolled ? 'bg-opacity-95 backdrop-blur-md shadow-lg' : ''} shadow-lg sticky top-0 z-50`}>
            {/* Top Navbar */}
            <div
                className={`bg-gradient-to-r from-maroon-800 to-maroon-700 flex justify-between items-center px-8 py-4 transition-all duration-300 ${scrolled ? 'py-3' : ''}`}
                style={{ backgroundColor: '#5D0000', backgroundImage: 'linear-gradient(to right, #5D0000, #800000)' }}
            >
                {/* Mobile Menu Button */}
                <div
                    ref={mobileMenuButtonRef}
                    className="text-white text-2xl cursor-pointer md:hidden transition-transform duration-300 hover:scale-110"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? (
                        <motion.div
                            initial={{ rotate: 0 }}
                            animate={{ rotate: 90 }}
                            transition={{ duration: 0.3 }}
                        >
                            ✕
                        </motion.div>
                    ) : (
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            ☰
                        </motion.div>
                    )}
                </div>

                {/* Department Name */}
                <div className="hidden md:block font-bold text-white text-lg tracking-wide">
                    <motion.div
                        whileHover={{ scale: 1.05, color: "#FFD700" }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="cursor-pointer"
                    >
                        TEKNIK KIMIA
                    </motion.div>
                </div>

                {/* Profile Button */}
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Link
                        href="/sign-in"
                        className="text-white text-2xl focus:outline-none hover:text-yellow-300 transition-colors duration-300"
                    >
                        <FaUserCircle />
                    </Link>
                </motion.div>
            </div>

            {/* Centered Logo */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="relative p-3 transition-transform duration-300 hover:scale-105">
                    <div className="relative">
                        <Image
                            src="/logopolsri.png"
                            alt="Logo POLSRI"
                            width={120}
                            height={120}
                            className="rounded-full"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Navbar */}
            <nav
                className={`text-white py-5 transition-all duration-300 ${scrolled ? 'py-3' : ''}`}
                style={{ backgroundColor: '#400000', backgroundImage: 'linear-gradient(to right, #400000, #600000)' }}
            >
                <div className="container mx-auto flex justify-between items-center px-10">
                    {/* Mobile Menu */}
                    <AnimatePresence>
                        {mobileMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                ref={mobileMenuContainerRef}
                                className="absolute top-full left-0 right-0 bg-maroon-800 shadow-lg z-20" // Ditambahkan z-20
                                style={{ backgroundColor: '#400000' }}
                            >
                                <div className="flex flex-col p-4 space-y-4">
                                    <Link href="/" onClick={() => setMobileMenuOpen(false)} className="font-bold text-white hover:text-yellow-300 transition-colors duration-300 py-2">
                                        HOME
                                    </Link>

                                    <div className="border-t border-gray-700 pt-2">
                                        <div
                                            onClick={() => toggleMobileAccordionSection("profil")}
                                            className="font-bold flex items-center justify-between text-white hover:text-yellow-300 cursor-pointer"
                                        >
                                            <span>PROFIL</span>
                                            <span>{dropdownOpen.profil ? '−' : '+'}</span>
                                        </div>
                                        {dropdownOpen.profil && (
                                            <div className="pl-4 mt-2 space-y-2">
                                                <Link href="/profil/sejarah" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Sejarah
                                                </Link>
                                                <Link href="/profil/visi_misi" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Visi dan Misi
                                                </Link>
                                                <Link href="/profil/struktur_organisasi" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Struktur Organisasi
                                                </Link>
                                                <Link href="/profil/dosen_staff" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Dosen dan Tendik
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Program Studi */}
                                    <div className="border-t border-gray-700 pt-2">
                                        <div
                                            onClick={() => toggleMobileAccordionSection("prodi")}
                                            className="font-bold flex items-center justify-between text-white hover:text-yellow-300 cursor-pointer"
                                        >
                                            <span>PROGRAM STUDI</span>
                                            <span>{dropdownOpen.prodi ? '−' : '+'}</span>
                                        </div>
                                        {dropdownOpen.prodi && (
                                            <div className="pl-4 mt-2 space-y-2">
                                                <Link href="/prodi/d3-teknik-kimia" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    D3 Teknik Kimia
                                                </Link>
                                                <Link href="/prodi/d4-teknik-energi" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    D4 Teknik Energi
                                                </Link>
                                                <Link href="/prodi/d4-teknologi-kimia-industri" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    D4 Teknologi Kimia Industri
                                                </Link>
                                                <Link href="/prodi/s2-energi-terbarukan" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    S2 Energi Terbarukan
                                                </Link>
                                                <Link href="/prodi/d3-teknik-kimia-psdkusiak" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    D3 Teknik Kimia PSDKU Siak
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Laboratorium */}
                                    <div className="border-t border-gray-700 pt-2">
                                        <div
                                            onClick={() => toggleMobileAccordionSection("lab")}
                                            className="font-bold flex items-center justify-between text-white hover:text-yellow-300 cursor-pointer"
                                        >
                                            <span>LABORATORIUM</span>
                                            <span>{dropdownOpen.lab ? '−' : '+'}</span>
                                        </div>
                                        {dropdownOpen.lab && (
                                            <div className="pl-4 mt-2 space-y-2">
                                                <Link href="/laboratorium/lab-analisis" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Laboratorium Analisis
                                                </Link>
                                                <Link href="/laboratorium/lab-rekayasa" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Laboratorium Rekayasa
                                                </Link>
                                                <Link href="/laboratorium/lab-miniplant" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Laboratorium Mini Plant
                                                </Link>
                                                <Link href="/laboratorium/lab-energi" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Laboratorium Energi
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Information */}
                                    <div className="border-t border-gray-700 pt-2">
                                        <div
                                            onClick={() => toggleMobileAccordionSection("info")}
                                            className="font-bold flex items-center justify-between text-white hover:text-yellow-300 cursor-pointer"
                                        >
                                            <span>INFORMASI</span>
                                            <span>{dropdownOpen.info ? '−' : '+'}</span>
                                        </div>
                                        {dropdownOpen.info && (
                                            <div className="pl-4 mt-2 space-y-2">
                                                <Link href="/info/kalender" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Kalender Akademik
                                                </Link>
                                                <Link href="/info/beasiswa" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Beasiswa
                                                </Link>
                                                <Link href="/info/berita/" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Berita
                                                </Link>
                                                <Link href="/info/kegiatan" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    Kegiatan
                                                </Link>
                                                <Link href="https://jcdc.polsri.ac.id/" onClick={() => setMobileMenuOpen(false)} target="_blank" rel="noopener noreferrer" className="block text-gray-300 hover:text-yellow-300">
                                                    Lowongan Kerja
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Direktori */}
                                    <div className="border-t border-gray-700 pt-2">
                                        <div
                                            onClick={() => toggleMobileAccordionSection("direktori")}
                                            className="font-bold flex items-center justify-between text-white hover:text-yellow-300 cursor-pointer"
                                        >
                                            <span>DIREKTORI</span>
                                            <span>{dropdownOpen.direktori ? '−' : '+'}</span>
                                        </div>
                                        {dropdownOpen.direktori && (
                                            <div className="pl-4 mt-2 space-y-2">
                                                <Link href="/direktori/ebook" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-yellow-300">
                                                    E Book Teknik Kimia
                                                </Link>
                                                <Link href="https://sisak1.polsri.ac.id/" onClick={() => setMobileMenuOpen(false)} target="_blank" rel="noopener noreferrer" className="block text-gray-300 hover:text-yellow-300">
                                                    E Learning
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Left Navigation Links */}
                    <div className="hidden md:flex space-x-20 items-center ml-8">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Link
                                href="/"
                                className="font-bold text-white hover:text-yellow-300 transition-colors duration-300"
                            >
                                HOME
                            </Link>
                        </motion.div>

                        {/* Dropdown Profil */}
                        <div 
                            className="relative" 
                            ref={dropdownRefs.profil}
                            onMouseLeave={() => closeDropdown("profil")}
                        >
                            <motion.button
                                onMouseEnter={() => openDropdown("profil")}
                                className="font-bold flex items-center text-white hover:text-yellow-300 transition-colors duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                PROFIL
                                <motion.span
                                    className="ml-1"
                                    animate={{ rotate: dropdownOpen.profil ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    ▼
                                </motion.span>
                            </motion.button>
                            <AnimatePresence>
                                {dropdownOpen.profil && (
                                    <motion.div
                                        variants={dropdownVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        onMouseEnter={() => openDropdown("profil")} // Keep open if mouse enters dropdown
                                        className="absolute left-0 mt-2 w-56 bg-white text-gray-800 shadow-lg rounded-lg overflow-hidden z-20"
                                    >
                                        <Link href="/profil/sejarah" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Sejarah
                                        </Link>
                                        <Link href="/profil/visi_misi" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Visi dan Misi
                                        </Link>
                                        <Link href="/profil/struktur_organisasi" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Struktur Organisasi
                                        </Link>
                                        <Link href="/profil/dosen_staff" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Dosen dan Tendik
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Dropdown Program Studi */}
                        <div 
                            className="relative" 
                            ref={dropdownRefs.prodi}
                            onMouseLeave={() => closeDropdown("prodi")}
                        >
                            <motion.button
                                onMouseEnter={() => openDropdown("prodi")}
                                className="font-bold flex items-center text-white hover:text-yellow-300 transition-colors duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                PROGRAM STUDI
                                <motion.span
                                    className="ml-1"
                                    animate={{ rotate: dropdownOpen.prodi ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    ▼
                                </motion.span>
                            </motion.button>
                            <AnimatePresence>
                                {dropdownOpen.prodi && (
                                    <motion.div
                                        variants={dropdownVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        onMouseEnter={() => openDropdown("prodi")}
                                        className="absolute left-0 mt-2 w-64 bg-white text-gray-800 shadow-lg rounded-lg overflow-hidden z-20"
                                    >
                                        <Link href="/prodi/d3-teknik-kimia" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            D3 Teknik Kimia
                                        </Link>
                                        <Link href="/prodi/d4-teknik-energi" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            D4 Teknik Energi
                                        </Link>
                                        <Link href="/prodi/d4-teknologi-kimia-industri" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            D4 Teknologi Kimia Industri
                                        </Link>
                                        <Link href="/prodi/s2-energi-terbarukan" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            S2 Energi Terbarukan
                                        </Link>
                                        <Link href="/prodi/d3-teknik-kimia-psdkusiak" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            D3 Teknik Kimia PSDKU Siak
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Navigation Links */}
                    <div className="hidden md:flex space-x-16 items-center mr-8">
                        {/* Dropdown Laboratorium */}
                        <div 
                            className="relative" 
                            ref={dropdownRefs.lab}
                            onMouseLeave={() => closeDropdown("lab")}
                        >
                            <motion.button
                                onMouseEnter={() => openDropdown("lab")}
                                className="font-bold flex items-center text-white hover:text-yellow-300 transition-colors duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                LABORATORIUM
                                <motion.span
                                    className="ml-1"
                                    animate={{ rotate: dropdownOpen.lab ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    ▼
                                </motion.span>
                            </motion.button>
                            <AnimatePresence>
                                {dropdownOpen.lab && (
                                    <motion.div
                                        variants={dropdownVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        onMouseEnter={() => openDropdown("lab")}
                                        className="absolute left-0 mt-2 w-64 bg-white text-gray-800 shadow-lg rounded-lg overflow-hidden z-20"
                                    >
                                        <Link href="/laboratorium/lab-analisis" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Laboratorium Analisis
                                        </Link>
                                        <Link href="/laboratorium/lab-rekayasa" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Laboratorium Rekayasa
                                        </Link>
                                        <Link href="/laboratorium/lab-energi" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Laboratorium Energi
                                        </Link>
                                        <Link href="/laboratorium/lab-miniplant" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Laboratorium Mini Plant
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Dropdown Informasi */}
                        <div 
                            className="relative" 
                            ref={dropdownRefs.info}
                            onMouseLeave={() => closeDropdown("info")}
                        >
                            <motion.button
                                onMouseEnter={() => openDropdown("info")}
                                className="font-bold flex items-center text-white hover:text-yellow-300 transition-colors duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                INFORMASI
                                <motion.span
                                    className="ml-1"
                                    animate={{ rotate: dropdownOpen.info ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    ▼
                                </motion.span>
                            </motion.button>
                            <AnimatePresence>
                                {dropdownOpen.info && (
                                    <motion.div
                                        variants={dropdownVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        onMouseEnter={() => openDropdown("info")}
                                        className="absolute left-0 mt-2 w-56 bg-white text-gray-800 shadow-lg rounded-lg overflow-hidden z-20"
                                    >
                                        <Link href="/info/beasiswa" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Beasiswa
                                        </Link>
                                        <Link href="/info/berita/" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Berita
                                        </Link>
                                        <Link href="/info/kalender" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Kalender Akademik
                                        </Link>
                                        <Link href="/info/kegiatan" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Kegiatan
                                        </Link>
                                        <Link href="https://jcdc.polsri.ac.id/" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Lowongan Kerja
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Dropdown Direktori */}
                        <div 
                            className="relative" 
                            ref={dropdownRefs.direktori}
                            onMouseLeave={() => closeDropdown("direktori")}
                        >
                            <motion.button
                                onMouseEnter={() => openDropdown("direktori")}
                                className="font-bold flex items-center text-white hover:text-yellow-300 transition-colors duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                DIREKTORI
                                <motion.span
                                    className="ml-1"
                                    animate={{ rotate: dropdownOpen.direktori ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    ▼
                                </motion.span>
                            </motion.button>
                            <AnimatePresence>
                                {dropdownOpen.direktori && (
                                    <motion.div
                                        variants={dropdownVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        onMouseEnter={() => openDropdown("direktori")}
                                        className="absolute left-0 mt-2 w-56 bg-white text-gray-800 shadow-lg rounded-lg overflow-hidden z-20"
                                    >
                                        <Link href="https://sisak1.polsri.ac.id/" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            E Learning
                                        </Link>
                                        <Link href="/direktori/ebook" className="block px-4 py-2 hover:bg-gray-100 hover:text-maroon-700 transition-colors duration-200">
                                            Penelitian/Pengabdian
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
}