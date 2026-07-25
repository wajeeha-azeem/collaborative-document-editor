import { describe, expect, it } from "vitest";

import { openExclusiveOverlay } from "@/lib/exclusive-overlay";

describe("openExclusiveOverlay", () => {
  it("opens download and closes history and share", () => {
    expect(openExclusiveOverlay("download")).toEqual({
      downloadOpen: true,
      historyOpen: false,
      shareOpen: false,
    });
  });

  it("opens history and closes download and share", () => {
    expect(openExclusiveOverlay("history")).toEqual({
      downloadOpen: false,
      historyOpen: true,
      shareOpen: false,
    });
  });

  it("opens share and closes download and history", () => {
    expect(openExclusiveOverlay("share")).toEqual({
      downloadOpen: false,
      historyOpen: false,
      shareOpen: true,
    });
  });
});
