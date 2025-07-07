// signUpForm.tsx

'use client'

import { useState, useEffect } from "react";
import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Map for prodi codes that have a single, unambiguous program studi for auto-selection.
const autoSelectProdiMap: Record<string, string> = {
    "3040": "D3 Teknik Kimia",             // Updated: 3040 now maps directly
    "3046": "D3 Teknik Kimia PSDKU SIAK",  // Added: New mapping for PSDKU Siak
    "4041": "D4 Teknik Energi",
    "4042": "D4 Teknologi Kimia Industri",
    // Contoh penambahan untuk kode D3 lain (selain 3040 yang ditangani khusus)
    // "3041": "D3 Teknik Mesin", // Ganti dengan Prodi yang sesuai jika ada
    // Add other mappings if NIM can contain other prodi codes that need auto-selection
};

// Map for Kelas options based on Prodi
const kelasProdiMap: Record<string, string[]> = {
    "D3 Teknik Kimia": ["KA", "KB", "KC", "KD", "KM"],
    "D4 Teknik Energi": ["EGA", "EGB", "EGC", "EGD", "EGM", "EGN"],
    "D4 Teknologi Kimia Industri": ["KIA", "KIB", "KIC", "KID", "KIM","KIN"],
    "D3 Teknik Kimia PSDKU SIAK": ["KS"],
    // S2 Energi Terbarukan will use a text input for kelas
};

