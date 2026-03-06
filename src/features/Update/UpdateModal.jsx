import React from 'react';

export default function UpdateModal({
    isCheckingUpdate,
    downloadProgress,
    hasUpdate,
    isUpdating,
    isUpdateError,
    isUpToDate,
    onCheckUpdate,
    onRestart,
    onClose
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-teal-500/20 to-emerald-900/40 flex items-center justify-center border-b border-zinc-800/80">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

                    <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.5)]">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white/70 hover:bg-black/40 hover:text-white transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center text-center">
                    <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                        Mise à jour Velvet Studio
                    </h2>

                    {isCheckingUpdate && (
                        <div className="flex flex-col items-center gap-4 w-full">
                            <p className="text-sm text-zinc-400">Recherche de la dernière version...</p>
                            <div className="w-6 h-6 border-2 border-zinc-700 border-t-teal-400 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {!isCheckingUpdate && isUpdateError && (
                        <div className="flex flex-col items-center gap-4 w-full">
                            <div className="p-3 bg-red-500/10 rounded-full">
                                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-sm text-red-400 font-medium">Échec de la connexion ou du téléchargement.</p>
                            <button
                                onClick={onCheckUpdate}
                                className="mt-2 px-6 py-2 rounded-xl bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
                            >
                                Réessayer
                            </button>
                        </div>
                    )}

                    {!isCheckingUpdate && isUpToDate && (
                        <div className="flex flex-col items-center gap-4 w-full animate-in zoom-in-95 duration-300">
                            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mb-1">
                                <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-[15px] font-medium text-zinc-300">
                                Velvet Studio est à jour !
                            </p>
                            <p className="text-sm text-zinc-500 -mt-2">
                                Vous utilisez la dernière version disponible.
                            </p>
                        </div>
                    )}

                    {!isCheckingUpdate && !isUpdateError && !isUpToDate && !hasUpdate && downloadProgress === null && (
                        <div className="flex flex-col items-center gap-4 w-full">
                            <p className="text-sm text-zinc-400">Préparation du téléchargement...</p>
                            <div className="w-5 h-5 border-2 border-zinc-700 border-t-teal-400 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {!isCheckingUpdate && downloadProgress !== null && !hasUpdate && (
                        <div className="flex flex-col w-full gap-5">
                            <p className="text-sm text-zinc-400">
                                Téléchargement de la mise à jour... <br />
                                <span className="text-xs opacity-60">
                                    {downloadProgress.bytesPerSecond ? `${(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(1)} Mo/s` : 'Calcul...'}
                                </span>
                            </p>

                            <div className="w-full">
                                <div className="flex justify-between text-[11px] text-zinc-500 font-medium mb-1.5 px-1">
                                    <span>Progression</span>
                                    <span className="text-teal-400">{Math.round(downloadProgress.percent || 0)}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300 relative"
                                        style={{ width: `${Math.max(2, downloadProgress.percent || 0)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isCheckingUpdate && hasUpdate && (
                        <div className="flex flex-col items-center gap-6 w-full animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-[15px] text-zinc-300">
                                    La mise à jour est prête à être installée.
                                </p>
                                <p className="text-[13px] text-zinc-500 mt-1">
                                    L'application va redémarrer pour appliquer les modifications.
                                </p>
                            </div>

                            <button
                                onClick={onRestart}
                                disabled={isUpdating}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-[15px] shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUpdating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Installation en cours...
                                    </>
                                ) : (
                                    <>Redémarrer et Installer</>
                                )}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
