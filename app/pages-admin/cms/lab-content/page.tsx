'use client';

import React, { useState, useEffect, FormEvent, ChangeEvent, useCallback, useMemo } from 'react'; // Removed unused useRef
import { createClient } from '@/utils/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadCloud, Trash2, BookOpen, PlusCircle, ListFilter } from 'lucide-react'; // Removed unused ArrowUp, ArrowDown
import { v4 as uuidv4 } from 'uuid'; // Used for generating unique IDs for list items
import SidebarAdmin from '@/components/SidebarAdmin';

// --- Interfaces ---
interface LabMainImage {
  id: string; // Unique ID for React keys and internal tracking
  file?: File; // For storing the new file selected (optional)
  alt: string;
  imageUrl: string | null;
  storagePath?: string | null; // For storing the path in Supabase Storage (optional)
}

interface LabEquipment {
  id: string; // Unique ID for React keys and internal tracking
  imageFile?: File; // For storing the equipment image file (optional)
  name: string;
  description: string;
  category: string; // Category is now a string
  iconName: string;
  imageUrl: string | null;
  storagePath?: string | null; // For storing the equipment image path (optional)
}

interface LaboratoriumDataState {
  title: string;
  deskripsi: string;
  mainImages: LabMainImage[]; // Array of main images
  equipments: LabEquipment[]; // Array of equipment items
  userDefinedCategories: string[]; // New: User-defined categories for this lab
}

// For Supabase storage (JSONB columns structure)
interface StoredLabMainImage {
  url: string;
  alt: string;
  storagePath: string;
}

interface StoredLabEquipment {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  iconName: string;
  storagePath: string;
}

// --- Static Data ---
const LAB_OPTIONS = [
  { id_lab: "lab-analisis", name: "Lab Analisis" },
  { id_lab: "lab-rekayasa", name: "Lab Rekayasa" },
  { id_lab: "lab-energi", name: "Lab Energi" },
  { id_lab: "lab-miniplant", name: "Lab Mini Plant" },
];

const LUCIDE_ICON_OPTIONS = [
  "FlaskConical", "Thermometer", "Scale", "Beaker", "Settings2",
  "Flame", "Factory", "Leaf", "Fuel", "TestTube", "Microscope", "Zap", "Power", "Wind", "Sun",
  "Pipette", "Orbit", "Atom", "Biohazard", "Recycle", "Settings", "Wrench", "Droplets", "Sparkles",
  "Cpu", "Server", "HardDrive", "Database", "Cloud", "Network"
];

// Predefined categories based on lab type
const PREDEFINED_EQUIPMENT_CATEGORIES: Record<string, string[]> = {
  "lab-analisis": [
    "Alat Lab Kimia Analitik Instrumen",
  ],
  "lab-rekayasa": [
    "Alat Lab Satuan Proses",
    "Alat Lab Bioproses",
  ],
  "lab-miniplant": [
    "Alat Lab Satuan Operasi",
    "Alat Lab Pilot Plant",
    "Alat Lab Utilitas",
  ],
  "lab-energi": [
    "Alat Lab Pemanfaatan Batu Bara",
    "Alat Lab Teknologi Minyak Bumi",
    "Alat Lab Teknik Pembakaran",
    "Alat Lab Mesin Konversi Energi",
    "Alat Lab Teknologi Bioenergi",
  ],
};

// Initial state structure including the new field
const initialLabDataStructure: Omit<LaboratoriumDataState, 'title'> = {
  deskripsi: '',
  mainImages: [],
  equipments: [],
  userDefinedCategories: [], // Initialize with empty array
};

