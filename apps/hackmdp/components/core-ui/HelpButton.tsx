"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HelpButtonProps {
  title: string;
  description: string;
  sections: {
    title: string;
    content: string | React.ReactNode;
  }[];
}

export function HelpButton({ title, description, sections }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
        title="Ayuda"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Ayuda</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-600" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-6">
              {sections.map((section, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                    {section.title}
                  </h4>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {typeof section.content === "string" ? (
                      <p>{section.content}</p>
                    ) : (
                      section.content
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
