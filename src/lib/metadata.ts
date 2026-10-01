import type { Metadata } from "next";

export const SITE_NAME = "Harmoniq";

// Соцмережі приймають лише абсолютні URL у og:image / og:url — metadataBase
// дописує домен до відносних шляхів. SITE_URL без NEXT_PUBLIC_: метадані
// збираються лише на сервері
export const SITE_URL = new URL(
  process.env.SITE_URL ?? "https://project-first-team-01-front-end.vercel.app",
);

const OG_IMAGE_SIZE = { width: 1200, height: 630 };

type SocialMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  // Шлях до route handler-а з app/og, який малює брендовану картинку
  image?: string;
  type?: "website" | "article" | "profile";
};

// Next мерджить метадані сегментів поверхнево: openGraph сторінки повністю
// замінює openGraph з layout. Тому siteName, дефолтна картинка і twitter
// збираються тут, а не покладаються на успадкування
export function buildSocialMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: SocialMetadataOptions): Pick<Metadata, "openGraph" | "twitter"> {
  const images = [{ url: image ?? "/og", alt: title, ...OG_IMAGE_SIZE }];

  return {
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}
