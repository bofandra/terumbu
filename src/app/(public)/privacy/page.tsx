import { getPreferredLocale } from "@/lib/user-preferences";

export const metadata = {
  title: "Privacy Policy | Kebijakan Privasi"
};

export default async function PrivacyPage() {
  const locale = await getPreferredLocale();
  const id = locale === "id";
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-normal text-ocean-900">
        {id ? "Kebijakan privasi" : "Privacy policy"}
      </h1>
      <div className="mt-6 space-y-6 text-sm leading-7 text-ocean-900/70">
        <p>
          {id
            ? "Terumbu menyimpan data akun, donasi, pemesanan, kursus, sertifikat, dan Impact Passport untuk menjalankan layanan serta alur operasional mitra."
            : "Terumbu stores account, donation, booking, course, certificate, and Impact Passport data to operate its services and partner workflows."}
        </p>

        <section aria-labelledby="inquiry-privacy">
          <h2 id="inquiry-privacy" className="text-lg font-bold text-ocean-900">
            {id ? "Pertanyaan dan permintaan ekspedisi" : "Expedition questions and requests"}
          </h2>
          <p className="mt-2">
            {id
              ? "Ketika Anda bertanya atau mengajukan permintaan perjalanan, kami mencatat nama, alamat email, jumlah peserta, tanggal yang diminta (jika diisi), isi pesan, dan ekspedisi yang dituju. Admin Terumbu dan mitra yang berwenang untuk ekspedisi terkait dapat menggunakan data ini untuk menjawab pertanyaan dan menindaklanjuti permintaan. Jika Anda tidak memiliki akun, mitra dapat membalas langsung ke alamat email yang Anda berikan."
              : "When you ask about a trip, we collect your name, email address, party size, any preferred date and message, and the expedition concerned. Authorized Terumbu administrators and the relevant expedition partner can use these details to respond and follow up. If you do not have an account, the host may reply directly to the email address you provide."}
          </p>
          <p className="mt-2">
            {id
              ? "Menyetujui dihubungi bukan berarti memesan tempat atau melakukan pembayaran. Permintaan disimpan untuk pengelolaan tindak lanjut dan jejak operasional; data kontaknya tidak ditampilkan pada halaman ekspedisi publik."
              : "Agreeing to contact does not reserve seats, create a booking, or authorize payment. Inquiry records are retained for follow-up and operational history; contact details are not displayed on public expedition pages."}
          </p>
        </section>

        <section aria-labelledby="access-privacy">
          <h2 id="access-privacy" className="text-lg font-bold text-ocean-900">
            {id ? "Akses dan pengaturan privasi" : "Access and privacy controls"}
          </h2>
          <p className="mt-2">
            {id
              ? "Data dashboard privat hanya tersedia untuk pengguna yang telah masuk dan peran operasional yang memiliki wewenang. Impact Passport ditampilkan secara publik atau melalui tautan hanya jika pengguna memilih visibilitas tersebut."
              : "Private dashboard data is accessible only to signed-in users and authorized operational roles. Impact Passport information appears publicly or via a link only when the user chooses that visibility."}
          </p>
          <p className="mt-2">
            {id
              ? "Integrasi email, analitik, penyimpanan, dan pembayaran menggunakan layanan yang dikonfigurasi untuk lingkungan aplikasi. Untuk pertanyaan tentang data pribadi Anda, hubungi tim Terumbu melalui kanal dukungan resmi yang tercantum di situs."
              : "Email, analytics, storage, and payment integrations use services configured for the application environment. For questions about your personal data, contact Terumbu using the official support channels listed on this site."}
          </p>
        </section>
      </div>
    </div>
  );
}
