import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PosterTemplate from "@/components/PosterTemplate";
import { verifyPosterToken } from "@/lib/poster-render";
import { localAsBase64, resolvePhoto } from "@/lib/poster-assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PosterRenderPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return notFound();

  let data;
  try {
    data = await verifyPosterToken(token);
  } catch {
    return notFound();
  }

  const [photoUrl, unnLogo, nacosLogo, starImg] = await Promise.all([
    resolvePhoto(data.photo_url),
    localAsBase64("unn.png", "image/png"),
    localAsBase64("nacos.png", "image/png"),
    localAsBase64("star.png", "image/png"),
  ]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Arapey:ital@0;1&family=Alex+Brush&family=Inter:wght@400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #ffffff; font-family: "Arapey", Georgia, serif; }
        body { width: 1080px; height: 1500px; overflow: hidden; }
        nextjs-portal, [data-nextjs-dialog-overlay], [data-next-mark] { display: none !important; }
      `}</style>
      <PosterTemplate
        data={data}
        photoUrl={photoUrl}
        unnLogoUrl={unnLogo}
        nacosLogoUrl={nacosLogo}
        starUrl={starImg}
      />
    </>
  );
}
