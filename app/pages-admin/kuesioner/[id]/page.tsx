'use client'

import { useState, useEffect, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
    Plus,
    Minus,
    ArrowUp,
    ArrowDown,
    Pencil,
    Trash2,
    ChevronLeft,
    Save,
    Info,
    ClipboardList 
} from 'lucide-react';

// TypeScript interfaces
interface Pertanyaan {
    id: string;
    kuesioner_id: string;
    pertanyaan: string;
    // Updated: Only skala_likert and text types allowed
    jenis_jawaban: 'skala_likert' | 'text';
    urutan: number;
}

interface Opsi {
    id: string; // Supabase ID for the option row
    pertanyaan_id: string; // Foreign key to the question
    teks: string; // Description for Likert point (e.g., "Sangat Setuju") or Multiple Choice option
    nilai: number; // Value for Likert point (e.g., 100) or Multiple Choice option
    urutan: number; // Order of the option within the question
}

// Default Likert scale options (5 points) with descriptions and specified values
const DEFAULT_LIKERT_OPTIONS: Omit<Opsi, 'id' | 'pertanyaan_id'>[] = [
    { teks: 'Sangat Tidak Puas', nilai: 20, urutan: 1 },
    { teks: 'Tidak Puas', nilai: 40, urutan: 2 },
    { teks: 'Cukup Puas', nilai: 60, urutan: 3 },
    { teks: 'Puas', nilai: 80, urutan: 4 },
    { teks: 'Sangat Puas', nilai: 100, urutan: 5 }
];

// Default text question for feedback
const DEFAULT_TEXT_QUESTION = 'Berikan saran dan masukan untuk meningkatkan kualitas pembelajaran dosen.';

