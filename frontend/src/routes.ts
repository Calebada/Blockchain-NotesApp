import { NOTE_TAG_OPTIONS } from "./features/notes/types/note";

const STATIC_TAB_PATHS: Record<string, string> = {
  all: "/notes",
  pinned: "/notes/pinned",
  trash: "/notes/trash",
  transactions: "/transactions",
};

const STATIC_PATH_TABS = Object.fromEntries(
  Object.entries(STATIC_TAB_PATHS).map(([tab, path]) => [path, tab])
) as Record<string, string>;

export function getTabFromPath(pathname: string) {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === "/") {
    return "all";
  }

  if (STATIC_PATH_TABS[normalizedPath]) {
    return STATIC_PATH_TABS[normalizedPath];
  }

  if (normalizedPath.startsWith("/notes/tags/")) {
    const tag = decodeURIComponent(normalizedPath.replace("/notes/tags/", "")).trim();
    return tag ? tag.toLowerCase() : "all";
  }

  return "all";
}

export function getPathFromTab(tab: string) {
  const normalizedTab = tab.toLowerCase();

  if (STATIC_TAB_PATHS[normalizedTab]) {
    return STATIC_TAB_PATHS[normalizedTab];
  }

  const knownTag = NOTE_TAG_OPTIONS.find(
    (option) => option.toLowerCase() === normalizedTab
  );
  const routeTag = knownTag || normalizedTab;

  return `/notes/tags/${encodeURIComponent(routeTag.toLowerCase())}`;
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "");
}
