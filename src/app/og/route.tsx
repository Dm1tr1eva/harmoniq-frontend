import { renderSiteOgImage } from "@/lib/og/ogImage";

// Картинка не залежить від запиту — генерується один раз на білді
export const dynamic = "force-static";

export function GET() {
  return renderSiteOgImage();
}