export default function LaboratoriumCMSPage() {
  const supabase = createClient();
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  // State holding all form data. Updates to this state cause component re-renders.
  const [labData, setLabData] = useState<LaboratoriumDataState>({ title: '', ...initialLabDataStructure });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for category management
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newUserCategoryName, setNewUserCategoryName] = useState('');

  // Combine predefined and user-defined categories for the current lab
  const availableCategories = useMemo(() => {
    const predefined = selectedLabId ? PREDEFINED_EQUIPMENT_CATEGORIES[selectedLabId] || [] : [];
    // Ensure user-defined categories are unique and don't overlap with predefined ones
    const userDefined = labData.userDefinedCategories.filter(cat => !predefined.includes(cat));
    return [...predefined, ...userDefined];
  }, [selectedLabId, labData.userDefinedCategories]); // Recalculate when selectedLabId or userDefinedCategories change

  // --- Fetch Data Effect ---
  useEffect(() => {
    const fetchLabContentInternal = async () => {
      const { data, error: fetchError } = await supabase
        .from('cms_laboratorium')
        .select('*')
        .eq('id_lab', selectedLabId)
        .single();

      const currentLabConfig = LAB_OPTIONS.find(lab => lab.id_lab === selectedLabId);
      const defaultTitle = currentLabConfig?.name || selectedLabId || 'Laboratorium';

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: 0 rows found
        console.error('Error fetching lab content:', fetchError);
        setError(`Gagal memuat data untuk ${defaultTitle}.`);
        setLabData({
          title: defaultTitle,
          ...initialLabDataStructure
        });
        // If no data, start by managing categories
        setIsManagingCategories(true);
      } else if (data) {
        // Data found, map stored data to state structure, generating new UUIDs for list items
        setLabData({
          title: data.title || defaultTitle,
          deskripsi: data.deskripsi || '',
          mainImages: (data.main_images || []).map((imgStored: StoredLabMainImage) => {
            return {
              id: uuidv4(), // Generate new UUID for the item in state
              alt: imgStored.alt,
              imageUrl: imgStored.url,
              storagePath: imgStored.storagePath,
              file: undefined, // No file initially
            };
          }),
          equipments: (data.equipments || []).map((eqStored: StoredLabEquipment) => {
            return {
              id: uuidv4(), // Generate new UUID for the item in state
              ...eqStored,
              imageFile: undefined, // No file initially
            };
          }),
          userDefinedCategories: data.user_defined_categories || [], // Load user-defined categories
        });
         // Decide whether to show category management or equipment based on fetched data
         // If no equipments AND no user-defined categories, start with category management.
         const hasUserCategories = (data.user_defined_categories || []).length > 0;
         const hasEquipments = (data.equipments || []).length > 0;
         setIsManagingCategories(!hasUserCategories && !hasEquipments);

      } else {
        // No data found, initialize with defaults
        setLabData({
          title: defaultTitle,
          deskripsi: '',
          mainImages: [],
          equipments: [],
          userDefinedCategories: [],
        });
        setIsManagingCategories(true); // Start by managing categories if no data found
      }
      setLoading(false);
    };

    if (selectedLabId) {
      setLoading(true);
      setError(null);
      setSuccess(null);
      fetchLabContentInternal();
    } else {
      // Reset state when no lab is selected
      setLabData({ title: '', ...initialLabDataStructure });
      setLoading(false);
      setError(null);
      setSuccess(null);
      setIsManagingCategories(false); // Hide sections when no lab is selected
    }
  }, [selectedLabId, supabase]); // Effect runs when selectedLabId changes

  // --- Handlers ---

  // Callback for lab selection change - stable reference
  const handleLabSelectionChange = useCallback((labId: string) => {
    setSelectedLabId(labId);
    setError(null);
    setSuccess(null);
    // When lab changes, reset to category management view
    setIsManagingCategories(true);
    setNewUserCategoryName(''); // Clear new category input
  }, []);

  // Callback for general input/textarea changes (title, deskripsi) - stable reference
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "title" || name === "deskripsi") {
      // Update state immutably
      setLabData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  // --- Category Management Handlers ---
  const handleNewUserCategoryNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNewUserCategoryName(e.target.value);
  }, []);

  const handleAddUserCategory = useCallback(() => {
    if (newUserCategoryName.trim() && !availableCategories.includes(newUserCategoryName.trim())) {
      setLabData(prev => ({
        ...prev,
        userDefinedCategories: [...prev.userDefinedCategories, newUserCategoryName.trim()],
      }));
      setNewUserCategoryName(''); // Clear input after adding
      setError(null); // Clear any previous category error
    } else if (availableCategories.includes(newUserCategoryName.trim())) {
        setError(`Kategori "${newUserCategoryName.trim()}" sudah ada.`);
    } else {
        setError("Nama kategori tidak boleh kosong.");
    }
  }, [newUserCategoryName, availableCategories]); // Depends on newUserCategoryName and availableCategories

  const handleRemoveUserCategory = useCallback((categoryToRemove: string) => {
      // Prevent removing predefined categories
      const predefined = selectedLabId ? PREDEFINED_EQUIPMENT_CATEGORIES[selectedLabId] || [] : [];
      if (predefined.includes(categoryToRemove)) {
          setError(`Tidak bisa menghapus kategori bawaan: "${categoryToRemove}".`);
          return;
      }

      // Check if any equipment uses this category before removing
      const isCategoryUsed = labData.equipments.some(eq => eq.category === categoryToRemove);
      if (isCategoryUsed) {
          setError(`Tidak bisa menghapus kategori "${categoryToRemove}" karena masih digunakan oleh peralatan.`);
          return;
      }

      setLabData(prev => ({
          ...prev,
          userDefinedCategories: prev.userDefinedCategories.filter(cat => cat !== categoryToRemove),
      }));
      setError(null); // Clear any previous category error
  }, [labData.equipments, selectedLabId]); // Depends on labData.equipments and selectedLabId


  // --- Main Image Handlers ---
  const addMainImageField = useCallback(() => {
    setLabData(prev => {
      return {
        ...prev,
        mainImages: [...prev.mainImages, { // Add new item with UUID
          id: uuidv4(),
          imageUrl: null,
          alt: '',
          file: undefined,
          storagePath: undefined
        }],
      };
    });
  }, []);

  const handleMainImageFileChange = useCallback((id: string, e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLabData(prev => {
        const newMainImages = prev.mainImages.map(img =>
          img.id === id
            ? { ...img, file, imageUrl: URL.createObjectURL(file) } // Create new object for updated item
            : img // Return existing object reference for other items
        );
        return { ...prev, mainImages: newMainImages }; // Create new array reference
      });
    }
  }, []);

  // Callback for main image alt text change - THIS WILL NOW BE CALLED ON BLUR FROM CHILD
  const handleMainImageAltChange = useCallback((id: string, value: string) => {
    setLabData(prev => {
      const newMainImages = prev.mainImages.map(img =>
        img.id === id ? { ...img, alt: value } : img // Create new object for updated item
      );
      return { ...prev, mainImages: newMainImages }; // Create new array reference
    });
  }, []); // Dependencies: setLabData (stable)

  const removeMainImage = useCallback((id: string) => {
    setLabData(prev => ({
      ...prev,
      mainImages: prev.mainImages.filter(img => img.id !== id), // Create new array reference
    }));
  }, []);

  // --- Equipment Handlers ---
  // Modified addEquipment to accept category
  const addEquipment = useCallback((category: string) => {
    setLabData(prev => {
      return {
        ...prev,
        equipments: [...prev.equipments, { // Add new item with UUID
          id: uuidv4(),
          name: '',
          description: '',
          category: category, // Use the category passed to the function
          imageUrl: null,
          iconName: LUCIDE_ICON_OPTIONS[0],
          imageFile: undefined,
          storagePath: undefined
        }],
      };
    });
  }, []); // No dependencies needed as it uses the category parameter

  // Callback to handle changes for a specific equipment item by its ID
  // Removed category change logic as it's set when adding
  const handleEquipmentChangeById = useCallback((id: string, field: Omit<keyof LabEquipment, 'category'>, value: string | File | null) => {
    setLabData(prev => {
      const newData = {
        ...prev,
        equipments: prev.equipments.map(eq => {
          if (eq.id !== id) return eq; // Return existing object reference if not the one being changed

          const updated = { ...eq }; // Create a new object for the updated item

          if (field === 'imageFile') {
            if (value instanceof File) {
              updated.imageFile = value;
              updated.imageUrl = URL.createObjectURL(value);
            } else if (value === null) {
              updated.imageFile = undefined;
              updated.imageUrl = null;
            }
          } else if (typeof value === 'string') {
            // If value is a string, check which field is being updated
            if (field === 'name') {
              updated.name = value;
            } else if (field === 'description') {
              updated.description = value;
            } else if (field === 'iconName') {
              updated.iconName = value;
            }
          }

          return updated; // Return the new object
        })
      };
      return newData; // Return the new state object (new reference for labData)
    });
  }, []); // Dependencies: setLabData (stable)

  // Callback to remove an equipment item by its ID - stable reference
  const removeEquipmentById = useCallback((id: string) => {
    setLabData(prev => ({
      ...prev,
      equipments: prev.equipments.filter(eq => eq.id !== id), // Create new array reference
    }));
  }, []);

  // Helper function to upload image and get paths - stable reference
  const _uploadImageAndGetPaths = useCallback(async (
    file: File,
    basePath: string,
    fileNamePrefix: string = ''
  ): Promise<{ imageUrl: string; storagePath: string } | null> => {
    const filePath = `${basePath}/${fileNamePrefix}${uuidv4()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('lab')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError(`Gagal unggah file ${file.name}: ${uploadError.message}`);
      return null;
    }
    const { data: publicUrlData } = supabase.storage.from('lab').getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      setError(`Gagal mendapatkan URL publik untuk ${file.name}: URL tidak ditemukan.`);
      return null;
    }
    return { imageUrl: publicUrlData.publicUrl, storagePath: filePath };
  }, [supabase]); // Depends on supabase client instance

  // --- Submit Handler ---
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!selectedLabId) {
      setError("Silakan pilih laboratorium terlebih dahulu.");
      setIsSubmitting(false);
      return;
    }

    // Process main images (upload new files, collect data for database)
    const uploadedMainImages: StoredLabMainImage[] = [];
    for (const img of labData.mainImages) {
      let currentImageUrl = img.imageUrl;
      let currentStoragePath = img.storagePath;

      if (img.file) { // Check if a new file was selected
        const uploadResult = await _uploadImageAndGetPaths(img.file, `laboratorium/${selectedLabId}/main_images`);
        if (!uploadResult) {
          setIsSubmitting(false);
          return; // Stop if upload fails
        }
        currentImageUrl = uploadResult.imageUrl;
        currentStoragePath = uploadResult.storagePath;
      }

      // Ensure alt text is included even if no new file was uploaded
      if (currentImageUrl && currentStoragePath) {
        uploadedMainImages.push({ url: currentImageUrl, alt: img.alt, storagePath: currentStoragePath });
      }
    }

    // Process equipment items (upload new files, collect data for database)
    const processedEquipments: StoredLabEquipment[] = [];
    for (const eq of labData.equipments) {
      let currentEqImageUrl = eq.imageUrl;
      let currentEqStoragePath = eq.storagePath;

      if (eq.imageFile) { // Check if a new file was selected for equipment
        const uploadResult = await _uploadImageAndGetPaths(eq.imageFile, `laboratorium/${selectedLabId}/equipment`, `${eq.name.replace(/\s+/g, '_')}-`);
        if (!uploadResult) {
          setIsSubmitting(false);
          return; // Stop if upload fails
        }
        currentEqImageUrl = uploadResult.imageUrl;
        currentEqStoragePath = uploadResult.storagePath;
      }

      // Ensure all equipment fields are included
      // Note: We are now allowing equipment without images to be saved, but they need other fields.
      if (eq.name && eq.description && eq.category && eq.iconName) { // Removed image checks here
           processedEquipments.push({
            name: eq.name,
            description: eq.description,
            category: eq.category,
            imageUrl: currentEqImageUrl || '', // Save null or empty string if no image
            iconName: eq.iconName,
            storagePath: currentEqStoragePath || '', // Save null or empty string if no image
          });
      } else {
          // Optional: Add validation or warning if required fields are missing
          console.warn("Skipping equipment item due to missing data:", eq);
      }
    }

    // Save processed data to database using upsert
    const { error: upsertError } = await supabase
      .from('cms_laboratorium')
      .upsert({
        id_lab: selectedLabId,
        title: labData.title,
        deskripsi: labData.deskripsi,
        main_images: uploadedMainImages, // Save processed image data
        equipments: processedEquipments, // Save processed equipment data
        user_defined_categories: labData.userDefinedCategories, // Save user-defined categories
        updated_at: new Date().toISOString()
      }, { onConflict: 'id_lab' }); // Use id_lab as the conflict key for upsert

    if (upsertError) {
      setError(`Gagal menyimpan data laboratorium: ${upsertError.message}`);
    } else {
      setSuccess(`Data untuk ${labData.title} berhasil disimpan.`);
      // Optionally refetch data after successful save to update state with new URLs/paths
      // This might cause focus issues again if not handled carefully,
      // but it ensures the state reflects the saved data (e.g., storage paths).
      // For now, we won't refetch automatically to avoid potential issues.
      // A manual page refresh would show the updated data.
    }

    setIsSubmitting(false);
  }, [selectedLabId, labData, supabase, _uploadImageAndGetPaths]); // Dependencies for handleSubmit

  // Helper function to group equipment by category - memoized for performance
  const equipmentsByCategory = useMemo(() => {
    const grouped: Record<string, LabEquipment[]> = {};
    // Ensure all available categories are represented, even if empty, so we can show the "Add Equipment" button
    availableCategories.forEach(cat => {
        grouped[cat] = [];
    });

    labData.equipments.forEach(equipment => {
      // If equipment has a category not in availableCategories (e.g., deleted user category),
      // group it under a default or "Unknown" category, or just list it.
      // For simplicity, let's group it under its category, even if it's no longer available.
      const category = equipment.category || 'Tanpa Kategori';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(equipment);
    });

    // Sort categories based on the order in availableCategories
    // Include categories from availableCategories even if they have no equipment,
    // and include categories used by equipment but no longer in availableCategories at the end.
    const categoriesWithEquipment = Object.keys(grouped);
    const categoriesToShow = Array.from(new Set([...availableCategories, ...categoriesWithEquipment])); // Combine and get unique categories

    // Sort based on the order in availableCategories first, then alphabetically for others
    categoriesToShow.sort((a, b) => {
        const indexA = availableCategories.indexOf(a);
        const indexB = availableCategories.indexOf(b);

        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB; // Both in available, sort by their order
        }
        if (indexA !== -1) {
            return -1; // A is in available, B is not, A comes first
        }
        if (indexB !== -1) {
            return 1; // B is in available, A is not, B comes first
        }
        return a.localeCompare(b); // Neither in available, sort alphabetically
    });


    const sortedGrouped: Record<string, LabEquipment[]> = {};
    categoriesToShow.forEach(cat => {
        sortedGrouped[cat] = grouped[cat] || []; // Ensure empty arrays for categories with no equipment
    });

    return sortedGrouped;

  }, [labData.equipments, availableCategories]); // Recalculates when equipments or availableCategories change

  // --- Sub-components for list items ---

  // Memoized component for a single main image item
  const MainImageItem = React.memo(({ image, displayIndex, onFileChange, onAltChange, onRemove }: {
    image: LabMainImage; // Prop: the image object (reference changes on update)
    displayIndex: number; // Prop: index for display purposes only
    onFileChange: (id: string, e: ChangeEvent<HTMLInputElement>) => void; // Prop: callback (stable reference from parent)
    onAltChange: (id: string, value: string) => void; // Prop: callback (stable reference from parent)
    onRemove: (id: string) => void; // Prop: callback (stable reference from parent)
  }) => {
    // Use local state for the alt text input value
    const [localAlt, setLocalAlt] = useState(image.alt);

    // Update local state when the parent 'image.alt' prop changes (e.g., on initial load or fetch)
    useEffect(() => {
        setLocalAlt(image.alt);
    }, [image.alt]);

    // Use useCallback for internal handlers to ensure stable references passed to DOM elements
    const handleFileChangeInternal = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      onFileChange(image.id, e);
    }, [image.id, onFileChange]); // Dependencies: image.id and parent handler

    // Update local state on change, but call parent handler on blur
    const handleLocalAltChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      setLocalAlt(e.target.value); // Update local state immediately
    }, []); // No dependencies needed for local state update

    const handleAltBlur = useCallback(() => {
        onAltChange(image.id, localAlt); // Call parent handler with local state value on blur
    }, [image.id, localAlt, onAltChange]); // Dependencies: image.id, localAlt, and parent handler

    const handleRemoveInternal = useCallback(() => {
      onRemove(image.id);
    }, [image.id, onRemove]); // Dependencies: image.id and parent handler

    // Component will re-render if 'image' prop reference changes,
    // or any callback reference changes. Local state changes
    // will cause this component to re-render, but not the parent.
    return (
      // Tambahkan 'relative' untuk positioning absolut tombol hapus
      <div className="relative p-3 border border-border rounded-md space-y-2 bg-muted/30">
        <Label htmlFor={`mainImageFile-${image.id}`} className="text-muted-foreground text-sm">Gambar {displayIndex + 1}</Label>
        <Input
          id={`mainImageFile-${image.id}`}
          type="file"
          accept="image/*"
          onChange={handleFileChangeInternal} // Use stable internal handler
          className="bg-background border-input text-foreground file:text-primary file:font-medium"
        />
        {image.imageUrl && <img src={image.imageUrl} alt={localAlt || `Preview ${displayIndex + 1}`} className="mt-2 max-h-32 rounded" />}
        {/* <Label htmlFor={`mainImageAlt-${image.id}`} className="text-muted-foreground text-sm">Alt Text Gambar {displayIndex + 1}</Label>
        <Input
          id={`mainImageAlt-${image.id}`}
          value={localAlt} // Value bound to local state
          onChange={handleLocalAltChange} // Update local state on change
          onBlur={handleAltBlur} // Update parent state on blur
          className="bg-background border-input text-foreground"
        /> */}
        {/* Tombol Hapus diubah menjadi ikon saja dan diposisikan di kanan atas */}
        <Button
          type="button"
          variant="ghost" // Tetap ghost agar tidak terlalu mencolok
          size="icon"     // Ubah menjadi size="icon" untuk tombol ikon standar
          onClick={handleRemoveInternal}
          className="absolute top-0 right-1 text-destructive hover:bg-destructive/10 hover:text-destructive" // Posisi top diubah dari top-1 menjadi top-0
        >
          <Trash2 size={16} /> {/* Hanya ikon, ukuran disesuaikan sedikit, mr-1 dihapus */}
        </Button>
      </div>
    );
  });
  MainImageItem.displayName = 'MainImageItem'; // Add display name for easier debugging

  // Memoized component for a single equipment item
  // Removed availableCategories prop and category select input
  const EquipmentItem = React.memo(({ equipment, equipmentIndexForDisplay, onEquipmentChangeById, onRemoveById }: {
    equipment: LabEquipment; // Prop: the equipment object (reference changes on update)
    equipmentIndexForDisplay: number; // Prop: index for display purposes only
    onEquipmentChangeById: (id: string, field: Omit<keyof LabEquipment, 'category'>, value: string | File | null) => void; // Prop: callback (stable reference from parent)
    onRemoveById: (id: string) => void; // Prop: callback (stable reference from parent)
  }) => {
    // Use local state for name and description input values
    const [localName, setLocalName] = useState(equipment.name);
    const [localDescription, setLocalDescription] = useState(equipment.description);

    // Update local state when the parent 'equipment' prop changes (e.g., on initial load or fetch)
    useEffect(() => {
        setLocalName(equipment.name);
        setLocalDescription(equipment.description);
    }, [equipment.name, equipment.description]); // Dependencies: equipment.name, equipment.description

    // Use useCallbacks for all internal handlers to ensure stable references
    // Update local state on change, call parent handler on blur for name and description
    const handleLocalNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      setLocalName(e.target.value); // Update local state immediately
    }, []);

    const handleNameBlur = useCallback(() => {
        onEquipmentChangeById(equipment.id, 'name', localName); // Call parent handler with local state value on blur
    }, [equipment.id, localName, onEquipmentChangeById]); // Dependencies: equipment.id, localName, parent handler

    const handleLocalDescriptionChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
      setLocalDescription(e.target.value); // Update local state immediately
    }, []);

    const handleDescriptionBlur = useCallback(() => {
        onEquipmentChangeById(equipment.id, 'description', localDescription); // Call parent handler with local state value on blur
    }, [equipment.id, localDescription, onEquipmentChangeById]); // Dependencies: equipment.id, localDescription, parent handler


    // These handlers still update parent state directly as they don't cause the same focus issues
    // Category change handler is removed from here
    const handleIconChange = useCallback((value: string) => {
      onEquipmentChangeById(equipment.id, 'iconName', value);
    }, [equipment.id, onEquipmentChangeById]); // Dependencies: equipment.id and parent handler

    const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      onEquipmentChangeById(equipment.id, 'imageFile', e.target.files ? e.target.files[0] : null);
    }, [equipment.id, onEquipmentChangeById]); // Dependencies: equipment.id and parent handler

    const handleRemoveClick = useCallback(() => {
      onRemoveById(equipment.id);
    }, [equipment.id, onRemoveById]); // Dependencies: equipment.id and parent handler

    // Component will re-render if 'equipment' prop reference changes,
    // or any callback reference changes. Local state changes for name and description
    // will cause this component to re-render, but not the parent, thus preserving input focus.
    return (
      <div className="p-2 border border-border rounded-md bg-background space-y-1">
        <div className="flex justify-between items-center">
          <p className="font-semibold text-foreground">Alat #{equipmentIndexForDisplay + 1} - {localName || 'Tanpa Nama'}</p> {/* Use localName for display */}
          <Button type="button" variant="ghost" size="sm" onClick={handleRemoveClick}>
            <Trash2 size={14} className="text-destructive" /> Hapus
          </Button>
        </div>
        {/* Use equipment.id for HTML element IDs for accessibility and stability */}
        <div>
          <Label htmlFor={`eqName-${equipment.id}`} className="text-muted-foreground text-sm">Nama Alat</Label>
          <Input
            id={`eqName-${equipment.id}`}
            value={localName} // Value bound to local state
            onChange={handleLocalNameChange} // Update local state on change
            onBlur={handleNameBlur} // Update parent state on blur
            className="bg-background border-input text-foreground h-9 text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`eqDesc-${equipment.id}`} className="text-muted-foreground text-sm">Deskripsi Alat</Label>
          <Textarea
            id={`eqDesc-${equipment.id}`}
            value={localDescription} // Value bound to local state
            onChange={handleLocalDescriptionChange} // Update local state on change
            onBlur={handleDescriptionBlur} // Update parent state on blur
            rows={3}
            className="bg-background border-input text-foreground text-sm"
          />
        </div>
        {/* Category is now displayed as text, not editable */}
        <div>
           <Label className="text-muted-foreground text-sm">Kategori Alat</Label>
           <p className="text-foreground font-medium text-sm">{equipment.category || 'Tanpa Kategori'}</p>
        </div>
        <div>
          <Label htmlFor={`eqIcon-${equipment.id}`} className="text-muted-foreground">Ikon Alat</Label>
          <Select value={equipment.iconName} onValueChange={handleIconChange}> {/* Parent state update on change */}
            <SelectTrigger id={`eqIcon-${equipment.id}`} className="bg-background border-input text-foreground"><SelectValue placeholder="Pilih ikon" /></SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              {LUCIDE_ICON_OPTIONS.map(icon => (<SelectItem key={icon} value={icon} className="hover:bg-muted focus:bg-muted">{icon}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`eqImage-${equipment.id}`} className="text-muted-foreground text-sm">Gambar Alat</Label>
          <Input
            id={`eqImage-${equipment.id}`}
            type="file"
            accept="image/*"
            onChange={handleImageChange} // Parent state update on change
            className="bg-background border-input text-foreground file:text-primary file:font-medium h-9 text-sm"
          />
          {equipment.imageUrl && (<img src={equipment.imageUrl} alt={localName || `Preview Alat`} className="mt-2 max-h-32 rounded" />)} {/* Use localName for alt text preview */}
        </div>
      </div>
    );
  });
  EquipmentItem.displayName = 'EquipmentItem'; // Add display name for easier debugging

  return (
    <div className="min-h-screen theme-admin">
      <SidebarAdmin />
      <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-4 flex items-center text-foreground">
            <BookOpen className="mr-3 w-8 h-8" /> Manajemen Laboratorium
            {selectedLabId && labData.title && ` - ${labData.title}`}
          </h1>

          {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md mb-3 text-sm">{error}</p>}
          {success && <p className="text-green-600 dark:text-green-400 bg-green-500/10 p-3 rounded-md mb-3 text-sm">{success}</p>}

          <Card className="mb-4 bg-card border-border shadow-lg">
            <CardHeader className="px-4 pt-4 pb-1"> {/* Padding bawah dikurangi lagi menjadi pb-1 */}
              <CardTitle className="text-xl text-card-foreground">Pilih Laboratorium</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-1 pb-4"> {/* Padding atas dikurangi lagi menjadi pt-1 */}
              <Select onValueChange={handleLabSelectionChange} value={selectedLabId || undefined} >
                <SelectTrigger className="w-full md:w-1/2 bg-background border-input text-foreground">
                  <SelectValue placeholder="-- Pilih Laboratorium --" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {LAB_OPTIONS.map(lab => (
                    <SelectItem key={lab.id_lab} value={lab.id_lab} className="hover:bg-muted focus:bg-muted">
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {loading && selectedLabId && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="ml-3 text-lg text-muted-foreground">Memuat data untuk {LAB_OPTIONS.find(l => l.id_lab === selectedLabId)?.name || 'laboratorium'}...</p>
            </div>
          )}

          {selectedLabId && !loading && (
            <form onSubmit={handleSubmit}>
              {/* --- Informasi Umum Lab --- */}
              <Card className="mb-4 bg-card border-border shadow-lg">
                <CardHeader className="px-4 pt-4 pb-0"> {/* Padding bawah dihilangkan menjadi pb-0 */}
                  <CardTitle className="text-xl text-card-foreground">Informasi Umum Laboratorium</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0 pb-4 space-y-3"> {/* Padding atas dihilangkan menjadi pt-0 */}
                  <div>
                    <Label htmlFor="title" className="text-muted-foreground text-sm">Nama Laboratorium</Label>
                    <Input
                      id="title"
                      name="title"
                      value={labData.title} // Value bound to state
                      onChange={handleInputChange} // Use stable handler
                      readOnly={!!selectedLabId && !loading} // Jadi read-only setelah lab dipilih dan loading selesai
                      className="bg-background border-input text-foreground h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deskripsi" className="text-muted-foreground">Deskripsi Laboratorium</Label>
                    <Textarea
                      id="deskripsi"
                      name="deskripsi"
                      value={labData.deskripsi || ''} // Value bound to state
                      onChange={handleInputChange} // Use stable handler
                      rows={5}
                      className="bg-background border-input text-foreground text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* --- Gambar Utama Slider --- */}
              <Card className="mb-4 bg-card border-border shadow-lg">
                <CardHeader className="px-4 py-2 flex flex-row items-center justify-between space-y-0"> {/* Padding vertikal dikurangi */}
                  <CardTitle className="text-xl text-card-foreground">Foto Laboratorium</CardTitle>
                  <Button type="button" size="sm" onClick={addMainImageField} className="bg-primary text-primary-foreground hover:bg-primary/90"> {/* Menghapus mt-2 */}
                    <PlusCircle size={16} className="mr-1" /> Tambah Foto Laboratorium
                  </Button>
                </CardHeader>
                <CardContent className="px-4 py-2"> {/* Padding vertikal dikurangi, space-y-3 sudah dihapus sebelumnya */}
                  {/* Menggunakan grid untuk tata letak horizontal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {labData.mainImages.map((img, index) => (
                      <MainImageItem
                        key={img.id} // Crucial for list reconciliation
                        image={img} // Pass the image object
                        displayIndex={index} // Pass index for display
                        onFileChange={handleMainImageFileChange} // Pass stable handler
                        onAltChange={handleMainImageAltChange} // Pass stable handler
                        onRemove={removeMainImage} // Pass stable handler
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* --- Category Management --- */}
              <Card className="mb-4 bg-card border-border shadow-lg">
                <CardHeader className="px-4 py-2 flex flex-row items-center justify-between space-y-0"> {/* Padding vertikal dikurangi */}
                    <CardTitle className="text-xl text-card-foreground">Kategori Peralatan</CardTitle>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsManagingCategories(!isManagingCategories)}
                        className="text-primary border-primary hover:bg-primary/10"
                     >
                        <ListFilter size={16} className="mr-1" /> {isManagingCategories ? 'Kelola Peralatan' : 'Kelola Kategori'}
                    </Button>
                </CardHeader>
                <CardContent className="px-4 py-2 space-y-2"> {/* Padding vertikal dan space-y dikurangi */}
                    {isManagingCategories ? (
                        <>
                            <div className="flex space-x-2">
                                <Input
                                    placeholder="Nama Kategori Baru"
                                    value={newUserCategoryName}
                                    onChange={handleNewUserCategoryNameChange}
                                    className="flex-grow bg-background border-input text-foreground h-9 text-sm"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault(); // Prevent form submission
                                            handleAddUserCategory();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={handleAddUserCategory} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9">
                                    Tambah Kategori
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Daftar Kategori:</p>
                                {availableCategories.length === 0 && <p className="text-sm text-muted-foreground italic">Belum ada kategori tersedia.</p>}
                                {availableCategories.map(category => (
                                    <div key={category} className="flex items-center justify-between p-2 border border-border rounded-md bg-background">
                                        <span className="text-foreground">{category}</span>
                                        {/* Only show remove button for user-defined categories */}
                                        {!PREDEFINED_EQUIPMENT_CATEGORIES[selectedLabId as keyof typeof PREDEFINED_EQUIPMENT_CATEGORIES]?.includes(category) && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveUserCategory(category)}
                                                className="text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        null // Replaced commented out CardDescription with null to render nothing
                    )}
                </CardContent>
              </Card>


              {/* --- Peralatan Laboratorium --- */}
              {/* Only show equipment section if not managing categories */}
              {!isManagingCategories && (
                  <Card className="mb-4 bg-card border-border shadow-lg">
                    <CardHeader className="px-4 py-2"> {/* Padding vertikal dikurangi */}
                      <CardTitle className="text-xl text-card-foreground">Alat Laboratorium</CardTitle>
                       {/* Removed the global "Tambah Peralatan Baru" button here */}
                    </CardHeader>
                    <CardContent className="px-4 py-2 space-y-2"> {/* Padding vertikal dan space-y dikurangi */}
                      {availableCategories.length === 0 && (
                           <p className="text-sm text-destructive mt-2">Tambahkan kategori peralatan terlebih dahulu sebelum menambahkan peralatan.</p>
                       )}
                      {/* Display equipment grouped by category */}
                      {Object.entries(equipmentsByCategory).map(([category, equipmentList]) => (
                        <div key={category} className="border border-border rounded-md p-3 bg-muted/30">
                          <h3 className="text-lg font-medium mb-3 text-card-foreground flex justify-between items-center">
                             <span>{category || 'Tanpa Kategori'}</span>
                             {/* Add "Tambah Peralatan Baru" button per category */}
                             <Button
                                type="button"
                                size="sm"
                                onClick={() => addEquipment(category)} // Pass the category to the handler
                                className="bg-primary text-primary-foreground hover:bg-primary/90 ml-2 h-8"
                                disabled={!availableCategories.includes(category)} // Disable if category is not in available list (e.g. deleted)
                             >
                               <PlusCircle size={16} className="mr-1" /> Tambah Alat
                             </Button>
                          </h3>
                          <div className="space-y-4">
                            {equipmentList.length === 0 && <p className="text-sm text-muted-foreground italic">Belum ada peralatan dalam kategori ini.</p>}
                            {/* Map over equipment list within each category */}
                            {equipmentList.map((equipment, indexWithinCategory) => { // Use indexWithinCategory
                              return (
                                <EquipmentItem
                                  key={equipment.id} // Crucial for list reconciliation
                                  equipment={equipment} // Pass the equipment object (its reference changes only when name, desc, or category/icon are committed)
                                  equipmentIndexForDisplay={indexWithinCategory} // Pass indexWithinCategory for per-category numbering
                                  // availableCategories prop is no longer needed in EquipmentItem
                                  onEquipmentChangeById={handleEquipmentChangeById} // Pass stable handler (now called on blur/change)
                                  onRemoveById={removeEquipmentById} // Pass stable handler
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
              )}
              {/* --- Submit button --- */}
              <div className="mt-6 flex justify-end"> {/* Mengganti Card dan CardFooter dengan div */}
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4 py-2 text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent border-white rounded-full"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" /> Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
