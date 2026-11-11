import { permanentRedirect } from "next/navigation";

export default async function ArticlesRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/artikel/${slug}`);
}
