"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import DocumentList from "@/components/DocumentList";
import { slugToType } from "@/lib/config";

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const type = slugToType(slug);
  if (!type) notFound();
  return <DocumentList type={type} />;
}
