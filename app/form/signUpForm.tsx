// signUpForm.tsx

'use client'

import { useState, useEffect } from "react";
import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Map for prodi codes that have a single, unambiguous program studi for auto-selection.
// "3040" is handled separately as it's ambiguous.
const autoSelectProdiMap: Record<string, string> = {
    "4041": "D4 Teknik Energi",
    "4042": "D4 Teknologi Kimia Industri",
    // Contoh penambahan untuk kode D3 lain (selain 3040 yang ditangani khusus)
    // "3041": "D3 Teknik Mesin", // Ganti dengan Prodi yang sesuai jika ada
    // Add other mappings if NIM can contain other prodi codes that need auto-selection
};

// Options for the "3040" NIM code, requiring user selection.
const nim3040ProdiOptions = ["D3 Teknik Kimia", "D3 Teknik Kimia PSDKU Siak"];

// Map for Kelas options based on Prodi
const kelasProdiMap: Record<string, string[]> = {
    "D3 Teknik Kimia": ["KA", "KB", "KC", "KD", "KM"],
    "D3 Teknik Kimia PSDKU Siak": ["KS"],
    "D4 Teknik Energi": ["EGA", "EGB", "EGC", "EGD", "EGM", "EGN"],
    "D4 Teknologi Kimia Industri": ["KIA", "KIB", "KIC", "KID", "KIM","KIN"],
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
    const [isNim3040CaseActive, setIsNim3040CaseActive] = useState(false); // True if NIM code is 3040, requiring prodi selection
    const [autoProdiFromNim, setAutoProdiFromNim] = useState(""); // Stores prodi if automatically determined (non-3040)

    // Effect 1: Parse NIM to derive Angkatan, determine if it's a 3040 case,
    // or find an auto-selectable Prodi, and set errors.
    useEffect(() => {
        let newAngkatan = "";
        let derivedAutoProdi = ""; // Prodi if auto-selected (non-3040)
        let newNimError = "";
        let activate3040Mode = false;

        // 1. Attempt to derive Angkatan from the first 4 valid digits of NIM (06YY)
        if (nim.length >= 4 && nim.startsWith("06")) {
            const yearCode = nim.substring(2, 4);
            if (/^\d{2}$/.test(yearCode)) { // Check if YY are two digits
                newAngkatan = `20${yearCode}`;
            }
        }

        if (nim) {
            // 2. Full NIM validation (12 digits) for Prodi and final Angkatan confirmation
            if (nim.length === 12) {
                const flexibleNimPattern = /^06(\d{2})(\d{4})\d{4}$/;
                const match = nim.match(flexibleNimPattern);

                if (match) {
                    const yearCodeFromFullNim = match[1];
                    const prodiCodeFromNim = match[2];

                    // Confirm/override angkatan from full valid NIM
                    newAngkatan = `20${yearCodeFromFullNim}`;

                    if (prodiCodeFromNim === "3040") {
                        activate3040Mode = true;
                        // derivedAutoProdi remains "", user must select
                        newNimError = ""; // Clear error as NIM is valid and Prodi is found
                    } else if (autoSelectProdiMap[prodiCodeFromNim]) {
                        derivedAutoProdi = autoSelectProdiMap[prodiCodeFromNim];
                        // activate3040Mode remains false
                        newNimError = "";
                    } else {
                        // derivedAutoProdi remains ""
                        // activate3040Mode remains false
                        newNimError = "Program Studi tidak dapat ditentukan dari NIM (kode prodi tidak dikenali).";
                    }
                } else {
                    // derivedAutoProdi remains ""
                    newAngkatan = ""; // Invalid full NIM format, clear angkatan derived from first 4 digits
                    // activate3040Mode remains false
                    newNimError = "Format NIM tidak valid (contoh: 062230400001).";
                }
            } else { // NIM is not empty and not 12 digits long
                // derivedAutoProdi remains ""
                // activate3040Mode remains false
                // newAngkatan (if derived from first 4 digits) is kept.
                if (nim.length > 0) { // Only show length error if NIM is not empty
                    newNimError = "NIM yang Anda masukkan tidak valid.";
                }
            }
        } else {
            // NIM is empty, all derived values will be their initial empty/false state
        }

        setAngkatan(newAngkatan);
        setNimError(newNimError);
        setIsNim3040CaseActive(activate3040Mode);
        setAutoProdiFromNim(derivedAutoProdi);

    }, [nim]);

    // Effect 2: Set the actual `prodi` state based on whether it's a 3040 case or auto-selected.
    useEffect(() => {
        if (isNim3040CaseActive) {
            // If in 3040 mode, clear prodi to force user selection via dropdown.
            // The dropdown's onChange will then set the `prodi` state.
            setProdi("");
        } else {
            // Not in 3040 mode, so use the auto-derived prodi (could be empty if NIM invalid/unknown code).
            setProdi(autoProdiFromNim);
        }
    }, [isNim3040CaseActive, autoProdiFromNim]);

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
                                terisi otomatis dari NIM
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
                    <Label htmlFor="prodi-selector" className="text-sm font-medium">Program Studi</Label>
                    {isNim3040CaseActive ? (
                        <select
                            id="prodi-selector"
                            name="prodi" // This select will submit the prodi value
                            value={prodi} // Controlled component
                            onChange={(e) => setProdi(e.target.value)}
                            className="w-full bg-background border border-input rounded-md p-2 focus:border-primary focus:ring-primary transition-all"
                            required
                        >
                            <option value="">Pilih Program Studi Anda</option>
                            {nim3040ProdiOptions.map(pOpt => (
                                <option key={pOpt} value={pOpt}>{pOpt}</option>
                            ))}
                        </select>
                    ) : prodi ? ( // Prodi is auto-determined (and not 3040 case)
                        <>
                            <p className="w-full bg-muted border border-input rounded-md p-2.5 text-sm text-muted-foreground">
                                {prodi}
                            </p>
                            <input type="hidden" name="prodi" value={prodi} />
                        </>
                    ) : (
                        <>
                            <p className="w-full bg-muted border border-input rounded-md p-2.5 text-sm text-muted-foreground italic">
                                terisi otomatis
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
                        !!nimError || // Akan false jika NIM valid
                        !nim ||       // Akan false jika NIM diisi
                        !prodi ||     // Akan false setelah Anda memilih prodi dari dropdown "3040"
                        (prodi && prodi !== "S2 Energi Terbarukan" && !kelas) || // Akan false setelah Anda memilih kelas
                        !jabatanKelas // Akan false setelah Anda memilih jabatan kelas
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