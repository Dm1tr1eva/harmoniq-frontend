import { getArticleById, getUserInfo } from "@/lib/api/serverApi";
import { renderContentOgImage, renderSiteOgImage } from "@/lib/og/ogImage";

type Context = { params: Promise<{ id: string }> };

async function getOwnerName(ownerId: Awaited<ReturnType<typeof getArticleById>>["ownerId"]) {
  if (!ownerId) return undefined;
  if (typeof ownerId === "object") return ownerId.name;
  return getUserInfo(ownerId)
    .then((user) => user.name)
    .catch(() => undefined);
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;

  try {
    const article = await getArticleById(id);
    const ownerName = await getOwnerName(article.ownerId);

    return await renderContentOgImage({
      kicker: "Article",
      title: article.title,
      subtitle: ownerName ? `by ${ownerName}` : undefined,
      image: article.img,
    });
  } catch {
    // Краулер соцмережі не повинен отримати биту картинку через збій бекенду
    return renderSiteOgImage();
  }
}
