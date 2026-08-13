export interface IdleHandle {
  cancel(): void;
}

interface IdleCapableWindow {
  requestIdleCallback?: (callback: IdleRequestCallback) => number;
  cancelIdleCallback?: (handle: number) => void;
}

export function runWhenIdle(callback: () => void, delay = 300): IdleHandle {
  const idleWindow = window as IdleCapableWindow;

  const requestIdle = idleWindow.requestIdleCallback;
  if (typeof requestIdle === "function") {
    const handle = requestIdle(() => {
      callback();
    });
    return {
      cancel() {
        const cancelIdle = idleWindow.cancelIdleCallback;
        if (typeof cancelIdle === "function") cancelIdle(handle);
      },
    };
  }

  const handle = window.setTimeout(callback, delay);
  return {
    cancel() {
      window.clearTimeout(handle);
    },
  };
}
