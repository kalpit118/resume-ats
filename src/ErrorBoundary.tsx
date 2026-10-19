import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorPage } from './ErrorPage';
import { navigate } from './navigation';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Unhandled React Error Boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo!, this.handleReset);
      }

      return (
        <ErrorPage
          code={500}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleReset}
          onNavigateHome={() => {
            this.handleReset();
            navigate('/');
          }}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
