// components/surat-kompensasi.tsx
'use client'

import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, PDFViewer, Image } from '@react-pdf/renderer';
import { Student, RekapKehadiran, Kompensasi } from '@/app/pages-mahasiswa/kompensasi/types/index';

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9, // Reduced font size
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 8,
  },
  logoContainer: {
    width: 20, // Reduced logo container width
  },
  logo: {
    marginLeft: 30,
    width: 100, // Reduced logo size
    height: 100,
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 12, // Reduced size
  },
  headerInfo: {
    fontSize: 9, // Reduced size
    lineHeight: 1.2, // Reduced line height
  },
  title: {
    fontWeight: 'bold',
    fontSize: 11, // Reduced size
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 3,
  },
  documentNumber: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 10,
  },
  introduction: {
    marginBottom: 8,
  },
  studentInfo: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2, // Reduced spacing
  },
  label: {
    width: 140, // Adjusted width
  },
  colon: {
    width: 8,
    textAlign: 'center',
  },
  value: {
    flex: 1,
  },
  kompensasiInfo: {
    marginBottom: 8,
  },
  table: {
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  tableHeaderCell: {
    padding: 4,
    textAlign: 'center',
    fontWeight: 'bold',
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  tableCell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#000',
    height: 180, // Taller rows to match the image
  },
  tableLastCell: {
    padding: 4,
    height: 60,
  },
  tableCol1: {
    width: '8%', // No column
  },
  tableCol2: {
    width: '15%', // Tanggal column
  },
  tableCol3: {
    width: '12%', // Jumlah column
  },
  tableCol4: {
    width: '40%', // Uraian pelaksanaan kompensasi
  },
  tableCol5: {
    width: '25%', // Nama & tanda tangan
  },
  signature: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 15,
  },
  signatureContent: {
    width: '40%',
    textAlign: 'center',
  },
  footerTable: {
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 10,
  },
  footerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  footerLastRow: {
    flexDirection: 'row',
  },
  footerHeaderCell: {
    padding: 4,
    textAlign: 'center',
    fontWeight: 'bold',
    flexWrap: 'wrap', // Tambahkan ini untuk wrap text
    // width: '25%', // Dihapus, akan diatur per kolom
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  footerCell: {
    padding: 4,
    height: 20, // Reduced height
    flexWrap: 'wrap', // Tambahkan ini untuk wrap text
    // width: '25%', // Dihapus, akan diatur per kolom
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  footerLastCell: {
    padding: 4,
    height: 20, // Reduced height
    flexWrap: 'wrap', // Tambahkan ini untuk wrap text
    // width: '25%', // Dihapus, akan diatur per kolom
  },
  locationContainer: {
    marginBottom: 8,
  },
  locationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

interface StudentData {
  student: Student;
  rekap: RekapKehadiran;
  kompensasi: Kompensasi;
  semesterKelasDisplay: string; // Tambahkan field ini
}

interface SuratKompensasiProps {
  studentsData: StudentData[];
  kompenInfo: any;
  dosenPA?: {
    nama: string;
    nip?: string;
  };
  ketuaJurusan?: {
    nama: string;
    nip: string;
  };
  sekretarisJurusan?: {
    nama: string;
  };
}

// Komponen untuk satu halaman surat kompensasi
const KompensasiPage = ({
  studentData,
  kompenInfo,
  dosenPA,
  ketuaJurusan,
  sekretarisJurusan,
  currentDate
}: {
  studentData: StudentData;
  kompenInfo: any;
  dosenPA: any;
  ketuaJurusan: any;
  sekretarisJurusan: any;
  currentDate: string;
}) => {
  const { student, rekap, kompensasi } = studentData;

  // Calculate compensation hours (1 hour = 50 minutes for school hour)
  const totalMenit = rekap.menit_tidak_hadir || 0;
  const jamSekolah = Math.floor(totalMenit / 50);
  const menitSisa = totalMenit % 50;

  return (
    <Page size="A4" style={styles.page}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image style={styles.logo} src="/logo-polsri.jpg" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>KEMENTERIAN PENDIDIKAN, KEBUDAYAAN</Text>
          <Text style={styles.headerTitle}>RISET, DAN TEKNOLOGI</Text>
          <Text style={styles.headerTitle}>POLITEKNIK NEGERI SRIWIJAYA</Text>
          <Text style={styles.headerTitle}>JURUSAN TEKNIK KIMIA</Text>
          <Text style={styles.headerInfo}>Jalan Srijaya Negara, PALEMBANG 30139</Text>
          <Text style={styles.headerInfo}>Telepon 0711-353414 Faksimili 0711-355918</Text>
          <Text style={styles.headerInfo}>Website : http://www.polsri.ac.id E-mail : info@polsri.ac.id</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>SURAT TUGAS KOMPENSASI KETIDAKHADIRAN</Text>
      <Text style={styles.subTitle}>
        SEMESTER {kompenInfo?.semester.toUpperCase() || "....."} TAHUN AKADEMIK {kompenInfo?.tahun_ajaran || "....."}
      </Text>
      <Text style={styles.documentNumber}>NOMOR : {kompenInfo?.nomor_surat || "....."}</Text>

      {/* Introduction */}
      <Text style={styles.introduction}>Politeknik Negeri Sriwijaya memberikan tugas khusus sebagai kompensasi kepada mahasiswa :</Text>

      {/* Student Information */}
      <View style={styles.studentInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nama</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{student.nama}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>NPM</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{student.nim}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Semester/Kelas</Text>
          <Text style={styles.colon}>:</Text>
          {/* Menggunakan semesterKelasDisplay yang sudah diproses */}
          <Text style={styles.value}>{studentData.semesterKelasDisplay}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Jurusan</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{"Teknik Kimia"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Program Studi</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{student.prodi || "D4 Manajemen Informatika"}</Text>
        </View>
      </View>

      {/* Kompensasi Information */}
      <View style={styles.kompensasiInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Yang bersangkutan tidak hadir</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{totalMenit} menit selama semester {kompenInfo?.semester || "....."} Tahun Akademik {kompenInfo?.tahun_ajaran || "....."}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Lama Kompensasi</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{totalMenit} menit, atau {jamSekolah} jam {menitSisa} menit sekolah</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Sekarang dikompensasi</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{totalMenit} menit, atau {jamSekolah} jam {menitSisa} menit sekolah</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Sisa</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>........ menit, atau ........ jam sekolah</Text>
        </View>
      </View>

      {/* Location info */}
      <View style={styles.locationContainer}>
        <View style={styles.locationIndicator}>
          <Text>Saudara melaksanakan kompensasi di bengkel/laboratorium/...........................................</Text>
          <Text style={{ textDecoration: 'underline' }}></Text>
          <Text> pada :</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Hari/tanggal</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>...........................................</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Pukul</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>08.00 wib s.d Selesai</Text>
        </View>
      </View>

      {/* Table with Jumlah column added */}
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={[styles.tableHeaderCell, styles.tableCol1]}>No</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCol2]}>Tanggal</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCol3]}>Jumlah</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCol4]}>Uraian pelaksanaan kompensasi</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCol5, { borderRightWidth: 0 }]}>Nama & tanda tangan</Text>
        </View>
        {/* Only one row to save space */}
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCol1]}></Text>
          <Text style={[styles.tableCell, styles.tableCol2]}></Text>
          <Text style={[styles.tableCell, styles.tableCol3]}></Text>
          <Text style={[styles.tableCell, styles.tableCol4]}></Text>
          <Text style={[styles.tableLastCell, styles.tableCol5]}></Text>
        </View>
      </View>

      {/* Signatures */}
      <View style={styles.signature}>
        <View style={styles.signatureContent}>
          <Text>Palembang, {currentDate}</Text>
          <Text style={{ marginTop: 3 }}>Ketua Jurusan,</Text>
          <Text style={{ marginTop: 30 }}>{ketuaJurusan.nama}</Text>
          <Text>NIP. {ketuaJurusan.nip}</Text>
        </View>
      </View>

      {/* Footer - Approval Section */}
      <View style={styles.footerTable}>
        <View style={styles.footerRow}>
          <Text style={[styles.footerHeaderCell, { width: '20%' }]}>Pengesahan Setelah Kompensasi</Text>
          <Text style={[styles.footerHeaderCell, { width: '20%' }]}>Mahasiswa</Text>
          <Text style={[styles.footerHeaderCell, { width: '30%' }]}>Pembimbing Akademik</Text>
          <Text style={[styles.footerHeaderCell, { width: '30%', borderRightWidth: 0 }]}>Sekretaris Jurusan</Text>
        </View>
        <View style={styles.footerRow}>
          <Text style={[styles.footerCell, { width: '20%' }]}>Nama</Text>
          <Text style={[styles.footerCell, { width: '20%' }]}>{student.nama}</Text>
          <Text style={[styles.footerCell, { width: '30%' }]}>{dosenPA.nama}</Text>
          <Text style={[styles.footerLastCell, { width: '30%', borderRightWidth: 0 }]}>{sekretarisJurusan.nama}</Text>
        </View>
        <View style={styles.footerRow}>
          <Text style={[styles.footerCell, { width: '20%' }]}>Tanggal</Text>
          <Text style={[styles.footerCell, { width: '20%' }]}></Text>
          <Text style={[styles.footerCell, { width: '30%' }]}></Text>
          <Text style={[styles.footerLastCell, { width: '30%', borderRightWidth: 0 }]}></Text>
        </View>
        <View style={styles.footerLastRow}>
          <Text style={[styles.footerCell, { width: '20%' }]}>Tanda Tangan</Text>
          <Text style={[styles.footerCell, { width: '20%' }]}></Text>
          <Text style={[styles.footerCell, { width: '30%' }]}></Text>
          <Text style={[styles.footerLastCell, { width: '30%', borderRightWidth: 0 }]}></Text>
        </View>
      </View>
    </Page>
  );
};

