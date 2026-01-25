"use client";

import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";

interface TaskPopupHeaderProps {
  title: string;
  onClose: () => void;
}

export function TaskPopupHeader({ title, onClose }: TaskPopupHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
      <h2 className="text-lg font-semibold truncate pr-4">{title}</h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="shrink-0"
      >
        <IconX className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    </div>
  );
}
