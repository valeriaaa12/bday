// src/app/_home-client.tsx  (Client Component que usa useSearchParams)
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BoxSplash from "@/components/BoxSplash";
import Main from "@/components/main";

export default function HomeClient() {
  const [showMain, setShowMain] = useState(false);
  const search = useSearchParams();

  useEffect(() => {
    if (search.get("main") === "1") setShowMain(true);
  }, [search]);

  return showMain ? <Main /> : <BoxSplash onOpen={() => setShowMain(true)} />;
}
