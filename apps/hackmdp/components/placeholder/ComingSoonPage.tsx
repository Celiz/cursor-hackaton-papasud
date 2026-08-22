"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Rocket } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  text: string;
}

interface ComingSoonPageProps {
  title: string;
  description: string;
  buttonText?: string;
  features?: Feature[];
  apiStatus?: "implemented" | "in_progress" | "pending";
}

export function ComingSoonPage({
  title,
  description,
  buttonText = "Crear Nuevo",
  features = [],
  apiStatus = "implemented",
}: ComingSoonPageProps) {
  const statusText = {
    implemented: "✅ Implementada",
    in_progress: "🔨 En desarrollo",
    pending: "⏳ Pendiente",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
        {buttonText && (
          <Button size="lg" disabled>
            {buttonText}
          </Button>
        )}
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription className="max-w-lg mx-auto">
            Esta funcionalidad estará disponible próximamente. Estamos trabajando en crear una
            experiencia increíble para ti.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-6">
          <div className="space-y-4">
            {features.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Características que vendrán:</p>
                <ul className="space-y-1">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center justify-center gap-2">
                      <feature.icon className="h-4 w-4" />
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-4">
              API Backend: {statusText[apiStatus]} | UI: 🔨 En desarrollo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
