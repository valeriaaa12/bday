"use client";

import { useState } from "react";
import BoxSplash from "../components/BoxSplash";
import Main from "../components/main"; // tu componente existente
import Platformer from "@/Platformer";
export default function Page() {
  const [showMain, setShowMain] = useState(false);

  return showMain ? (
    <>
      <Main />
      <Platformer />
    </>
  ) : (
    <BoxSplash onOpen={() => setShowMain(true)} /> // al click, muestra Main
  );
}
