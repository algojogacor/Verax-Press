// Komponen server aman untuk menyematkan JSON-LD Schema.org pada dokumen HTML.
import { sanitizeJsonLd } from "@/lib/seo/structured-data";

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(data) }}
    />
  );
}
