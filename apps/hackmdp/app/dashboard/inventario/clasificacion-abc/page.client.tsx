"use client";

import { ComingSoonPage } from "@/components/placeholder/ComingSoonPage";
import { FileText } from "lucide-react";

export default function ClasificacionABCClientPage() {
  return (
    <ComingSoonPage
      title="Clasificación ABC"
      description="Clasificación ABC de productos"
      features={[
        { icon: FileText, text: "Característica 1" },
        { icon: FileText, text: "Característica 2" },
        { icon: FileText, text: "Característica 3" },
      ]}
    />
  );
}
