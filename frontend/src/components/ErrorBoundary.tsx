import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Error info:', errorInfo);
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Clear localStorage to reset app state
    localStorage.clear();
    // Reload the app
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '1rem' }}>
          <div style={{ maxWidth: '28rem', width: '100%', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '3rem', width: '3rem', borderRadius: '9999px', backgroundColor: '#fee2e2', marginBottom: '1rem' }}>
                <svg
                  style={{ height: '1.5rem', width: '1.5rem', color: '#dc2626' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                Something went wrong
              </h2>
              <p style={{ color: '#4b5563', marginBottom: '1rem' }}>
                The app encountered an unexpected error. Please try clearing the cache or restarting the app.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.5rem', textAlign: 'left', fontSize: '0.75rem', overflow: 'auto', maxHeight: '10rem' }}>
                  <p style={{ fontWeight: '600', color: '#dc2626', marginBottom: '0.25rem' }}>
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre style={{ color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <button
                  onClick={this.handleReset}
                  style={{ width: '100%', backgroundColor: '#f97316', color: 'white', border: 'none', padding: '0.75rem 1rem', borderRadius: '0.375rem', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', marginBottom: '0.75rem' }}
                >
                  Clear Cache & Reload
                </button>
                <button
                  onClick={() => window.location.reload()}
                  style={{ width: '100%', backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1rem', borderRadius: '0.375rem', fontSize: '1rem', fontWeight: '500', cursor: 'pointer' }}
                >
                  Reload App
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

