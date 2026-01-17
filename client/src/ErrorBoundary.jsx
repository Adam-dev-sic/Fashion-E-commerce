import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    // State to track if an error has occurred
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // Lifecycle method to catch errors
  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error: error };
  }

  // Lifecycle method to log error information
  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("Error Caught by Boundary:", this.props.name, error, errorInfo);
    this.setState({ errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error is caught
      return (
        <div style={{ padding: '20px', border: '2px solid red', margin: '10px' }}>
          <h2>❌ Component Error: {this.props.name}</h2>
          <p>Something went wrong during rendering or initialization.</p>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    // Render children normally if no error
    return this.props.children;
  }
}

export default ErrorBoundary;