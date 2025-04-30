'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('curriculums', [
      {
        name: 'Kurikulum 2013 SDIT Darussalam 01 Batam',
        description: `
        Kerangka Dasar dan Struktur Kurikulum

        **Pengertian Kurikulum**  
        Kurikulum adalah seperangkat rencana dan pengaturan mengenai tujuan, isi, dan bahan pelajaran serta cara yang digunakan sebagai pedoman penyelenggaraan kegiatan pembelajaran untuk mencapai tujuan pendidikan tertentu.

        Berdasarkan pengertian tersebut, ada dua dimensi kurikulum, yaitu rencana dan pengaturan mengenai tujuan, isi, dan bahan pelajaran serta cara yang digunakan untuk kegiatan pembelajaran.

        **SDIT Darussalam 01 Batam Menggunakan Kurikulum 2013**  
        Kurikulum 2013 adalah kurikulum operasional yang disusun dan dilaksanakan oleh masing-masing satuan pendidikan. Kurikulum ini terdiri dari tujuan pendidikan tingkat satuan pendidikan, struktur dan muatan kurikulum, kalender pendidikan, dan silabus.

        **Kerangka Dasar Kurikulum**
        - **Landasan Filosofis:** Menentukan kualitas peserta didik, sumber dan isi kurikulum, proses pembelajaran, penilaian, dan hubungan peserta didik dengan masyarakat dan lingkungan.
        - **Landasan Teoritis:** Berdasarkan teori pendidikan berbasis standar dan teori kurikulum berbasis kompetensi.
        - **Landasan Yuridis:** Berdasarkan undang-undang dan peraturan pemerintah.

        **Struktur Kurikulum**
        - **Kompetensi Inti:** Disusun seiring peningkatan usia peserta didik.
        - **Mata Pelajaran:** Disusun berdasarkan kompetensi inti dan karakteristik satuan pendidikan.
        - **Beban Belajar:** Seluruh kegiatan yang harus diikuti siswa dalam satu minggu, semester, dan tahun ajaran.

        **Muatan Kurikulum**
        - **Muatan Pembelajaran Kurikulum 2013:** Tematik terpadu dari kelas 1–6, kecuali Pendidikan Agama dan Budi Pekerti.
        - **Muatan Lokal:** Kegiatan kurikuler yang disesuaikan dengan ciri khas dan potensi daerah.

        **Kesiswaan**
        - Ekstrakurikuler Wajib: Pendidikan Kepramukaan.
        - Ekstrakurikuler Pilihan: Sepak Bola, Takraw, Volly, Pencak Silat, Catur, Pantomim, Menari, Mewarnai, Memasak, Docil, Dai Cilik, Tahfizh.

        **Program Unggulan SDIT Darussalam**
        - **Program Akselerasi Tahfizh**
        - **Program Ekstrakurikuler**
        - **Program Iqro/Al-Qur’an**
        - **Program Pemantapan**
        - **Program Motivasi Kelas VI**
        - **Program Edugame Kelas VI**
        - **Program Kelas Unggulan**
        - **Program Islam Terpadu:** Shalat Dhuha, Tahfizh, Praktek Ibadah, Qishos, Hapalan Do’a
        - **Program Darussalam Juara**
        `,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('curriculums', null, {});
  }
};
