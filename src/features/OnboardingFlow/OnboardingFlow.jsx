import React, { useState } from 'react';
import { useToast } from '../../store/ToastContext';
import { saveApiKey } from '../../utils/storage';
import { validateApiKey } from '../../utils/googleAI';

const OnboardingFlow = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [keyInput, setKeyInput] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const toast = useToast();

    const handleCopyLinkClick = (e) => {
        e.preventDefault();
        if (window.alter && window.alter.isElectron) {
            // Electron will open it in the default browser natively
            window.open('https://aistudio.google.com/app/apikey', '_blank');
        } else {
            window.open('https://aistudio.google.com/app/apikey', '_blank', 'noopener,noreferrer');
        }
    };

    const handleValidate = async () => {
        const key = keyInput.trim();
        if (!key) {
            toast.error('Veuillez coller une clé API.');
            return;
        }

        setIsValidating(true);
        const result = await validateApiKey(key);

        if (result.valid) {
            // Save it using the existing storage method
            saveApiKey(key);
            setStep(4); // Success step
        } else {
            toast.error(result.error || 'Clé invalide. Copiez bien tous les caractères.');
        }
        setIsValidating(false);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 overflow-y-auto">
            {/* Background decoration */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-2xl relative z-10 flex flex-col gap-8">
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-3 mb-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`w-12 h-1 rounded-full transition-colors duration-500 ${step >= i ? 'bg-teal-500' : 'bg-zinc-800'}`}></div>
                    ))}
                </div>

                {/* --- STEP 1: Welcome --- */}
                {step === 1 && (
                    <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-teal-500/20">
                            <span className="text-4xl font-black text-white leading-none">V</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                            Bienvenue dans <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Alter Studio</span>
                        </h1>
                        <p className="text-lg text-zinc-400 max-w-lg mb-12 leading-relaxed">
                            Votre studio photo propulsé par l'IA. 100% privé, sans abonnements coûteux, fonctionnant avec le moteur de pointe de Google.
                        </p>
                        <button
                            onClick={() => setStep(2)}
                            className="px-8 py-3.5 bg-zinc-100 text-zinc-900 font-bold rounded-xl hover:bg-white active:scale-95 transition-all text-base shadow-xl shadow-white/5"
                        >
                            Commencer la configuration (1 minute)
                        </button>
                    </div>
                )}

                {/* --- STEP 2: The Magic (API Key Explanation) --- */}
                {step === 2 && (
                    <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-16 h-16 mb-6 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700/50">
                            <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Le Moteur <span className="text-teal-400">Gemini Flash</span></h2>
                        <p className="text-zinc-400 text-base leading-relaxed max-w-md mx-auto mb-10">
                            Plutôt que de payer des abonnements mensuels, Alter Studio vous permet de brancher <strong>votre propre accès gratuit</strong> à Google AI Studio. <br /><br />
                            Nous avons besoin d'une simple "Clé API" pour connecter le moteur.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl transition-colors"
                            >
                                Retour
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-teal-500/20"
                            >
                                Obtenir ma clé
                            </button>
                        </div>
                    </div>
                )}

                {/* --- STEP 3: Action (Get the key and Paste) --- */}
                {step === 3 && (
                    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
                        <h2 className="text-2xl font-bold mb-8 text-center">Copier la clé Google</h2>

                        <div className="grid md:grid-cols-2 gap-8 items-start mb-8">
                            {/* Instructions */}
                            <div className="space-y-6 bg-zinc-800/30 p-6 rounded-2xl border border-zinc-700/30">
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold shrink-0">1</div>
                                    <div>
                                        <h3 className="font-semibold mb-2">Ouvrez Google AI Studio</h3>
                                        <button
                                            onClick={handleCopyLinkClick}
                                            className="text-sm px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-2 transition-colors border border-zinc-600/50"
                                        >
                                            <svg className="w-4 h-4 text-teal-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" /></svg>
                                            Ouvrir le portail
                                        </button>
                                        <p className="text-xs text-zinc-500 mt-2">Connectez-vous avec un compte Google si demandé.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold shrink-0">2</div>
                                    <div>
                                        <h3 className="font-semibold mb-1">Créez et Copiez</h3>
                                        <p className="text-sm text-zinc-400">Cliquez sur <span className="text-white font-medium">Create API Key</span> et copiez la longue suite de caractères.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Paste Area */}
                            <div className="flex flex-col justify-center space-y-4">
                                <label className="text-sm font-semibold text-zinc-300 ml-1">Collez votre clé ici :</label>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        value={keyInput}
                                        onChange={(e) => setKeyInput(e.target.value)}
                                        placeholder="AIzaSy..."
                                        className="w-full bg-zinc-900 border-2 border-zinc-700/50 focus:border-teal-500/50 rounded-xl px-5 py-4 text-white font-mono placeholder:text-zinc-600 transition-all focus:outline-none focus:ring-4 ring-teal-500/10"
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleValidate() }}
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                                        </svg>
                                    </div>
                                </div>

                                <button
                                    onClick={handleValidate}
                                    disabled={isValidating || keyInput.length < 10}
                                    className="w-full py-4 mt-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isValidating ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Vérification en cours...
                                        </>
                                    ) : (
                                        <>Valider ma clé incroyable</>
                                    )}
                                </button>
                                <button
                                    onClick={() => setStep(2)}
                                    className="text-xs text-zinc-500 hover:text-zinc-300 mt-4 text-center transition-colors pb-6"
                                >
                                    Retour
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- STEP 4: Success --- */}
                {step === 4 && (
                    <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/20">
                            <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-emerald-400">Moteur connecté !</h2>
                        <p className="text-zinc-400 max-w-md mx-auto mb-10">
                            Génial, tout fonctionne parfaitement. Alter Studio a le droit de communiquer avec Gemini. <br />Vous êtes prêt à générer vos premières scènes.
                        </p>
                        <button
                            onClick={onComplete}
                            className="px-10 py-4 bg-zinc-100 text-zinc-900 font-bold text-lg rounded-xl hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                        >
                            Entrer dans le Studio
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingFlow;
