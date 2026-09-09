"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Gene } from "@/app/types/bioinformatics";

type SelectedGeneContextType = {
  selectedGene: Gene | null;
  setSelectedGene: Dispatch<SetStateAction<Gene | null>>;
};

const SelectedGeneContext = createContext<SelectedGeneContextType | undefined>(
  undefined
);

export function SelectedGeneProvider({ children }: { children: ReactNode }) {
  const [selectedGene, setSelectedGene] = useState<Gene | null>(null);

  return (
    <SelectedGeneContext.Provider value={{ selectedGene, setSelectedGene }}>
      {children}
    </SelectedGeneContext.Provider>
  );
}

export function useSelectedGene() {
  const context = useContext(SelectedGeneContext);

  if (context === undefined) {
    throw new Error("useSelectedGene must be used inside a SelectedGeneProvider");
  }

  return context;
}
