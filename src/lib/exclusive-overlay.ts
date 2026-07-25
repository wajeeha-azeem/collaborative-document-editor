export type EditorOverlay = "download" | "history" | "share";

export type OverlayState = {
  downloadOpen: boolean;
  historyOpen: boolean;
  shareOpen: boolean;
};

/** Opens one editor overlay and closes the others. */
export function openExclusiveOverlay(target: EditorOverlay): OverlayState {
  return {
    downloadOpen: target === "download",
    historyOpen: target === "history",
    shareOpen: target === "share",
  };
}
