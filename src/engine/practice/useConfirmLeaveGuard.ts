import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

// Guards against losing an in-progress practice session to the browser's
// own back/forward navigation or a swipe-back gesture (PWA/mobile) --
// distinct from, and unrelated to, the X button's own deliberate "End
// session" flow, which stays a plain in-page phase change and is never
// blocked by this. Also covers a hard tab close/refresh via beforeunload,
// which can't be styled (the browser owns that dialog), while the in-app
// case shows our own ConfirmDialog.
export function useConfirmLeaveGuard(shouldBlock: boolean) {
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!shouldBlock) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldBlock]);

  return {
    isBlocked: blocker.state === "blocked",
    confirmLeave: () => {
      if (blocker.state === "blocked") blocker.proceed();
    },
    cancelLeave: () => {
      if (blocker.state === "blocked") blocker.reset();
    },
  };
}
