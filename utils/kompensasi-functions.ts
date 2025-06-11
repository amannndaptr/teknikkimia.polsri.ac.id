// utils/kompensasi-functions.ts

import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export interface Student {
    id_mhs: string;
    nim: string;
    nama: string;
    kelas: string;
    prodi: string;
    jabatan_kelas?: string;
}

export interface RekapKehadiran {
    id: number;
    id_mhs: string;
    menit_tidak_hadir: number;
    kompensasi?: Kompensasi;
}

export interface Kompensasi {
    id: number;
    status: 'pending' | 'verified' | 'rejected';
    file_surat?: string;
    rejection_reason?: string;
    created_at?: string;
    updated_at?: string;
    id_dosen_pa?: string;
}

export interface KompenInfo {
    id: string;
    is_kompensasi_active: boolean;
    kompensasi_start_date: string | null;
    kompensasi_end_date: string | null;
    semester: string;
    tahun_ajaran: string;
    nomor_surat: string;
}

export interface DosenPA {
    id_dsn: string;
    nama: string;
}

export interface SavedStatus {
    [key: string]: { status: 'success' | 'error'; message: string } | null;
}

export interface RekapData {
    [key: string]: number;
}

export interface StatusMessage {
    status: 'idle' | 'success' | 'error';
    message: string;
}

// Check user and load data
export async function checkUserAndLoadData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { user: null, student: null, isSessionActive: false };
        }

        // Get student details
        const { data: student } = await supabase
            .from('mahasiswa')
            .select('*')
            .eq('id_mhs', user.id)
            .single();

        if (!student) {
            return { user: null, student: null, isSessionActive: false };
        }

        const isSecretary = student.jabatan_kelas === 'Sekretaris';

        // Check if compensation session is active and get session info
        const { data: settings } = await supabase
            .from('kompen_info')
            .select('*')
            .single();

        const isSessionActive = settings?.is_kompensasi_active || false;

        // Fetch dosen PA for this class
        const { data: dosenPAData } = await supabase
            .from('kompensasi')
            .select('id_dosen_pa')
            .eq('kelas', student.kelas)
            .maybeSingle();

        let dosenPA = null;
        if (dosenPAData?.id_dosen_pa) {
            // Get dosen details from id_dosen_pa
            const { data: dosenDetails } = await supabase
                .from('dosen')
                .select('id_dsn, nama')
                .eq('id_dsn', dosenPAData.id_dosen_pa)
                .single();

            dosenPA = dosenDetails;
        }

        // If secretary and session active, load classmates
        let classmates: Student[] = [];
        if (isSecretary && settings?.is_kompensasi_active) {
            const { data: classmatesData } = await supabase
                .from('mahasiswa')
                .select('*')
                .eq('kelas', student.kelas)
                .order('nama');

            classmates = classmatesData || [];
        }

        return {
            user,
            student,
            isSecretary,
            isSessionActive,
            kompenInfo: settings,
            dosenPA,
            classmates
        };
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Fetch existing attendance data for students
export async function fetchExistingData(studentIds: string[]) {
    try {
        const { data, error } = await supabase
            .from('rekap_kehadiran')
            .select('*, kompensasi(*)')
            .in('id_mhs', studentIds);

        if (error) throw error;

        if (data) {
            const dataMap: { [key: string]: RekapKehadiran } = {};
            const initialRekapData: RekapData = {};

            data.forEach(item => {
                dataMap[item.id_mhs] = item;
                initialRekapData[item.id_mhs] = item.menit_tidak_hadir;
            });

            return { dataMap, initialRekapData };
        }
        return { dataMap: {}, initialRekapData: {} };
    } catch (error) {
        console.error('Error fetching existing data:', error);
        throw error;
    }
}

// Fetch dosen PA for class
export async function fetchDosenPAForClass(kelas: string) {
    try {
        const { data: classAssignment } = await supabase
            .from('kompensasi')
            .select('id_dosen_pa')
            .eq('kelas', kelas)
            .maybeSingle();

        if (classAssignment?.id_dosen_pa) {
            return classAssignment.id_dosen_pa;
        }
        return null;
    } catch (error) {
        console.error('Error fetching dosen PA:', error);
        throw error;
    }
}

// Save attendance data for all students
export async function saveAllAttendance(classmates: Student[], rekapData: RekapData, existingData: { [key: string]: RekapKehadiran }, secretaryId: string, kelas: string) {
    try {
        const updates = [];
        const inserts = [];

        // Iterate through all students
        for (const student of classmates) {
            const studentId = student.id_mhs;
            const minutes = rekapData[studentId] || 0;

            // Check if record exists
            if (existingData[studentId]) {
                // Update existing record
                updates.push({
                    id: existingData[studentId].id,
                    menit_tidak_hadir: minutes,
                    id_sekretaris: secretaryId,
                    updated_at: new Date()
                });
            } else {
                // Create new record
                inserts.push({
                    id_mhs: studentId,
                    id_sekretaris: secretaryId,
                    kelas: kelas,
                    menit_tidak_hadir: minutes,
                    is_published: true
                });
            }
        }

        // Perform batch updates if needed
        if (updates.length > 0) {
            const { error: updateError } = await supabase
                .from('rekap_kehadiran')
                .upsert(updates);

            if (updateError) throw updateError;
        }

        // Perform batch inserts if needed
        if (inserts.length > 0) {
            const { error: insertError } = await supabase
                .from('rekap_kehadiran')
                .insert(inserts);

            if (insertError) throw insertError;
        }

        return true;
    } catch (error) {
        console.error('Error saving attendance:', error);
        throw error;
    }
}

