import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Award, BookmarkCheck, BookmarkX, BookOpen, Download, Flame, GraduationCap, TimerReset } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { removeSavedCourseAction } from "@/lib/academy-actions";
import { getAcademyTranscriptData } from "@/lib/academy-transcript-data";
import { getAcademyHomeData, getDashboardData } from "@/lib/queries";
import { getPreferredLocale, type SupportedLocale } from "@/lib/user-preferences";

export const metadata = {
  title: "Academy"
};

export const dynamic = "force-dynamic";

function statusLabel(status: string, locale: SupportedLocale) {
  if (locale !== "id") {
    return status.replaceAll("_", " ");
  }

  const labels: Record<string, string> = {
    active: "aktif",
    completed: "selesai",
    enrolled: "terdaftar",
    pending: "menunggu"
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

export default async function DashboardAcademyPage() {
  const user = await requireUser("/dashboard/academy");
  const [data, transcript, academyHome, locale] = await Promise.all([
    getDashboardData(user.id),
    getAcademyTranscriptData(user.id),
    getAcademyHomeData(user.id),
    getPreferredLocale()
  ]);
  const isIndonesian = locale === "id";
  const numberLocale = isIndonesian ? "id-ID" : "en-US";
  const enrollments = data.academy.enrollments;
  const savedCourses = data.academy.savedCourses;
  const enrolledCourseSlugs = new Set(enrollments.map((enrollment) => enrollment.courseSlug));
  const availableCourses = academyHome.courses.filter((course) => !enrolledCourseSlugs.has(course.slug)).slice(0, 3);
  const labels =
    isIndonesian
      ? {
          eyebrow: "Academy",
          title: "Perjalanan belajar dan kredensialmu",
          subtitle: "Lanjutkan kursus yang sedang berjalan, lihat progres, dan kelola sertifikat sebelum mencari materi baru.",
          browseAcademy: "Jelajahi Academy",
          currentStreak: "Streak saat ini",
          longestStreak: "Streak terpanjang",
          days: "hari",
          completed: "Selesai",
          certificates: "Sertifikat",
          enrollments: "Perjalanan belajar",
          enrollmentsBody: "Kursus aktif dan selesai, lengkap dengan langkah berikutnya.",
          status: "Status",
          complete: "selesai",
          next: "Berikutnya",
          minRemaining: "menit tersisa",
          readyCertificate: "Siap untuk review sertifikat",
          continueCourse: "Lanjutkan kursus",
          transcriptPdf: "PDF transkrip",
          noActive: "Belum ada kursus aktif.",
          noActiveBody: "Mulai kursus untuk membangun pengetahuan konservasi dan menambahkan catatan pembelajaran ke Impact Passport.",
          browseRecommended: "Jelajahi kursus rekomendasi",
          certificateBody: "Kredensial yang sudah diterbitkan dari kursus yang memenuhi syarat.",
          issued: "Diterbitkan",
          viewCertificate: "Lihat sertifikat",
          certificatePdf: "PDF sertifikat",
          noCertificate: "Belum ada sertifikat terverifikasi.",
          noCertificateBody: "Selesaikan kursus Academy yang memenuhi syarat untuk mendapatkan kredensial pertama.",
          findCertificateCourses: "Cari kursus bersertifikat",
          exploreEyebrow: "Langkah belajar berikutnya",
          coursesJoin: "Kursus yang bisa kamu ikuti",
          coursesJoinBody: "Pilih materi baru setelah kursus aktifmu terkendali.",
          viewCatalog: "Lihat katalog",
          open: "Buka",
          savedCourses: "Kursus tersimpan",
          savedCourse: "kursus tersimpan",
          readyRevisit: "siap dibuka kembali.",
          browseCatalog: "Jelajahi katalog",
          credentialPath: "jam jalur kredensial",
          saved: "Disimpan",
          removeSaved: "Hapus kursus tersimpan",
          openCourse: "Buka kursus",
          noSaved: "Belum ada kursus tersimpan.",
          noSavedBody: "Simpan kursus dari katalog Academy untuk membangun antrean belajar pribadi.",
          browseCourses: "Jelajahi kursus"
        }
      : {
          eyebrow: "Academy",
          title: "Your learning journey and credentials",
          subtitle: "Continue active courses, review progress, and manage certificates before discovering new material.",
          browseAcademy: "Browse academy",
          currentStreak: "Current streak",
          longestStreak: "Longest streak",
          days: "days",
          completed: "Completed",
          certificates: "Certificates",
          enrollments: "Learning journey",
          enrollmentsBody: "Active and completed courses, with the next step made explicit.",
          status: "Status",
          complete: "complete",
          next: "Next",
          minRemaining: "min remaining",
          readyCertificate: "Ready for certificate review",
          continueCourse: "Continue course",
          transcriptPdf: "Transcript PDF",
          noActive: "No active courses yet.",
          noActiveBody: "Start a course to build field-ready conservation knowledge and add learning records to your Impact Passport.",
          browseRecommended: "Browse recommended courses",
          certificateBody: "Credentials already issued from eligible courses.",
          issued: "Issued",
          viewCertificate: "View certificate",
          certificatePdf: "Certificate PDF",
          noCertificate: "No verified certificates yet.",
          noCertificateBody: "Complete an eligible Academy course to earn your first credential.",
          findCertificateCourses: "Find certificate courses",
          exploreEyebrow: "Your next learning step",
          coursesJoin: "Courses you can join",
          coursesJoinBody: "Choose new material after your active learning is under control.",
          viewCatalog: "View catalog",
          open: "Open",
          savedCourses: "Saved courses",
          savedCourse: "saved course",
          readyRevisit: "ready to revisit.",
          browseCatalog: "Browse catalog",
          credentialPath: "hour credential path",
          saved: "Saved",
          removeSaved: "Remove saved course",
          openCourse: "Open course",
          noSaved: "No saved courses yet.",
          noSavedBody: "Save courses from the Academy catalog to build a personal learning queue.",
          browseCourses: "Browse courses"
        };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">{labels.subtitle}</p>
        </div>
        <ButtonLink href="/academy">{labels.browseAcademy}</ButtonLink>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [labels.currentStreak, `${transcript.currentStreakDays.toLocaleString(numberLocale)} ${labels.days}`, Flame],
          [labels.longestStreak, `${transcript.longestStreakDays.toLocaleString(numberLocale)} ${labels.days}`, TimerReset],
          [labels.completed, transcript.completedCourses.toLocaleString(numberLocale), GraduationCap],
          [labels.certificates, transcript.certificatesEarned.toLocaleString(numberLocale), Award]
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="min-w-0 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <Icon size={22} aria-hidden="true" className="text-coral-500" />
            <MetricValue className="mt-4 text-ocean-900">{value as string}</MetricValue>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{label as string}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div id="enrollments" className="scroll-mt-24 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
            <BookOpen size={22} aria-hidden="true" className="text-coral-500" />
            {labels.enrollments}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ocean-900/58">{labels.enrollmentsBody}</p>
          <div className="mt-5 grid gap-3">
            {enrollments.map((enrollment) => (
              <article key={enrollment.courseSlug} className="rounded-xl bg-sand-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ocean-900">{enrollment.courseTitle}</h3>
                    <p className="mt-1 text-sm text-ocean-900/58">
                      {statusLabel(enrollment.status, locale)} · {enrollment.progressPercent}% {labels.complete}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900/62">
                    {enrollment.completedLessons}/{Math.max(1, enrollment.totalLessons)}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-kelp-500" style={{ width: `${Math.min(100, Math.max(0, enrollment.progressPercent))}%` }} />
                </div>
                <p className="mt-2 text-xs font-semibold text-ocean-900/54">
                  {enrollment.nextLessonTitle
                    ? `${labels.next}: ${enrollment.nextLessonTitle}`
                    : enrollment.remainingMinutes > 0
                      ? `${enrollment.remainingMinutes.toLocaleString(numberLocale)} ${labels.minRemaining}`
                      : labels.readyCertificate}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href={`/academy/courses/${enrollment.courseSlug}`} className="inline-flex text-sm font-bold text-coral-700">
                    {labels.continueCourse}
                  </Link>
                  <Link href={`/dashboard/academy/transcript/${enrollment.courseSlug}/download`} className="inline-flex items-center gap-1 text-sm font-bold text-ocean-700" download>
                    <Download size={15} aria-hidden="true" />
                    {labels.transcriptPdf}
                  </Link>
                </div>
              </article>
            ))}
            {enrollments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">{labels.noActive}</p>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">{labels.noActiveBody}</p>
                <Link href="/academy" className="mt-3 inline-flex text-sm font-bold text-coral-700">
                  {labels.browseRecommended}
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div id="certificates" className="scroll-mt-24 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
            <Award size={22} aria-hidden="true" className="text-coral-500" />
            {labels.certificates}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ocean-900/58">{labels.certificateBody}</p>
          <div className="mt-5 grid gap-3">
            {data.certificates.map((certificate) => (
              <article key={certificate.certificateNumber} className="rounded-xl border border-kelp-100 bg-kelp-100/40 p-4">
                <h3 className="font-bold text-ocean-900">{certificate.courseTitle}</h3>
                <p className="mt-1 text-sm font-semibold text-kelp-700">{certificate.certificateNumber}</p>
                <p className="mt-1 text-sm text-ocean-900/58">
                  {labels.issued} {certificate.issuedAt.toLocaleDateString(numberLocale, { dateStyle: "medium" })}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href={`/certificates/verify/${certificate.publicSlug}`} className="inline-flex text-sm font-bold text-coral-700">
                    {labels.viewCertificate}
                  </Link>
                  <Link href={`/certificates/verify/${certificate.publicSlug}/download`} className="inline-flex items-center gap-1 text-sm font-bold text-ocean-700" download>
                    <Download size={15} aria-hidden="true" />
                    {labels.certificatePdf}
                  </Link>
                </div>
              </article>
            ))}
            {data.certificates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">{labels.noCertificate}</p>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">{labels.noCertificateBody}</p>
                <Link href="/academy" className="mt-3 inline-flex text-sm font-bold text-coral-700">
                  {labels.findCertificateCourses}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.exploreEyebrow}</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{labels.coursesJoin}</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{labels.coursesJoinBody}</p>
          </div>
          <ButtonLink href="/academy#course-catalog" tone="secondary">
            {labels.viewCatalog}
          </ButtonLink>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {availableCourses.map((course) => (
            <Link key={course.slug} href={`/academy/courses/${course.slug}`} className="group overflow-hidden rounded-xl border border-ocean-900/10 bg-sand-50 transition hover:border-coral-500">
              <div className="relative aspect-[16/9] bg-ocean-900">
                {course.imageUrl ? <Image src={course.imageUrl} alt="" fill className="object-cover transition group-hover:scale-[1.02]" sizes="(min-width: 1024px) 300px, 100vw" /> : null}
              </div>
              <div className="grid gap-2 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{course.topic}</p>
                <h3 className="text-base font-bold leading-6 text-ocean-900 group-hover:text-coral-700">{course.title}</h3>
                <p className="line-clamp-2 text-sm leading-6 text-ocean-900/62">{course.summary}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-ocean-900/62">
                  <span>{course.level}</span>
                  <span className="inline-flex items-center gap-1 text-coral-700">
                    {labels.open} <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="saved-courses" className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
              <BookmarkCheck size={22} aria-hidden="true" className="text-coral-500" />
              {labels.savedCourses}
            </h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
              {savedCourses.length.toLocaleString(numberLocale)} {labels.savedCourse}{savedCourses.length === 1 || isIndonesian ? "" : "s"} {labels.readyRevisit}
            </p>
          </div>
          <ButtonLink href="/academy#course-catalog" tone="ghost" className="border border-ocean-900/10">
            {labels.browseCatalog}
          </ButtonLink>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {savedCourses.map((course) => (
            <article key={course.slug} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-ocean-900">{course.title}</h3>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {course.level} · {Math.max(1, Math.round(course.durationMinutes / 60)).toLocaleString(numberLocale)} {labels.credentialPath}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ocean-900/62">{course.summary}</p>
                  <p className="mt-2 text-xs font-semibold text-ocean-900/50">
                    {labels.saved} {course.savedAt.toLocaleDateString(numberLocale, { dateStyle: "medium" })}
                  </p>
                </div>
                <form action={removeSavedCourseAction}>
                  <input type="hidden" name="courseSlug" value={course.slug} />
                  <input type="hidden" name="next" value="/dashboard/academy" />
                  <Button type="submit" tone="ghost" className="min-h-10 border border-ocean-900/10 px-3">
                    <BookmarkX size={16} aria-hidden="true" />
                    <span className="sr-only">{labels.removeSaved}</span>
                  </Button>
                </form>
              </div>
              <Link href={`/academy/courses/${course.slug}`} className="mt-3 inline-flex text-sm font-bold text-coral-700">
                {labels.openCourse}
              </Link>
            </article>
          ))}
          {savedCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 md:col-span-2">
              <p className="font-bold text-ocean-900">{labels.noSaved}</p>
              <p className="mt-2 text-sm leading-6 text-ocean-900/62">{labels.noSavedBody}</p>
              <Link href="/academy#course-catalog" className="mt-3 inline-flex text-sm font-bold text-coral-700">
                {labels.browseCourses}
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
