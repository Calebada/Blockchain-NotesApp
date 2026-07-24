import { useCallback, useEffect, useState } from "react";
import NotesPage from "./features/notes/pages/NotesPage";
import { getPathFromTab, getTabFromPath } from "./routes";

export default function App() {
  const [activeRouteTab, setActiveRouteTab] = useState(() =>
    getTabFromPath(window.location.pathname)
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setActiveRouteTab(getTabFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigateToTab = useCallback((tab: string) => {
    const nextPath = getPathFromTab(tab);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    setActiveRouteTab(tab);
  }, []);

  return (
    <NotesPage
      activeRouteTab={activeRouteTab}
      onRouteTabChange={navigateToTab}
    />
  );
}
