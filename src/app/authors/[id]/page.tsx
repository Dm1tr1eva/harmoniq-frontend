import { notFound } from "next/navigation";
import { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { ARTICLES_PER_PAGE } from "./constants";
import { getUserInfo, getUserArticles } from "@/lib/api/serverApi";
import { getCurrentUserServer } from "./getCurrentUserServer";
import getQueryClient from "@/lib/api/getQueryClient";
import { buildSocialMetadata } from "@/lib/metadata";
import AuthorInfo from "@/components/AuthorInfo/AuthorInfo";
import AuthorArticlesSection from "./AuthorArticlesSection";
import css from "./page.module.css";

type AuthorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getUserOrNotFound(id: string) {
  try {
    return await getUserInfo(id);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getUserOrNotFound(id);

  const title = `${user.name} — Harmoniq`;
  const description = `${user.name}'s public profile on Harmoniq: ${user.articlesAmount} published articles.`;

  return {
    title,
    description,
    ...buildSocialMetadata({
      title,
      description,
      path: `/authors/${id}`,
      image: `/og/authors/${id}`,
      type: "profile",
    }),
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { id } = await params;

  const user = await getUserOrNotFound(id);

  const queryClient = getQueryClient();

  const currentUser = await getCurrentUserServer();
  queryClient.setQueryData(["me"], currentUser);

  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ["authorArticles", id],
      queryFn: () => getUserArticles(id, { page: 1, perPage: ARTICLES_PER_PAGE }),
      initialPageParam: 1,
    });
  } catch {
  }

  return (
    <div className={css.page}>
      <div className="container">
        <AuthorInfo user={user} />

        <HydrationBoundary state={dehydrate(queryClient)}>
          <AuthorArticlesSection authorId={id} authorName={user.name} />
        </HydrationBoundary>
      </div>
    </div>
  );
}