// PDF Document component untuk multiple mahasiswa
const KompensasiDocument = ({
  studentsData,
  kompenInfo,
  dosenPA = { nama: "___________" },
  ketuaJurusan = { nama: "Tahdid, S.T., M.T.", nip: "197201131997021001" },
  sekretarisJurusan = { nama: "Isnandar Yunanto, S.ST., M.T" }
}: SuratKompensasiProps) => {

  // Get current date in the same format
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <Document>
      {studentsData.map((studentData, index) => (
        <KompensasiPage
          key={`student-${studentData.student.id_mhs || index}`}
          studentData={studentData}
          kompenInfo={kompenInfo}
          dosenPA={dosenPA}
          ketuaJurusan={ketuaJurusan}
          sekretarisJurusan={sekretarisJurusan}
          currentDate={currentDate}
        />
      ))}
    </Document>
  );
};

interface SuratKompensasiComponentProps {
  studentsData: StudentData[];
  kompenInfo: any;
  dosenPA?: {
    nama: string;
    nip?: string;
  };
  showPreview?: boolean;
  className?: string;
}

const SuratKompensasiComponent: React.FC<SuratKompensasiComponentProps> = ({
  studentsData,
  kompenInfo,
  dosenPA,
  showPreview = false,
  className = ""
}) => {
  const kelas = studentsData.length > 0 ? studentsData[0].student.kelas : "";
  const fileName = `Kompensasi_Kelas_${kelas}.pdf`;

  return (
    <div className={`w-full ${className}`}>
      {showPreview ? (
        <div className="w-full h-screen">
          <PDFViewer width="100%" height="100%" className="border rounded">
            <KompensasiDocument
              studentsData={studentsData}
              kompenInfo={kompenInfo}
              dosenPA={dosenPA}
            />
          </PDFViewer>
        </div>
      ) : (
        <PDFDownloadLink
          document={
            <KompensasiDocument
              studentsData={studentsData}
              kompenInfo={kompenInfo}
              dosenPA={dosenPA}
            />
          }
          fileName={fileName}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 inline-flex items-center"
        >
          {({ blob, url, loading, error }) =>
            loading ? 'Menyiapkan dokumen...' : 'Unduh Surat Kompensasi'
          }
        </PDFDownloadLink>
      )}
    </div>
  );
};

export default SuratKompensasiComponent;