import { Suspense } from "react";
import HomeClient from "./_home-client";

export const dynamic = "force-dynamic"; // opcional: evita SSG si usas search params

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomeClient />
    </Suspense>
  );
}