// Submit kompensasi to dosen PA
export async function submitKompensasi(existingData: { [key: string]: RekapKehadiran }, dosenPA: string, kelas: string) {
    try {
        if (!dosenPA) {
            throw new Error('Belum ada Dosen PA yang ditugaskan untuk kelas ini');
        }

        const submissions = [];
        let submittedCount = 0;

        // Submit each student who has attendance data but no kompensasi entry
        for (const studentId in existingData) {
            const rekap = existingData[studentId];

            // Only submit if:
            // 1. There's attendance data
            // 2. There's no existing kompensasi or it was rejected
            const needsSubmission =
                rekap.menit_tidak_hadir > 0 &&
                (!rekap.kompensasi || rekap.kompensasi.status === 'rejected');

            if (needsSubmission) {
                submissions.push({
                    id_rekap: rekap.id,
                    id_dosen_pa: dosenPA,
                    status: 'pending',
                    created_at: new Date(),
                    kelas: kelas
                });
                submittedCount++;
            }
        }

        if (submissions.length > 0) {
            // Batch insert all submissions
            const { error } = await supabase
                .from('kompensasi')
                .insert(submissions);

            if (error) throw error;
        }

        return { submittedCount };
    } catch (error) {
        console.error('Error submitting kompensasi:', error);
        throw error;
    }
}

// Resubmit a rejected kompensasi
export async function handleResubmit(studentId: string, existingData: { [key: string]: RekapKehadiran }, dosenPA: string, kelas: string) {
    try {
        const existingRekap = existingData[studentId];
        if (existingRekap && existingRekap.kompensasi) {
            // Delete old kompensasi entry
            await supabase
                .from('kompensasi')
                .delete()
                .eq('id', existingRekap.kompensasi.id);

            // Check if there's a dosen PA assigned
            if (!dosenPA) {
                throw new Error('Belum ada Dosen PA yang ditugaskan untuk kelas ini');
            }

            // Create new pending kompensasi
            await supabase
                .from('kompensasi')
                .insert({
                    id_rekap: existingRekap.id,
                    id_dosen_pa: dosenPA,
                    status: 'pending',
                    created_at: new Date(),
                    kelas: kelas
                });

            return true;
        }
        return false;
    } catch (error) {
        console.error('Error resubmitting:', error);
        throw error;
    }
}

// Fetch student data for individual view
export async function fetchStudentData(studentId: string, kelas: string) {
    try {
        // Get student attendance data with compensation info
        const { data } = await supabase
            .from('rekap_kehadiran')
            .select(`
                *,
                kompensasi (*)
            `)
            .eq('id_mhs', studentId)
            .single();

        let dosenPA = null;

        // If compensation data exists and has dosen_pa info, fetch dosen details
        if (data?.kompensasi?.id_dosen_pa) {
            const { data: dosenData } = await supabase
                .from('dosen')
                .select('id_dsn, nama')
                .eq('id_dsn', data.kompensasi.id_dosen_pa)
                .single();

            if (dosenData) {
                dosenPA = dosenData;
            }
        } else {
            // Try to get dosen PA info for this class
            const { data: classDosenPA } = await supabase
                .from('kompensasi')
                .select('id_dosen_pa')
                .eq('kelas', kelas)
                .maybeSingle();

            if (classDosenPA?.id_dosen_pa) {
                const { data: dosenData } = await supabase
                    .from('dosen')
                    .select('id_dsn, nama')
                    .eq('id_dsn', classDosenPA.id_dosen_pa)
                    .single();

                if (dosenData) {
                    dosenPA = dosenData;
                }
            }
        }

        return { rekapData: data, dosenPA };
    } catch (error) {
        console.error('Error fetching student data:', error);
        throw error;
    }
}

// Upload file for kompensasi
export async function uploadKompensasiFile(file: File, studentNim: string, kompensasiId: number) {
    try {
        // Upload file to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${studentNim}_kompensasi_bukti_${Date.now()}.${fileExt}`;
        const filePath = `kompensasi/${fileName}`;

        const { error: uploadError } = await supabase
            .storage
            .from('student-files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = supabase
            .storage
            .from('student-files')
            .getPublicUrl(filePath);

        // Update kompensasi record with file URL
        await supabase
            .from('kompensasi')
            .update({
                file_surat: publicUrlData.publicUrl,
                updated_at: new Date()
            })
            .eq('id', kompensasiId);

        return true;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}