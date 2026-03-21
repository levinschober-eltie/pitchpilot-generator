import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "60vh", padding: "2rem", textAlign: "center",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem", opacity: 0.3 }}>⚠</div>
          <h2 style={{ marginBottom: "0.5rem" }}>Etwas ist schiefgelaufen</h2>
          <p style={{ color: "#888", marginBottom: "1.5rem", maxWidth: 400 }}>
            {this.state.error?.message || "Unbekannter Fehler"}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          >
            Seite neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
