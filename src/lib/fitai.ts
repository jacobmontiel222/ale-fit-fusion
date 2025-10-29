export const FITAI_UNREAD_KEY = "fityai-unread";

export const getFitAIUnread = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(FITAI_UNREAD_KEY) === "1";
  } catch {
    return false;
  }
};

export const setFitAIUnread = (hasUnread: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(FITAI_UNREAD_KEY, hasUnread ? "1" : "0");
  } catch {
    // ignore write failures (private mode, etc.)
  }

  try {
    window.dispatchEvent(
      new CustomEvent("fityai:unread-changed", {
        detail: { value: hasUnread },
      })
    );
  } catch {
    // ignore dispatch failures
  }
};
