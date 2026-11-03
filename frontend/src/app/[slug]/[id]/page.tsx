"use client";
import { Suspense, use } from "react";
import DocumentView from "@/components/DocumentView";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense><DocumentView id={id} /></Suspense>;
}
