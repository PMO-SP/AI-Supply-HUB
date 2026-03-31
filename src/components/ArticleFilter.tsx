"use client";

import useSWR from "swr";
import type { Article } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ArticleFilterProps {
  selectedArticleId: string;
  onSelect: (articleId: string) => void;
}

export default function ArticleFilter({
  selectedArticleId,
  onSelect,
}: ArticleFilterProps) {
  const { data } = useSWR("/api/articles", fetcher);
  const articles: Article[] = data?.data || [];

  return (
    <select
      value={selectedArticleId}
      onChange={(e) => onSelect(e.target.value)}
      className="text-[11px] px-2.5 py-[5px] border border-gray-300 rounded-md bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red"
    >
      <option value="">Alle Artikel</option>
      {articles.map((a) => (
        <option key={a.article_id} value={a.article_id}>
          {a.article_name} ({a.article_id})
        </option>
      ))}
    </select>
  );
}
