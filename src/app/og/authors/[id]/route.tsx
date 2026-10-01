import { getUserInfo } from "@/lib/api/serverApi";
import { renderContentOgImage, renderSiteOgImage } from "@/lib/og/ogImage";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;

  try {
    const user = await getUserInfo(id);
    const articles = `${user.articlesAmount} published ${user.articlesAmount === 1 ? "article" : "articles"}`;

    return await renderContentOgImage({
      kicker: "Author",
      title: user.name,
      subtitle: articles,
      avatar: user.avatarUrl,
    });
  } catch {
    return renderSiteOgImage();
  }
}
