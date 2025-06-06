export function trapFocus(modal) {
  const previouslyFocused = document.activeElement;
  const selectors = [
    'a[href]',
    'area[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  let focusables = Array.from(modal.querySelectorAll(selectors));
  if (focusables.length === 0) {
    modal.setAttribute('tabindex', '-1');
    focusables = [modal];
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  function handle(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  modal.addEventListener('keydown', handle);
  first.focus();
  return () => {
    modal.removeEventListener('keydown', handle);
    previouslyFocused && previouslyFocused.focus && previouslyFocused.focus();
  };
}
