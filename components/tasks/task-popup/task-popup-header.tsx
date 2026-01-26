"use client";

import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";

interface TaskPopupHeaderProps {
  onClose: () => void;
}

export function TaskPopupHeader({ onClose }: TaskPopupHeaderProps): React.ReactElement {
  return (
    <div className="absolute top-4 right-4 z-10">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-8 w-8 rounded-full hover:bg-muted/50"
      >
        <IconX className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    </div>
  );
}
