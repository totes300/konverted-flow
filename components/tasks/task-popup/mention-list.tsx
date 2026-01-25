"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MentionUser {
  _id: string;
  name: string;
  avatarUrl?: string;
}

export interface MentionListProps {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item._id, label: item.name });
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md">
          No users found
        </div>
      );
    }

    return (
      <div className="rounded-md border bg-popover p-1 shadow-md">
        {items.map((item, index) => (
          <button
            key={item._id}
            onClick={() => selectItem(index)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            )}
          >
            <Avatar size="sm">
              {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.name} />}
              <AvatarFallback>
                {item.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";
