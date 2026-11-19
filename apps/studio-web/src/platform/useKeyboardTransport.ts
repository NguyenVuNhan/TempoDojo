import { useEffect, useRef } from 'react';

export interface KeyboardTransportHandlers {
  toggle: () => void;
  nudge: (delta: number) => void;
  nudgeBig?: (direction: 1 | -1) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (
    target.isContentEditable ||
    target.contentEditable === 'true' ||
    target.contentEditable === ''
  ) {
    return true;
  }
  const tagName = target.tagName.toUpperCase();
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

/**
 * Binds global keyboard shortcuts for transport play/pause and tempo nudging,
 * ignoring key repeats and events originating from editable elements.
 */
export function useKeyboardTransport(handlers: KeyboardTransportHandlers): void {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isEditableTarget(e.target)) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'PageDown':
        case 'PageUp':
          e.preventDefault();
          handlersRef.current.toggle();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (e.shiftKey && handlersRef.current.nudgeBig) {
            handlersRef.current.nudgeBig(1);
          } else {
            handlersRef.current.nudge(1);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (e.shiftKey && handlersRef.current.nudgeBig) {
            handlersRef.current.nudgeBig(-1);
          } else {
            handlersRef.current.nudge(-1);
          }
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