const KuesionerPertanyaan = ({ params }: { params: Promise<{ id: string }> }) => {
    const { id } = use(params);
    const router = useRouter();
    const supabase = createClient();

    // State variables
    const [pertanyaans, setPertanyaans] = useState<Pertanyaan[]>([]);
    const [kuesionerJudul, setKuesionerJudul] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    // OpsiMap will store options fetched from the database, keyed by pertanyaan_id
    const [opsiMap, setOpsiMap] = useState<Record<string, Opsi[]>>({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [infoTooltip, setInfoTooltip] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        pertanyaan: '',
        // Updated: Only skala_likert and text types
        jenis_jawaban: 'skala_likert' as 'skala_likert' | 'text',
        urutan: 0,
    });

    // Options state for the form - defaults to standardized Likert options
    const [opsiData, setOpsiData] = useState([...DEFAULT_LIKERT_OPTIONS]);

    useEffect(() => {
        // Basic auth check (optional, RLS should handle server-side)
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log("Logged in as:", user.email);
                // Display this somewhere in your UI if needed
                // setInfoTooltip(`Logged in as: ${user.email}`);
            } else {
                console.log("Not authenticated");
                // setError("Not authenticated. Please log in."); // Uncomment if auth is strictly required
            }
        };

        checkAuth();
    }, []);

    // Fetch kuesioner data and questions on component mount or when id changes
    useEffect(() => {
        fetchData();
    }, [id]); // Depend on id to refetch if the route param changes

    const fetchData = async () => {
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            // Fetch kuesioner title
            const { data: kuesioner, error: kuesionerError } = await supabase
                .from('kuesioner')
                .select('judul')
                .eq('id', id)
                .single();

            if (kuesionerError) throw kuesionerError;
            if (kuesioner) setKuesionerJudul(kuesioner.judul);
            else setKuesionerJudul('Kuesioner Tidak Ditemukan'); // Handle case where kuesioner ID is invalid

            // Fetch questions
            const { data: questions, error: questionError } = await supabase
                .from('kuesioner_pertanyaan')
                .select('*')
                .eq('kuesioner_id', id)
                .order('urutan', { ascending: true });

            if (questionError) throw questionError;
            setPertanyaans(questions || []);

            // Fetch options for Likert questions
            if (questions && questions.length > 0) {
                const likertIds = questions
                    .filter(q => q.jenis_jawaban === 'skala_likert')
                    .map(q => q.id);

                if (likertIds.length > 0) {
                    const { data: options, error: optionsError } = await supabase
                        .from('kuesioner_opsi')
                        .select('*')
                        .in('pertanyaan_id', likertIds)
                        // Order options by urutan for consistent display and editing
                        .order('urutan', { ascending: true });

                    if (optionsError) {
                        console.error("Error fetching options:", optionsError);
                        // Continue without options if fetching fails
                    }

                    // Organize options by question ID
                    const optionsByQuestion: Record<string, Opsi[]> = {};
                    options?.forEach(option => {
                        if (!optionsByQuestion[option.pertanyaan_id]) {
                            optionsByQuestion[option.pertanyaan_id] = [];
                        }
                        optionsByQuestion[option.pertanyaan_id].push(option);
                    });

                    setOpsiMap(optionsByQuestion);
                } else {
                    setOpsiMap({}); // No Likert questions, clear options map
                }
            } else {
                setOpsiMap({}); // No questions, clear options map
            }

        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError(`Gagal memuat data kuesioner: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Handle form input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Special handling for jenis_jawaban changes
        if (name === 'jenis_jawaban') {
            if (value === 'text') {
                // When switching to text, set default question text if current is empty
                setFormData(prev => ({
                    ...prev,
                    [name]: value as 'skala_likert' | 'text',
                    pertanyaan: prev.pertanyaan === '' ? DEFAULT_TEXT_QUESTION : prev.pertanyaan
                }));
                // Clear options data as text type doesn't have options
                setOpsiData([]);
            } else if (value === 'skala_likert') {
                // When switching to Likert, reset to default Likert options
                setOpsiData([...DEFAULT_LIKERT_OPTIONS]);
                setFormData(prev => ({ ...prev, [name]: value as 'skala_likert' | 'text' }));
            }
            // Note: 'multiple_choice' type is removed from the select options,
            // so no need to handle it here.
        } else {
            // For other inputs, just update the form data
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Handle changes to the text or value of an option field
    const handleOpsiChange = (index: number, field: keyof Omit<Opsi, 'id' | 'pertanyaan_id'>, value: string | number) => {
        const processedValue = field === 'nilai' ? (parseInt(value as string, 10) || 0) : value;
        const newOpsi = [...opsiData];
        // Ensure the option object exists before updating
        if (newOpsi[index]) {
            // Update the specific field
            (newOpsi[index] as any)[field] = processedValue; // Use any temporarily for dynamic field update
            // Keep urutan and id (if exists) from original
            if ('urutan' in newOpsi[index]) {
                newOpsi[index].urutan = index + 1; // Ensure urutan is always correct based on index
            }
            if ('id' in newOpsi[index]) {
                // Keep existing ID if it's an option loaded from DB
                // newOpsi[index].id = newOpsi[index].id; // This line is redundant
            }
        } else {
            console.warn(`Attempted to update non-existent option at index ${index}`);
        }

        setOpsiData(newOpsi);
    };


    // Add a new option field (primarily for Likert scale editing)
    const addOpsiField = () => {
        // Only allow adding options if the type is Likert
        if (formData.jenis_jawaban !== 'skala_likert') return;

        const newIndex = opsiData.length; // Use 0-based index for array
        setOpsiData([...opsiData, {
            // ID and pertanyaan_id will be added during save/update
            teks: '',
            nilai: newIndex + 1, // Default nilai can be sequential
            urutan: newIndex + 1 // urutan should be sequential
        } as Opsi]); // Cast to Opsi, knowing id and pertanyaan_id are missing initially
    };

    // Remove an option field (primarily for Likert scale editing)
    const removeOpsiField = (index: number) => {
        // Only allow removing options if the type is Likert and there's more than 1
        if (formData.jenis_jawaban !== 'skala_likert' || opsiData.length <= 1) return;

        const newOpsi = opsiData.filter((_, i) => i !== index);
        // Update urutan and nilai for remaining options
        const updatedOpsi = newOpsi.map((option, idx) => ({
            ...option,
            urutan: idx + 1, // Ensure urutan is sequential
            nilai: idx + 1, // Ensure nilai is sequential (can be edited later)
            // Keep existing ID if present
            // ...(option.id && { id: option.id })
        }));
        setOpsiData(updatedOpsi);
    };

    // Reset options to the default Likert scale
    const resetToDefaultOptions = () => {
        // Only allow resetting if the type is Likert
        if (formData.jenis_jawaban !== 'skala_likert') return;
        setOpsiData([...DEFAULT_LIKERT_OPTIONS]);
    };

    // Handle form submission (Add or Update question)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        console.log("Submitting form data:", formData);
        console.log("Submitting opsi data:", opsiData);


        try {
            // Determine the order position
            let urutan = formData.urutan;
            if (!editingId) { // If adding a new question
                // Find the maximum existing urutan and add 1
                const maxUrutan = pertanyaans.length > 0 ? Math.max(...pertanyaans.map(p => p.urutan)) : 0;
                urutan = maxUrutan + 1;
            }
            // If editing, urutan is already set in handleEdit

            let savedQuestionId = editingId;

            if (editingId) {
                console.log("Updating question ID:", editingId);
                // Update existing question in kuesioner_pertanyaan table
                const { data, error } = await supabase
                    .from('kuesioner_pertanyaan')
                    .update({
                        pertanyaan: formData.pertanyaan,
                        jenis_jawaban: formData.jenis_jawaban,
                        urutan: urutan // Use the determined urutan
                    })
                    .eq('id', editingId)
                    .select(); // Select updated row to confirm

                if (error) throw error;
                console.log("Question update successful:", data);
                savedQuestionId = data[0].id;

            } else {
                console.log("Inserting new question for kuesioner ID:", id);
                // Insert new question into kuesioner_pertanyaan table
                const { data, error } = await supabase
                    .from('kuesioner_pertanyaan')
                    .insert([{
                        kuesioner_id: id, // Link to the current kuesioner
                        pertanyaan: formData.pertanyaan,
                        jenis_jawaban: formData.jenis_jawaban,
                        urutan: urutan // Use the determined urutan
                    }])
                    .select(); // Select inserted row to get its ID

                if (error) throw error;
                console.log("Question insert successful:", data);
                savedQuestionId = data[0].id;
            }

            // --- Handle Options for Likert Scale Questions ---
            if (formData.jenis_jawaban === 'skala_likert' && savedQuestionId) {
                // Delete existing options for this question first
                const { error: deleteError } = await supabase
                    .from('kuesioner_opsi')
                    .delete()
                    .eq('pertanyaan_id', savedQuestionId);

                if (deleteError) {
                    console.error("Error deleting existing options:", deleteError);
                    // Decide if you want to throw error or just log warning
                    // For now, logging and continuing to insert new options
                }

                // Prepare new options data for insertion
                const optionsToInsert = opsiData.map(opsi => ({
                    pertanyaan_id: savedQuestionId, // Link to the saved question ID
                    teks: opsi.teks,
                    nilai: opsi.nilai,
                    urutan: opsi.urutan
                }));

                console.log("Inserting options:", optionsToInsert);
                // Insert the new set of options
                const { data: opsiResult, error: opsiError } = await supabase
                    .from('kuesioner_opsi')
                    .insert(optionsToInsert)
                    .select(); // Select inserted options to confirm

                if (opsiError) {
                    console.error("Error inserting options:", opsiError);
                    // Decide if options insertion failure should revert question save
                    // For now, just logging error.
                } else {
                    console.log("Options inserted:", opsiResult);
                }
            }
            // Note: Text type questions do not have options, so no action needed here.


            // Add success message
            setInfoTooltip("Data berhasil disimpan!");
            setTimeout(() => setInfoTooltip(""), 3000);

            // Reset form and refresh data list
            resetForm();
            fetchData();
        } catch (err: any) {
            console.error("Error saving question:", err);
            setError(`Gagal menyimpan pertanyaan: ${err.message}`);
        }
    };

    // Move question up or down in the list
    const moveQuestion = async (id: string, direction: 'up' | 'down') => {
        const currentIndex = pertanyaans.findIndex(p => p.id === id);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up'
            ? Math.max(0, currentIndex - 1)
            : Math.min(pertanyaans.length - 1, currentIndex + 1);

        if (newIndex === currentIndex) return; // No change needed

        // Create a new array with swapped positions (for optimistic UI update)
        const newPertanyaans = [...pertanyaans];
        // Swap elements at currentIndex and newIndex
        [newPertanyaans[currentIndex], newPertanyaans[newIndex]] = [newPertanyaans[newIndex], newPertanyaans[currentIndex]];


        // Update urutan values based on the new order
        // Assign new sequential urutan values
        const updatedUrutans = newPertanyaans.map((p, idx) => ({
            id: p.id,
            urutan: idx + 1 // Assign new urutan based on new index
        }));

        // Optimistically update the UI
        setPertanyaans(newPertanyaans.map((p, idx) => ({ ...p, urutan: idx + 1 })));


        // Update the database with the new urutan values
        try {
            // Create a batch update array
            const updatesToSend = updatedUrutans.map(item => ({
                id: item.id,
                urutan: item.urutan
            }));

            // Perform batch update if Supabase supports it efficiently,
            // otherwise loop through updates. Looping is safer and more compatible.
            for (const update of updatesToSend) {
                const { error } = await supabase
                    .from('kuesioner_pertanyaan')
                    .update({ urutan: update.urutan })
                    .eq('id', update.id);

                if (error) {
                    console.error(`Error updating urutan for question ${update.id}:`, error);
                    throw error; // Throw to trigger catch block and revert UI
                }
            }

            console.log("Database urutan updated successfully.");
            // If database update is successful, UI is already updated optimistically.

        } catch (err: any) {
            console.error("Error moving question:", err);
            setError(`Gagal memindahkan pertanyaan: ${err.message}`);
            // Revert UI state if database update failed
            fetchData(); // Re-fetch to get the correct state from DB
        }
    };

    // Start editing a question
    const handleEdit = (pertanyaan: Pertanyaan) => {
        setEditingId(pertanyaan.id);
        setFormData({
            pertanyaan: pertanyaan.pertanyaan,
            jenis_jawaban: pertanyaan.jenis_jawaban,
            urutan: pertanyaan.urutan, // Keep current urutan for editing
        });

        // Load options if it's a Likert question and options exist in opsiMap
        if (pertanyaan.jenis_jawaban === 'skala_likert' && opsiMap[pertanyaan.id]) {
            // Map fetched options to the opsiData state format
            setOpsiData(opsiMap[pertanyaan.id].map(opsi => ({
                // Keep the original option ID if it exists (for potential future update logic)
                // Although current update logic deletes and re-inserts, keeping ID might be useful.
                // For now, let's just map the core data.
                teks: opsi.teks,
                nilai: opsi.nilai,
                urutan: opsi.urutan
                // id and pertanyaan_id are not needed in opsiData state for the form
            } as Omit<Opsi, 'id' | 'pertanyaan_id'>))); // Cast to match the expected state type
        } else {
            // If it's a text question or no options found for Likert, reset options to default Likert
            // This ensures the options form is ready if the user switches type to Likert
            setOpsiData([...DEFAULT_LIKERT_OPTIONS]);
        }

        setShowForm(true); // Show the form for editing
    };

    // Open the delete confirmation dialog
    const openDeleteDialog = (id: string) => {
        setDeletingId(id);
        setDeleteDialogOpen(true);
    };

    // Confirm and perform deletion
    const confirmDelete = async () => {
        if (!deletingId) return;

        try {
            // Delete the question from kuesioner_pertanyaan table
            const { error } = await supabase
                .from('kuesioner_pertanyaan')
                .delete()
                .eq('id', deletingId);

            if (error) throw error;

            console.log(`Question ${deletingId} deleted successfully.`);

            // Update the UI optimistically first
            setPertanyaans(prev => prev.filter(p => p.id !== deletingId));
            setDeleteDialogOpen(false);
            setDeletingId(null);

            // Reorder remaining questions in the database to maintain continuity
            // This is important for consistent 'urutan' values
            const remainingQuestions = pertanyaans.filter(p => p.id !== deletingId);
            if (remainingQuestions.length > 0) {
                // Sort by current urutan and assign new sequential urutan values
                const updates = remainingQuestions
                    .sort((a, b) => a.urutan - b.urutan)
                    .map((question, index) => ({
                        id: question.id,
                        urutan: index + 1 // Assign new urutan based on sorted index
                    }));

                console.log("Reordering remaining questions:", updates);

                // Perform database updates for reordering
                for (const update of updates) {
                    const { error: reorderError } = await supabase
                        .from('kuesioner_pertanyaan')
                        .update({ urutan: update.urutan })
                        .eq('id', update.id);

                    if (reorderError) {
                        console.error(`Error reordering question ${update.id}:`, reorderError);
                        // Decide how to handle reordering error (e.g., log, show message, re-fetch)
                        // For now, just logging. The main delete was successful.
                    }
                }
                console.log("Remaining questions reordered in DB.");
            }

            // Re-fetch data to ensure UI is fully consistent with DB, especially after reordering
            fetchData();


        } catch (err: any) {
            console.error("Error deleting question:", err);
            setError(`Gagal menghapus pertanyaan: ${err.message}`);
            // If deletion fails, re-fetch data to revert optimistic UI update
            fetchData();
        }
    };

    // Reset the form state
    const resetForm = () => {
        setEditingId(null);
        setFormData({
            pertanyaan: '',
            jenis_jawaban: 'skala_likert', // Reset to default type
            urutan: 0, // Reset urutan
        });
        setOpsiData([...DEFAULT_LIKERT_OPTIONS]); // Reset options to default Likert
        setShowForm(false); // Hide the form
    };

    // Helper to get human-readable question type text
    const getQuestionTypeText = (type: string) => {
        switch (type) {
            case 'skala_likert': return 'Skala Likert (1-5)';
            case 'text': return 'Text (Saran/Masukan)';
            default: return type; // Should not happen with restricted types
        }
    };

    // Show info tooltip for Rating scale
    const showRatingInfo = () => {
        setInfoTooltip('Skala Likert 1-5. 1: Sangat Tidak Puas (Nilai 20), 5: Sangat Puas (Nilai 100). Nilai dihitung proporsional.');
        setTimeout(() => setInfoTooltip(''), 5000); // Show for 5 seconds
    };


    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="w-full max-w-6xl mx-auto"> {/* Max width bisa disesuaikan */}
                    <header className="mb-8"> {/* Pastikan mb-8 atau spasi bawah lainnya sesuai */}
                        <h1 className="text-2xl font-bold text-foreground flex items-center">
                            <ClipboardList className="mr-3 w-6 h-6 text-primary" /> {/* Ukuran ikon disesuaikan */}
                            {kuesionerJudul}
                        </h1>
                    </header>

            {/* Error message */}
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {/* Info tooltip */}
            {infoTooltip && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-600 rounded-md">
                    {infoTooltip}
                </div>
            )}

            {/* Add Question Button */}
            {!showForm && (
                <div className="mb-6">
                    <Button
                        onClick={() => setShowForm(true)} // Selalu set true untuk membuka form
                        className="w-full md:w-auto"
                    >
                        {'+ Pertanyaan Baru'}
                    </Button>
                </div>
            )}

            {/* Simplified Question Form */}
            {showForm && ( // Form ini sudah menggunakan Card, sesuaikan padding jika perlu
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="pertanyaan" className="mb-1 block">Pertanyaan</Label>
                                <Textarea
                                    id="pertanyaan"
                                    name="pertanyaan"
                                    value={formData.pertanyaan}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="Masukkan pertanyaan di sini"
                                    className="w-full"
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="jenis_jawaban" className="mb-1 block">Jenis Jawaban</Label>
                                    {/* Info button for Likert scale */}
                                    {formData.jenis_jawaban === 'skala_likert' && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={showRatingInfo}
                                            className="h-6 px-2 text-xs"
                                        >
                                            <Info className="h-3 w-3 mr-1" /> Info Skala
                                        </Button>
                                    )}
                                </div>
                                <select
                                    id="jenis_jawaban"
                                    name="jenis_jawaban"
                                    value={formData.jenis_jawaban}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded-md"
                                    required
                                >
                                    {/* Updated: Only Likert and Text options */}
                                    <option value="skala_likert">Skala Likert (1-5)</option>
                                    <option value="text">Text (Saran & Masukan)</option>
                                </select>

                                {/* Help text for each type */}
                                <div className="mt-1 text-xs text-gray-500">
                                    {formData.jenis_jawaban === 'skala_likert' && (
                                        <p>Mahasiswa akan memilih dari skala 1-5 dengan keterangan yang bisa diubah di bawah.</p>
                                    )}
                                    {formData.jenis_jawaban === 'text' && (
                                        <p>Mahasiswa dapat memberikan input teks bebas. Default pertanyaan: "{DEFAULT_TEXT_QUESTION}"</p>
                                    )}
                                </div>
                            </div>

                            {/* Options section - only for Skala Likert */}
                            {formData.jenis_jawaban === 'skala_likert' && (
                                <div>
                                    <Label className="mb-2 block">Opsi Skala Likert (Teks & Nilai)</Label>
                                    
                                    {/* Editable Options List */}
                                    {opsiData.map((opsi, index) => (
                                        <div key={index} className="flex items-center gap-2 mb-2">
                                            {/* Option Text Input */}
                                            <Input
                                                value={opsi.teks}
                                                onChange={(e) => handleOpsiChange(index, 'teks', e.target.value)}
                                                placeholder={`Opsi ${index + 1}`}
                                                className="flex-grow"
                                                required
                                            />
                                            {/* Option Value Input */}
                                            <Input
                                                type="number"
                                                value={opsi.nilai}
                                                onChange={(e) => handleOpsiChange(index, 'nilai', e.target.value)}
                                                placeholder="Nilai"
                                                min="0" // Allow 0 or higher for value
                                                className="w-16"
                                                required
                                            />
                                            {/* Remove Option Button */}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeOpsiField(index)}
                                                className="h-10 w-10 p-0"
                                                disabled={opsiData.length <= 1} // Disable if only one option remains
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {/* Tombol terkait opsi akan dipindahkan ke baris tombol utama form */}
                                </div>
                            )}

                            {/* Form buttons */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-4"> {/* Menambah margin atas dan flex-wrap */}
                                <div> {/* Kontainer untuk tombol sisi kiri (Tombol Opsi) */}
                                    {formData.jenis_jawaban === 'skala_likert' && (
                                        <div className="flex items-center gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={addOpsiField}>
                                                <Plus className="h-4 w-4 mr-1" /> Tambah Opsi
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2"> {/* Kontainer untuk tombol sisi kanan (Aksi Form) */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetForm}
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit">
                                        <Save className="h-4 w-4 mr-1" />
                                        {editingId ? 'Update' : 'Simpan'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
                </div> {/* End max-w-6xl mx-auto */}
            {/* Loading and empty states */}
            {loading ? (
                <div className="text-center py-6">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Memuat data...</p>
                </div>
            ) : pertanyaans.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Belum ada pertanyaan untuk kuesioner ini. Tambahkan pertanyaan pertama di atas.</p>
                </div>
            ) : (
                /* Simplified Questions list */
                <div className="space-y-3">
                    {pertanyaans.map((pertanyaan, index) => (
                        <Card key={pertanyaan.id} className="border shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-start gap-2">
                                    {/* Question content */}
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="px-1.5 py-0 text-xs">
                                                #{pertanyaan.urutan}
                                            </Badge>
                                            <h3 className="font-medium text-sm">{pertanyaan.pertanyaan}</h3>
                                        </div>

                                        <div className="text-xs text-gray-500 mb-2">
                                            Jenis: {getQuestionTypeText(pertanyaan.jenis_jawaban)}
                                        </div>

                                        {/* Display Likert options if available */}
                                        {pertanyaan.jenis_jawaban === 'skala_likert' && opsiMap[pertanyaan.id] && (
                                            <div className="text-xs pl-2 border-l-2 border-gray-200 space-y-0.5">
                                                {/* Sort options by urutan for display */}
                                                {opsiMap[pertanyaan.id].sort((a, b) => a.urutan - b.urutan).map((opsi) => (
                                                    <div key={opsi.id} className="flex items-center gap-1">
                                                        <span>• {opsi.teks}</span>
                                                        {/* Display nilai if it exists */}
                                                        {opsi.nilai !== undefined && (
                                                            <span className="text-gray-500">({opsi.nilai})</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions - simplified and more compact */}
                                    <div className="flex items-center gap-1">
                                        {/* Move Up/Down Buttons */}
                                        <div className="flex flex-col gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => moveQuestion(pertanyaan.id, 'up')}
                                                disabled={index === 0} // Disable if it's the first question
                                                title="Pindah ke Atas"
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => moveQuestion(pertanyaan.id, 'down')}
                                                disabled={index === pertanyaans.length - 1} // Disable if it's the last question
                                                title="Pindah ke Bawah"
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {/* Edit and Delete Buttons */}
                                        <div className="flex flex-col gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7"
                                                onClick={() => handleEdit(pertanyaan)}
                                                title="Edit Pertanyaan"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => openDeleteDialog(pertanyaan.id)}
                                                title="Hapus Pertanyaan"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Delete confirmation dialog - simplified */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Pertanyaan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pertanyaan dan semua jawaban terkait.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-500 text-white hover:bg-red-600"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </main>
        </div>
    );
};

export default KuesionerPertanyaan;
