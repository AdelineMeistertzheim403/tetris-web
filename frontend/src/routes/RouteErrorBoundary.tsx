import { Component, type ErrorInfo, type ReactNode } from "react";

type RouteErrorBoundaryProps = {
  children: ReactNode;
};

type RouteErrorBoundaryState = {
  error: Error | null;
};

function isChunkLoadError(error: Error | null) {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("chunkloaderror") ||
    message.includes("loading chunk")
  );
}

export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route rendering error", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (error) {
      const message = isChunkLoadError(error)
        ? "Le navigateur a garde une ancienne version des fichiers. Recharge la page pour recuperer la derniere version."
        : "Une erreur bloque le chargement de cette page.";

      return (
        <div className="panel">
          <p>{message}</p>
          <button type="button" className="retro-btn" onClick={this.handleReload}>
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
