"use client";

import DisplayCards from "@/components/ui/display-cards";
import { Newspaper, BadgeCheck, ImageUp } from "lucide-react";

// Empty-inbox showcase: what Sunnyvale does, as stacked display cards.
// Client component so lucide icons can be passed as element props.
const cards = [
  {
    icon: <Newspaper className="size-4 text-zinc-300" />,
    title: "Regulation radar",
    description: "Last week's AI rules, verified",
    date: "Runs every Saturday",
    titleClassName: "text-zinc-200",
    className:
      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <BadgeCheck className="size-4 text-zinc-300" />,
    title: "Jaya reviews",
    description: "Approve or request changes",
    date: "One link, no login",
    titleClassName: "text-zinc-200",
    className:
      "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <ImageUp className="size-4 text-zinc-300" />,
    title: "Create from upload",
    description: "Screenshot in, post out",
    date: "Images and PDFs",
    titleClassName: "text-zinc-200",
    className:
      "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
  },
];

export default function InboxShowcase() {
  return (
    <div className="flex w-full items-center justify-center overflow-hidden py-14">
      <div className="w-full max-w-2xl">
        <DisplayCards cards={cards} />
      </div>
    </div>
  );
}
