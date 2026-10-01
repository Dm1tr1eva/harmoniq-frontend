import { randomInt } from "node:crypto";
import { cache } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { isAxiosError } from "axios";

import {
  getArticleById,
  getArticles,
  getUserInfo,
} from "@/lib/api/serverApi";
import { buildSocialMetadata } from "@/lib/metadata";

import type { Article } from "@/types/article";

import ArticleSaveButton from "./ArticleSaveButton";
import styles from "./page.module.css";

type ArticlePageProps = {
  params: Promise<{
    id: string;
  }>;
};

// cache(): без цього generateMetadata і сама сторінка робили б два окремих
// запити до бекенду за той самий article — axios не дедуплюється Next.js
// автоматично так, як голий fetch
const getArticleOrNotFound = cache(async (id: string) => {
  try {
    return await getArticleById(id);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }
    throw error;
  }
});

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleOrNotFound(id);

  const title = `${article.title} — Harmoniq`;
  const description = article.desc;

  return {
    title,
    description,
    ...buildSocialMetadata({
      title,
      description,
      path: `/articles/${id}`,
      image: `/og/articles/${id}`,
      type: "article",
    }),
  };
}

type ArticleOwner = {
  _id: string;
  name: string;
  avatarUrl: string | null;
};

type Recommendation = {
  article: Article;
  author: ArticleOwner | null;
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}.${month}.${year}`;
}

function getRandomItems<T>(items: T[], count: number): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = randomInt(i + 1);

    [copy[i], copy[randomIndex]] = [
      copy[randomIndex],
      copy[i],
    ];
  }

  return copy.slice(0, count);
}

export default async function ArticlePage({
  params,
}: ArticlePageProps) {
  const { id } = await params;

  const article = await getArticleOrNotFound(id);

  const owner = article.ownerId as string | ArticleOwner | null;

  let author: ArticleOwner | null = null;

  if (typeof owner === "string") {
    try {
      author = await getUserInfo(owner);
    } catch {
      author = null;
    }
  } else if (owner) {
    author = owner;
  }

  let recommendations: Recommendation[] = [];

  try {
    const articlesResponse = await getArticles({
      page: 1,
      perPage: 20,
    });

    const availableRecommendations =
      articlesResponse.articles.filter(
        (item) => item._id !== article._id,
      );

    const recommendationArticles = getRandomItems(
      availableRecommendations,
      3,
    );

    recommendations = await Promise.all(
      recommendationArticles.map(async (item) => {
        const recommendationOwner = item.ownerId as
          | string
          | ArticleOwner
          | null;

        let recommendationAuthor: ArticleOwner | null = null;

        if (typeof recommendationOwner === "string") {
          try {
            recommendationAuthor =
              await getUserInfo(recommendationOwner);
          } catch {
            recommendationAuthor = null;
          }
        } else if (recommendationOwner) {
          recommendationAuthor = recommendationOwner;
        }

        return {
          article: item,
          author: recommendationAuthor,
        };
      }),
    );
  } catch {
    recommendations = [];
  }

  const paragraphs = article.article
    .split(/\/n|\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{article.title}</h1>

  <Image
    className={styles.heroImage}
    src={article.img}
    alt={article.title}
    width={1226}
    height={624}
    sizes="(max-width: 767px) 361px, (max-width: 1439px) 704px, 1226px"
  />

      <div className={styles.content}>
        <div className={styles.articleText}>
          {paragraphs.map((paragraph, index) => (
            <p key={`${article._id}-${index}`}>
              {paragraph}
            </p>
          ))}
        </div>

        <aside className={styles.sidebarWrapper}>
          <div className={styles.sidebar}>
            <p className={styles.metaRow}>
              <strong>Author:</strong>{" "}
              {author ? (
                <Link
                  href={`/authors/${author._id}`}
                  className={styles.authorLink}
                >
                  {author.name}
                </Link>
              ) : (
                <span>Unknown author</span>
              )}
            </p>

            <p className={styles.metaRow}>
              <strong>Publication date:</strong>{" "}
              {formatDate(article.date)}
            </p>

            {recommendations.length > 0 && (
              <>
                <h2 className={styles.recommendationsTitle}>
                  You can also interested
                </h2>

                <div className={styles.recommendations}>
                  {recommendations.map(
                    ({ article: item, author: itemAuthor }) => (
                      <article
                        key={item._id}
                        className={styles.recommendationCard}
                      >
                        <div
                          className={styles.recommendationContent}
                        >
                          <h3
                            className={styles.recommendationTitle}
                          >
                            {item.title}
                          </h3>

                          <p
                            className={styles.recommendationAuthor}
                          >
                            {itemAuthor?.name ?? "Unknown author"}
                          </p>
                        </div>

                        <Link
                          href={`/articles/${item._id}`}
                          className={styles.arrowButton}
                          aria-label={`Open article ${item.title}`}
                        >
                          <svg
                            className={styles.arrowIcon}
                            aria-hidden="true"
                            focusable="false"
                          >
                            <use href="/sprite.svg#icon-Genericarrow-up-right-small" />
                          </svg>
                        </Link>
                      </article>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          <ArticleSaveButton articleId={article._id} />
        </aside>
      </div>
    </div>
  );
}