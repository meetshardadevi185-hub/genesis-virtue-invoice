"use client";
import { use } from "react";
import DocumentEditor from "@/components/DocumentEditor";

export default function Page({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  return <DocumentEditor id={id} slug={slug} />;
}
