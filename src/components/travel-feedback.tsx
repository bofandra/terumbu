export function TravelFeedback({ error, saved, id }: { error?: string; saved?: string; id: boolean }) {
  const messages: Record<string, [string, string]> = {
    "message": ["Write a message of 1–4,000 characters.", "Tulis pesan sepanjang 1–4.000 karakter."],
    "departure": ["Choose a future open departure with enough seats.", "Pilih keberangkatan mendatang yang tersedia."],
    "permission": ["Your account cannot perform this action.", "Akunmu tidak dapat melakukan tindakan ini."],
    "closed": ["This request has already been processed or closed.", "Permintaan sudah diproses atau ditutup."],
    "capacity": ["The requested seats are no longer available. Your existing booking is unchanged.", "Kursi yang diminta tidak lagi tersedia. Booking awalmu tetap berlaku."],
    "participants": ["Enter one full name per traveler, matching the requested count (1–12).", "Isi satu nama lengkap per baris sesuai jumlah peserta (1–12)."],
    "emergency-contact": ["Add a contact name and phone number for every traveler (7–220 characters).", "Isi nama dan nomor telepon kontak darurat untuk setiap peserta (7–220 karakter)."],
    "preparation": ["Preparation is available for confirmed, paid trips before departure.", "Persiapan tersedia untuk booking terkonfirmasi dan dibayar sebelum keberangkatan."],
    "pending-change": ["Finish or cancel your pending change before requesting another.", "Selesaikan atau batalkan permintaan perubahan yang masih menunggu."],
    "quote-not-accepted": ["The traveler must accept the price quote first.", "Peserta perlu menyetujui penawaran harga terlebih dahulu."],
    "adjustment-required": ["Finance must verify the additional payment or refund before approval.", "Admin perlu memverifikasi pembayaran tambahan atau refund sebelum persetujuan."],
    "adjustment": ["A platform admin must enter a valid reconciliation reference after verifying the adjustment.", "Admin Platform perlu memasukkan referensi rekonsiliasi setelah memverifikasi penyesuaian."],
    "stale-change": ["This booking changed or can no longer be modified. Contact your host.", "Booking berubah atau tidak dapat diubah lagi. Hubungi host."],
    "decision": ["Explain the decision in 5–1,000 characters.", "Jelaskan keputusan dalam 5–1.000 karakter."],
    "change": ["Check the departure, participant names, and reason. Only confirmed, paid trips can be changed before departure.", "Periksa keberangkatan, nama peserta, dan alasan. Perubahan tersedia sebelum keberangkatan untuk booking terkonfirmasi dan dibayar."]
  };
  return <>{saved && <p role="status" className="rounded-xl bg-kelp-100 p-4 text-kelp-700">{id ? "Perubahan tersimpan." : "Changes saved."}</p>}
    {error && <p role="alert" className="rounded-xl bg-coral-100 p-4 text-coral-700">{(messages[error] ?? ["The request could not be completed.", "Permintaan tidak dapat diselesaikan."])[id ? 1 : 0]}</p>}</>;
}
