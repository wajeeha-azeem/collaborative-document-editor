"use client";

import type { ReactElement } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type WithTooltipProps = {
  label: string;
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
};

export function WithTooltip({
  label,
  children,
  side = "top",
}: WithTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger delay={200} closeDelay={0} render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
