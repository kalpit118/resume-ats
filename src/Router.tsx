import React, { useState, useEffect } from 'react';
import App from './App';
import { NotFoundPage, ServerErrorPage, ForbiddenPage, ServiceUnavailablePage } from './ErrorPage';
import ErrorBoundary from './ErrorBoundary';

export const Router: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Normalize path: remove trailing slash if not root
  const normalizedPath = currentPath.length > 1 && currentPath.endsWith('/') 
    ? currentPath.slice(0, -1) 
    : currentPath;

  const renderRoute = () => {
    switch (normalizedPath.toLowerCase()) {
      case '':
      case '/':
        return <App />;
      case '/404':
      case '/not-found':
        return <NotFoundPage />;
      case '/500':
      case '/server-error':
        return <ServerErrorPage />;
      case '/403':
      case '/forbidden':
        return <ForbiddenPage />;
      case '/503':
      case '/service-unavailable':
        return <ServiceUnavailablePage />;
      default:
        // Any unmapped route automatically shows the 404 page
        return <NotFoundPage />;
    }
  };

  return (
    <ErrorBoundary>
      {renderRoute()}
    </ErrorBoundary>
  );
};

export default Router;
