import React, { useState } from 'react';

const TEMPLATE_PROMPT = `You are an expert AI model descriptor. Analyze the provided image(s) of a person and extract their physical characteristics with surgical precision.

Output a single JSON object following this EXACT schema. Every field must be filled with a precise, descriptive English value. Do NOT leave any field empty. Do NOT invent characteristics not visible — describe only what you see with extreme accuracy.

{
  "age": "estimated age as a number string, e.g. '22'",
  "ethnicity": "ethnicity with feature descriptors, e.g. 'Latina, delicate and defined features'",
  "face": {
    "shape": "face shape, e.g. 'soft oval', 'heart-shaped', 'diamond'",
    "jawline": "jawline type, e.g. 'soft rounded', 'sharp defined', 'V-shaped'",
    "forehead": "forehead description, e.g. 'medium, partially covered by hair'"
  },
  "eyes": {
    "color": "exact eye color, e.g. 'dark brown', 'hazel', 'blue-green'",
    "shape": "eye shape, e.g. 'almond, slightly upturned', 'round', 'cat-eye upturned'",
    "size": "eye size, e.g. 'large', 'medium', 'narrow elongated'",
    "lashes": "lash description, e.g. 'long natural lashes', 'thick dark lashes'",
    "brows": "brow description, e.g. 'soft arched, well-defined', 'thick straight'"
  },
  "nose": {
    "shape": "nose description, e.g. 'small, straight, slightly upturned tip'"
  },
  "lips": {
    "shape": "lip shape, e.g. 'full, naturally plump', 'heart-shaped'",
    "upper": "upper lip detail, e.g. 'defined cupid\\'s bow', 'soft rounded'",
    "lower": "lower lip detail, e.g. 'slightly fuller lower lip', 'balanced with upper'"
  },
  "hair": {
    "color": "exact hair color with nuance, e.g. 'rich brown with subtle caramel highlights'",
    "length": "hair length, e.g. 'long, past shoulders', 'medium, shoulder length'",
    "texture": "hair texture, e.g. 'wavy, flowing, voluminous', 'straight and sleek'",
    "style": "current hair style, e.g. 'loose and natural, face-framing layers'"
  },
  "body": {
    "type": "body type, e.g. 'hourglass', 'athletic', 'slim', 'curvy'",
    "height": "estimated height, e.g. 'average, around 5\\'5', 'tall, around 5\\'7'",
    "bust": "bust description, e.g. 'medium, proportional, perky'",
    "waist": "waist description, e.g. 'narrow and toned', 'average, natural'",
    "hips": "hips description, e.g. 'wide, full, proportional to bust'",
    "glutes": "glutes description, e.g. 'full, rounded, prominent in rear views'",
    "limbs": "limbs description, e.g. 'toned but soft, feminine proportions'",
    "details": "body details, e.g. 'gravity and soft tissue realism visible, natural body folds'"
  },
  "skin": {
    "tone": "skin tone, e.g. 'sun-kissed warm tan', 'fair porcelain', 'olive'",
    "texture": "skin texture, e.g. 'visible pores, natural texture', 'smooth and even'",
    "features": "skin features, e.g. 'light freckles across nose and cheeks', 'beauty mark near lip'",
    "sheen": "skin sheen, e.g. 'natural skin sheen, slight perspiration glow'",
    "details": "skin details, e.g. 'occasional tan lines, subtle moles, subsurface scattering'"
  },
  "anatomical_fidelity": "Critical anatomical directives to preserve exact proportions across generations. Be extremely specific about unique body ratios, e.g. 'Exact preservation of high-volume chest-to-waist ratio, heavy natural outward projection...'",
  "signature": "Overall aesthetic signature of this person, e.g. 'candid smartphone aesthetic, raw authenticity, sun-kissed beach girl energy'"
}

RULES:
1. Output ONLY the JSON object, no markdown, no explanation, no code fences.
2. Every value must be a descriptive English string.
3. Be as precise and specific as possible — vague descriptions will cause inconsistency.
4. For body characteristics not clearly visible, make your best educated estimate based on visible proportions.
5. The "anatomical_fidelity" field is CRITICAL: describe the most distinctive physical proportions to lock them across generations.
6. The "signature" field captures the overall vibe/aesthetic energy of this person.`;

const ModelTemplateModal = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(TEMPLATE_PROMPT);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = TEMPLATE_PROMPT;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700/60 rounded-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
                    <div>
                        <h2 className="text-base font-bold text-zinc-100">Template AI Studio</h2>
                        <p className="text-[12px] text-zinc-500 mt-0.5">
                            Copiez ce prompt, collez-le dans Google AI Studio avec une photo de la modele.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                        ×
                    </button>
                </div>

                {/* Prompt Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <pre className="text-[12px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed bg-zinc-950/60 rounded-xl p-5 border border-zinc-800/40">
                        {TEMPLATE_PROMPT}
                    </pre>
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-zinc-800/60">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center">
                                <span className="text-[10px] text-blue-400">1</span>
                            </div>
                            <span className="text-[11px] text-zinc-500">Copier le prompt</span>
                        </div>
                        <span className="text-zinc-700">→</span>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center">
                                <span className="text-[10px] text-purple-400">2</span>
                            </div>
                            <span className="text-[11px] text-zinc-500">Coller dans AI Studio + photo</span>
                        </div>
                        <span className="text-zinc-700">→</span>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center">
                                <span className="text-[10px] text-emerald-400">3</span>
                            </div>
                            <span className="text-[11px] text-zinc-500">Coller le JSON ici</span>
                        </div>
                    </div>
                    <button
                        onClick={handleCopy}
                        className={`h-9 px-5 rounded-lg text-sm font-semibold transition-all ${copied
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-100 text-zinc-900 hover:bg-white'
                            }`}
                    >
                        {copied ? '✓ Copie !' : 'Copier le prompt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModelTemplateModal;
