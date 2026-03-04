import React from 'react';
import { AlertIcon } from '../../components/Icons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[Velvet] Erreur fatale:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-8">
                    <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                        <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <AlertIcon size={24} className="text-red-400" />
                        </div>
                        <h2 className="text-lg font-bold text-zinc-100 mb-2">Oups, quelque chose a planté</h2>
                        <p className="text-sm text-zinc-500 mb-6">
                            Vos données sont en sécurité. Rechargez la page pour reprendre.
                        </p>
                        <div className="space-y-2">
                            <button
                                onClick={() => window.location.reload()}
                                className="velvet-btn-primary w-full h-10 rounded-lg text-sm"
                            >
                                Recharger la page
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="w-full h-10 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            >
                                Réessayer sans recharger
                            </button>
                        </div>
                        {this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">
                                    Détails techniques
                                </summary>
                                <pre className="mt-2 p-3 bg-zinc-950 rounded-lg text-[10px] text-red-400/80 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                                    {this.state.error.toString()}
                                    {'\n'}
                                    {this.state.error.stack?.split('\n').slice(1, 4).join('\n')}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