export function SignupForm({ searchParams }: { searchParams: Message }) {
    const [nim, setNim] = useState("");
    const [angkatan, setAngkatan] = useState("");
    const [prodi, setProdi] = useState(""); // State for Program Studi, initial empty for placeholder
    const [kelas, setKelas] = useState(""); // State for Kelas
    const [kelasOptions, setKelasOptions] = useState<string[]>([]); // State for dynamic kelas options
    const [jabatanKelas, setJabatanKelas] = useState(""); // State for Jabatan Kelas
    const [nimError, setNimError] = useState(""); // State for NIM validation errors
    const [masaStudiError, setMasaStudiError] = useState(""); // State for Masa Studi validation errors

    // Effect 1: Parse NIM to derive Angkatan, determine Prodi, and set errors.
    useEffect(() => {
        let newAngkatan = "";
        let derivedProdi = "";
        let newNimError = "";

        // 1. Attempt to derive Angkatan from the first 4 valid digits of NIM (06YY)
        if (nim.length >= 4 && nim.startsWith("06")) {
            const yearCode = nim.substring(2, 4);
            if (/^\d{2}$/.test(yearCode)) { // Check if YY are two digits
                newAngkatan = `20${yearCode}`;
            }
        }
        
        if (nim) {
            // 2. Full NIM validation (12 digits) for Prodi and final Angkatan
            if (nim.length === 12) {
                const flexibleNimPattern = /^06(\d{2})(\d{4})\d{4}$/;
                const match = nim.match(flexibleNimPattern);

                if (match) {
                    const yearCodeFromFullNim = match[1];
                    const prodiCodeFromNim = match[2];
                    newAngkatan = `20${yearCodeFromFullNim}`;

                    if (autoSelectProdiMap[prodiCodeFromNim]) {
                        derivedProdi = autoSelectProdiMap[prodiCodeFromNim];
                        newNimError = "";
                    } else {
                        derivedProdi = ""; // Clear prodi if code not recognized
                        newNimError = "NIM yang Anda masukkan tidak valid.";
                    }
                } else {
                    newAngkatan = ""; // Invalid full NIM format, clear angkatan derived from first 4 digits
                    derivedProdi = ""; // Clear prodi on invalid NIM format
                    newNimError = "Format NIM tidak valid.";
                }
            } else { // NIM is not empty and not 12 digits long
                // newAngkatan (if derived from first 4 digits) is kept.
                derivedProdi = ""; // Clear prodi as NIM is incomplete
                if (nim.length > 0) { // Only show length error if NIM is not empty
                    newNimError = "NIM yang Anda masukkan tidak valid.";
                }
            }
        } else {
            // NIM is empty
            newAngkatan = "";
            derivedProdi = "";
            newNimError = "";
        }

        setAngkatan(newAngkatan);
        setProdi(derivedProdi); // Set prodi directly
        setNimError(newNimError);
    }, [nim]);

    // Effect 3: Update kelas options and reset kelas when prodi or angkatan changes.
    useEffect(() => {
        if (prodi && angkatan && prodi !== "S2 Energi Terbarukan" && kelasProdiMap[prodi]) {
            const baseKelasOptions = kelasProdiMap[prodi];
            const angkatanSuffix = angkatan.slice(-2); // Mengambil "22" dari "2022"
            const angkatanSpecificKelasOptions = baseKelasOptions.map(kOpt => `${kOpt}-${angkatanSuffix}`);
            setKelasOptions(angkatanSpecificKelasOptions);
        } else if (prodi === "S2 Energi Terbarukan") { // S2 handles kelas as text input, no options needed
            setKelasOptions([]);
        } else {
            setKelasOptions([]); // Clear options if prodi is not S2, or prodi/angkatan is missing, or prodi not in map
        }
        setKelas(""); // Reset selected kelas whenever prodi or angkatan changes
    }, [prodi, angkatan]); // Add angkatan to dependency array

    // Effect 4: Validate Masa Studi based on Angkatan and Prodi
    useEffect(() => {
        if (!angkatan || !prodi) {
            setMasaStudiError("");
            return;
        }
        const tahunAngkatan = parseInt(angkatan, 10);
        const tahunSekarang = new Date().getFullYear();
        if (prodi.startsWith("D3")) {
            if (tahunSekarang - tahunAngkatan >= 3) {
                setMasaStudiError("Hanya mahasiswa aktif yang bisa mendaftar. Masa studi D3 sudah lebih dari 3 tahun.");
            } else {
                setMasaStudiError("");
            }
        } else if (prodi.startsWith("D4")) {
            if (tahunSekarang - tahunAngkatan >= 4) {
                setMasaStudiError("Maaf, hanya mahasiswa aktif yang bisa mendaftar.");
            } else {
                setMasaStudiError("");
            }
        } else {
            setMasaStudiError("");
        }
    }, [angkatan, prodi]);

    return (
        <form className="space-y-5" encType="multipart/form-data">
            {/* Form fields same as before */}
            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                    name="email"
                    placeholder="email@gmail.com"
                    required
                    className="w-full bg-background border-input focus:border-primary focus:ring-primary transition-all"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                    type="password"
                    name="password"
                    placeholder="password"
                    minLength={6}
                    required
                    className="w-full bg-background border-input focus:border-primary focus:ring-primary transition-all"
                />
            </div>

            <div className="pt-3 border-t border-border">
                <h2 className="text-lg font-medium text-secondary mb-4">Informasi Mahasiswa</h2>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        {/* NIM Label - description removed for cleaner UI, behavior is now more dynamic */}
                        <Label htmlFor="nim" className="text-sm font-medium">NIM</Label>
                        <Input
                            name="nim"
                            placeholder="masukkan NIM"
                            required
                            value={nim}
                            onChange={(e) => setNim(e.target.value)}
                            maxLength={12}
                            className={`w-full bg-background border-input focus:border-primary focus:ring-primary transition-all ${nimError ? 'border-destructive' : ''}`}
                        />
                        {nimError && <p className="text-destructive text-xs mt-1">{nimError}</p>}
                        {masaStudiError && (
                          <p className="text-destructive text-xs mt-1 font-semibold">{masaStudiError}</p>
                        )}
                    </div>

                    {/* Angkatan Display - Moved and Restyled */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Angkatan</Label>
                        {angkatan && !nimError ? (
                            <p className="w-full bg-muted border border-input rounded-md p-2.5 text-sm text-muted-foreground">
                                {angkatan}
                            </p>
                        ) : (
                            <p className="w-full bg-muted border border-input rounded-md p-2.5 text-sm text-muted-foreground italic">
                                angkatan akan terisi otomatis
                            </p>
                        )}
                    </div>

                    <div className="space-y-2"> {/* Full Name field remains here */}
                        <Label htmlFor="nama" className="text-sm font-medium">Nama Lengkap</Label>
                        <Input
                            name="nama"
                            placeholder="nama lengkap Anda"
                            required
                            className="w-full bg-background border-input focus:border-primary focus:ring-primary transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2 mt-4">
                    <Label htmlFor="prodi-display" className="text-sm font-medium">Program Studi</Label>
                    {prodi ? ( // Prodi is auto-determined
                        <>
                            <p id="prodi-display" className="w-full bg-muted border border-input rounded-md p-2.5 text-sm text-muted-foreground">
                                {prodi}
                            </p>
                            <input type="hidden" name="prodi" value={prodi} />
                        </>
                    ) : (
                        <>
                            <p id="prodi-display" className="w-full bg-muted border border-input rounded-md p-2.5 text-sm text-muted-foreground italic">
                                prodi akan terisi otomatis
                            </p>
                            <input type="hidden" name="prodi" value="" />
                        </>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="kelas" className="text-sm font-medium">Kelas</Label>
                        {prodi === "S2 Energi Terbarukan" ? (
                            <Input
                                name="kelas"
                                value={kelas}
                                onChange={(e) => setKelas(e.target.value)}
                                placeholder="Masukkan Kelas (jika ada)"
                                className="w-full bg-background border-input focus:border-primary focus:ring-primary transition-all"
                            />
                        ) : (
                            <select
                                name="kelas"
                                value={kelas}
                                onChange={(e) => setKelas(e.target.value)}
                                className="w-full bg-background border border-input rounded-md p-2 focus:border-primary focus:ring-primary transition-all"
                                required={!!prodi && prodi !== "S2 Energi Terbarukan"} // Kelas is required if prodi is determined and not S2
                            >
                                <option value="">Pilih Kelas</option>
                                {kelasOptions.map(kOpt => (
                                    <option key={kOpt} value={kOpt}>{kOpt}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="jabatan_kelas" className="text-sm font-medium">Jabatan Kelas</Label>
                        <select
                            name="jabatan_kelas"
                            value={jabatanKelas}
                            onChange={(e) => setJabatanKelas(e.target.value)}
                            className="w-full bg-background border border-input rounded-md p-2 focus:border-primary focus:ring-primary transition-all"
                            required // Jabatan kelas sekarang wajib diisi
                        >
                            <option value="">Pilih Jabatan</option>
                            <option value="Anggota Kelas">Anggota Kelas</option>
                            <option value="Sekretaris">Sekretaris</option>
                        </select>
                    </div>
                </div>

                {/* Hidden angkatan field that will be auto-filled from NIM */}
                <input
                    type="hidden"
                    name="angkatan"
                    value={angkatan}
                />

                {/* Old Angkatan display removed from here */}
                 {/* <div className="space-y-2 mt-4">
                    <Label htmlFor="foto_profil" className="text-sm font-medium">Profile Photo</Label>
                    <div className="bg-background border border-input rounded-md p-3 flex items-center justify-center cursor-pointer hover:border-primary transition-all">
                        <input
                            type="file"
                            name="foto_profil"
                            accept="image/*"
                            className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                    </div>
                </div> */}
            </div>

            <div className="mt-6">
                <SubmitButton
                    formAction={signUpAction}
                    pendingText="Signing up..."
                    disabled={Boolean(
                        !!nimError ||
                        !nim ||
                        !prodi ||
                        (prodi && prodi !== "S2 Energi Terbarukan" && !kelas) ||
                        !jabatanKelas ||
                        !!masaStudiError // Tidak bisa daftar jika masa studi lewat batas
                    )}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-md transition-all"
                >
                    Buat Akun
                </SubmitButton>
            </div>

            <FormMessage message={searchParams} />
        </form>
    );
}