"use client";

import { ChangeEvent, useState } from "react";
import { useJob } from "@/app/context/Jobcontext";

type UploadResponse = {
  job_id: string;
  generated_at: string;
};

export function useUploadedReport() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");

  const { jobId, setJobId } = useJob();

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("Upload failed");
        return;
      }

      const data = (await res.json()) as UploadResponse;

      setJobId(data.job_id);

      setGeneratedAt(
        data.generated_at ?? new Date().toLocaleString()
      );
    } catch (err) {
      console.error("Upload error:", err);
    }
  }

  return {
    uploadedFile,
    generatedAt,
    jobId,
    handleUpload,
  };
}