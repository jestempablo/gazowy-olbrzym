"use client";

import dynamic from "next/dynamic";
const Page = dynamic(() => import("./components/Page"), { ssr: false });

export default function NewHome() {
  return <Page />;
}
