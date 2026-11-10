import { redirect } from "next/navigation";

export default async function ArticlesRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/artikel/${slug}`);
}
