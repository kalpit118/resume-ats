export const navigate = (to: string) => {
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
};
