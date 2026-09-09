"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type JobContextType = {
  jobId: string | null;
  setJobId: (jobId: string | null) => void;
};

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <JobContext.Provider value={{ jobId, setJobId }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  const context = useContext(JobContext);

  if (context === undefined) {
    throw new Error("useJob must be used inside a JobProvider");
  }

  return context;
}