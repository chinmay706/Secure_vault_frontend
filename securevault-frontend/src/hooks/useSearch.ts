import { useState, useEffect } from "react";

export const useSearch = () => {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleOpenSearch = () => {
      setSearchOpen(true);
    };

    window.addEventListener("openSearch", handleOpenSearch);
    return () => window.removeEventListener("openSearch", handleOpenSearch);
  }, []);

  return {
    searchOpen,
    setSearchOpen,
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
  };
};
