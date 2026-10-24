// Safari's standalone view can zoom through gestures outside the battle canvas.
export function installGameGestures(target: Document) {
  const preventZoom = (event: Event) => event.preventDefault();
  target.addEventListener('gesturestart', preventZoom, { passive: false });
  target.addEventListener('gesturechange', preventZoom, { passive: false });
}
