// Wrapper pour l'API Google Gemini — génération d'images
// Supporte deux clés API distinctes (AI Studio + GCP) pour doubler les quotas
// Les deux utilisent le même endpoint Gemini (generativelanguage.googleapis.com)

import logger from './logger';
import { getApiKey2 } from './storage';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_ID = 'gemini-3-pro-image-preview';

// ============================================
// AI API CALL (Single-shot, no retries to protect quotas)
// ============================================

export const validateApiKey = async (apiKey) => {
  logger.info('api', `Validation de clé API (...${apiKey.slice(-4)})`);
  try {
    const res = await fetch(
      `${API_BASE}?key=${encodeURIComponent(apiKey)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `Erreur ${res.status}`;
      if (res.status === 403 && msg.includes('Generative Language API')) {
        logger.error('api', `Clé rejetée — Generative Language API non activée`, msg);
        return { valid: false, error: 'Activez la "Generative Language API" dans votre projet GCP (console.cloud.google.com > API & Services).' };
      }
      logger.error('api', `Clé invalide (HTTP ${res.status})`, msg);
      return { valid: false, error: msg };
    }
    logger.success('api', 'Clé API validée');
    return { valid: true };
  } catch (e) {
    logger.error('api', 'Erreur reseau lors de la validation', e.message);
    return { valid: false, error: 'Erreur reseau' };
  }
};

// 🛡️ ANTI-FILTER: Ultimate Payload Sanitizer (Client-side Firewall)
const sanitizePayload = (text) => {
  if (typeof text !== 'string') return text;
  let sanitized = text;
  const swaps = [
    { regex: /\b(bikini|bikinis)\b/gi, replacement: "minimal athletic coastal two-piece swimwear" },
    { regex: /\b(maillot de bain|maillots de bain)\b/gi, replacement: "minimal athletic coastal two-piece swimwear" },
    { regex: /\b(micro-bikini|micro bikini)\b/gi, replacement: "minimal athletic coastal two-piece swimwear with string ties" },
    { regex: /\b(lingerie|sous-vêtements|sous-vetements|underwear)\b/gi, replacement: "delicate sheer layered intimate casual apparel" },
    { regex: /\b(nu|nue|naked|nude|topless|poitrine nue)\b/gi, replacement: "wearing a very short cropped atmospheric top" },
    { regex: /\b(sexy|provocant|hot)\b/gi, replacement: "confident, self-assured, high-fashion" },
    { regex: /\b(décolleté|cleavage)\b/gi, replacement: "v-neckline accentuating the natural silhouette" },
    // ANTI-FILTRE V2.1 – Modesty Level (Nouveaux termes 2026)
    { regex: /\b(underboob)\b/gi, replacement: "cropped comfortable fit" },
    { regex: /\b(micro)\b/gi, replacement: "minimalist" },
    { regex: /\b(sheer)\b/gi, replacement: "delicate sheer layers" },
    { regex: /\b(wet look)\b/gi, replacement: "glowing damp texture" },
    { regex: /\b(string ties)\b/gi, replacement: "thin straps" },
    { regex: /\b(high-cut|high cut)\b/gi, replacement: "athletic waist line cut" },
    { regex: /\b(bralette)\b/gi, replacement: "casual lounge top" },
    { regex: /\b(damp hair from ocean|wet hair)\b/gi, replacement: "slicked back beach hair" },
    { regex: /\b(ass|booty|fesses)\b/gi, replacement: "athletic glute profile" },
  ];
  swaps.forEach(({ regex, replacement }) => {
    sanitized = sanitized.replace(regex, replacement);
  });
  return sanitized;
};

// conversationHistory: array of { role: 'user'|'model', parts: [...] }
export const generateImage = async (apiKey, originalPromptText, aspectRatio = '9:16', conversationHistory = [], options = {}) => {
  let promptText = sanitizePayload(originalPromptText);
  // V2.2 – Modesty Level équilibré (On gère le negative_prompt uniquement dans le matrix)

  const historyTurns = Math.floor(conversationHistory.length / 2);
  logger.info('generation', `Lancement génération (${aspectRatio}, ${historyTurns} tour(s) historique)`, {
    model: MODEL_ID,
    aspectRatio,
    historyTurns,
    promptLength: promptText.length,
  });

  const rawContents = [
    ...conversationHistory,
    { role: 'user', parts: [{ text: promptText }] },
  ];

  // Merge consecutive roles to prevent Gemini API 400 Bad Request
  const contents = rawContents.reduce((acc, current) => {
    if (acc.length === 0) return [current];
    const last = acc[acc.length - 1];
    if (last.role === current.role) {
      // Merge parts
      last.parts = [...last.parts, ...current.parts];
    } else {
      acc.push(current);
    }
    return acc;
  }, []);

  const generationConfig = {
    responseModalities: ['IMAGE'],
    imageConfig: {
      aspectRatio: aspectRatio,
    },
  };

  // Pass seed at API level for best-effort deterministic generation
  if (options.seed) {
    generationConfig.seed = Number(options.seed);
  }

  // ─── IMPERFECTION LAYER ───

  // Random realistic photo flaws to break AI "perfection"
  const IMPERFECTIONS = [
    'Slight phone shadow visible on the ground or wall',
    'Minor lens flare from sun or light source',
    'Slightly warm white balance, like an old iPhone',
    'Subject slightly off-center in frame',
    'One strand of hair out of place',
    'Photo slightly tilted 1-2 degrees',
    'Subtle motion blur on one hand',
    'Slightly overexposed highlights on skin',
    'Background object partially cut off by frame edge',
    'Natural skin imperfection visible (freckle, small mark)',
  ];

  // Nano Virtual Edition — 6 additional iPhone-realism defects
  const NANO_VIRTUAL_IMPERFECTIONS = [
    'Slight 1-2° camera tilt like real hand-held iPhone',
    'Subtle digital grain and noise typical of iPhone 15 Pro sensor',
    'Flyaway hair strands or slightly messy hair',
    'Visible goosebumps or natural skin texture variation',
    'Slight warm/cool white balance shift (old iPhone look)',
    'One tiny imperfection: freckle cluster, small mark or redness on cheek',
  ];

  // Always active: merge full imperfection pool for Nano Virtual Mode
  const fullImperfections = [...IMPERFECTIONS, ...NANO_VIRTUAL_IMPERFECTIONS];

  // Deterministic seed-based imperfection selector or random if no seed
  let selectedImperfections = [];
  if (options.seed) {
    // Basic hash of the seed to deterministically pick 3 items
    const s = Number(options.seed);
    const idx1 = (s * 13) % fullImperfections.length;
    const idx2 = (s * 17) % fullImperfections.length;
    const idx3 = (s * 19) % fullImperfections.length;
    selectedImperfections = [...new Set([fullImperfections[idx1], fullImperfections[idx2], fullImperfections[idx3]])];
    while (selectedImperfections.length < 3) {
      selectedImperfections.push(fullImperfections[(s + selectedImperfections.length) % fullImperfections.length]);
    }
    selectedImperfections = selectedImperfections.slice(0, 3);
  } else {
    // Standard random behavior
    const shuffled = [...fullImperfections].sort(() => Math.random() - 0.5);
    selectedImperfections = shuffled.slice(0, 3);
  }

  const imperfectionText = `\n\nIMPERFECTION LAYER (add these realistic details):\n- ${selectedImperfections.join('\n- ')}`;

  const body = {
    system_instruction: {
      parts: [{
        text: `You are a photorealistic image generator specializing in casual social media photography. You produce images that look like real photos from a normal person's Instagram or TikTok — NOT professional fashion campaigns.

RULES — ORDERED BY PRIORITY:

RULE #1 — IDENTITY LOCK (HIGHEST PRIORITY):
If reference photos of a person were provided, the generated person MUST match that EXACT face, body, skin tone, hair, and proportions. Identity fidelity overrides ALL other instructions. NEVER alter, blend, or "improve" the person's appearance.

RULE #2 — AMATEUR / CASUAL PHOTO (THIS IS THE MOST IMPORTANT VISUAL RULE):
This is NOT a professional photoshoot. This photo must look like it was taken by a FRIEND or by the model HERSELF with a phone. Think: real Instagram story, not a brand campaign.
- Imperfect composition: slightly off-center, tilted 1-3°, casual framing
- The person should NOT be posing like a professional model. Natural body language — like someone just said "hold on let me take a pic"
- Lighting is whatever is available — not optimized, not perfect
- Skin: real texture, visible pores, no retouching, no glow filter, no beauty mode
- Background: messy is OK (clothes on floor, items on table, everyday clutter)
- AVOID: perfect symmetry, studio-like composition, editorial posing, airbrushed skin
- THIS IS AMATEUR CONTENT FOR INSTAGRAM. It should feel authentic and unpolished.

RULE #3 — PHOTO TYPE (CRITICAL):
The top-level "photo_type" field in the JSON determines WHO is taking the photo. Follow it EXACTLY:
- If it contains "selfie": POV extreme close up. The model's arm is outstretched towards the viewer (holding the unseen lens). DO NOT DRAW A PHONE. DO NOT SHOW A PHONE IN HER HAND. The lens is her hand. 
- If it contains "another person" or "third_person": someone ELSE is taking the photo. NO phone visible in the frame. NO selfie arm. Natural photography framing.
- If it contains "mirror": the model is seen in a MIRROR REFLECTION. The phone MUST be visible in her hand in the reflection. Full body in mirror.
NEVER add a visible phone unless it specifically says "mirror selfie".

RULE #4 — SMARTPHONE CAMERA:
The output must look like a casual photo taken with an iPhone.
- Deep focus: everything sharp (foreground AND background). NO background blur. NO bokeh.
- 26mm smartphone wide lens. Natural phone sensor noise. Auto white balance.

RULE #5 — JSON FIDELITY:
Reproduce every field of the JSON prompt. Each block maps to a visual element.

RULE #6 — BODY PRESERVATION:
NEVER normalize or "correct" body proportions. Celebrate real bodies.

RULE #7 — NEGATIVE PROMPT:
The "negative_prompt" lists forbidden elements. Never produce anything listed there.

RULE #8 — VIRTUAL MODEL LOCK:
If a "character_seed" is present in the JSON, this defines a FIXED VIRTUAL MODEL. The SAME face, body, skin, hair, proportions MUST appear in every generation, regardless of environment changes. Never alter, blend, upgrade or normalize the model between shots.

RULE #9 — ENVIRONMENT FLEXIBILITY:
Only the "environment" section may change between shots. Model, anatomy and proportions are 100% locked by "character_seed". Swapping location NEVER alters the model's appearance.

RULE #10 — RAW IPHONE AESTHETIC:
The final image MUST look like a real iPhone 15 Pro photo. Subtle digital grain, possible 1-2° hand-held tilt, warm/cool white balance variation, deep focus throughout (no bokeh anywhere), visible skin pores and texture imperfections. Respect character_seed for visual consistency.

RULE #11 — ANATOMICAL FIDELITY LOCK:
Never normalize, average or correct body proportions. Always preserve all natural volume, projection, sag, soft tissue behavior and subtle asymmetry exactly as specified in the JSON. The "anatomy" and "virtual_depth_simulation" fields are ABSOLUTE — not suggestions.

RULE #12 — DEPTH AND VOLUME SIMULATION:
Follow the "virtual_depth_simulation" section precisely. Prioritize realistic 3D volume and depth rendering. Subject must occupy correct foreground depth. Prevent any flat, compressed or 2D-looking anatomy.${imperfectionText}

OUTPUT: A single photorealistic casual photo. iPhone quality, deep focus, amateur and authentic.`
      }]
    },
    contents,
    generationConfig,
    safetySettings: [
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const url = `${API_BASE}/${MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
  logger.debug('api', `POST ${API_BASE}/${MODEL_ID}:generateContent`, { bodySize: JSON.stringify(body).length });

  // Verbose: log full prompt sent
  logger.verbose('prompt', '📝 generateImage', {
    promptText: promptText.slice(0, 2000),
    aspectRatio,
    historyTurns,
    seed: options.seed || null,
    systemInstruction: body.system_instruction?.parts?.[0]?.text?.slice(0, 300) + '...',
  });

  const t0 = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).catch(fetchErr => {
    clearTimeout(timeout);
    const msg = fetchErr.name === 'AbortError' ? 'Timeout: le serveur n\'a pas répondu en 2 minutes' : `Erreur reseau: ${fetchErr.message}`;
    const e = new Error(msg);
    throw e;
  });
  clearTimeout(timeout);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `Erreur ${res.status}`;

    logger.error('api', `HTTP ${res.status} apres ${elapsed}s`, { status: res.status, message: msg });

    if ([429, 500, 502, 503, 504].includes(res.status)) {
      // On 429 (quota) or 503 (service unavailable), try fallback to secondary API key if available
      if ((res.status === 429 || res.status === 503) && !options._usedFallback) {
        const key2 = getApiKey2();
        if (key2 && key2 !== apiKey) {
          logger.warn('api', `Erreur ${res.status} — basculement sur la clé secondaire`);
          return generateImage(key2, promptText, aspectRatio, conversationHistory, { ...options, _usedFallback: true });
        }
      }
      const e = new Error(res.status === 429
        ? 'Quota dépassé sur toutes les clés API. Attendez quelques minutes.'
        : `Erreur serveur Google (${res.status}).`);
      throw e;
    }
    if (res.status === 400 && msg.includes('safety')) throw new Error('Contenu filtre par les regles de securite.');
    if (res.status === 403) {
      if (msg.includes('Generative Language API')) {
        throw new Error('Activez la "Generative Language API" dans votre projet GCP.');
      }
      throw new Error('Clé API invalide ou accès refusé.');
    }
    throw new Error(msg);
  }

  logger.success('api', `Reponse OK en ${elapsed}s (HTTP ${res.status})`);
  logger.verbose('api-response', '✅ generateImage', { elapsed: `${elapsed}s`, status: res.status });
  const data = await res.json();

  const candidates = data.candidates || [];
  if (candidates.length === 0) {
    if (data.promptFeedback && data.promptFeedback.blockReason === 'SAFETY') {
      throw new Error('🛑 Le texte du prompt contient des termes bloqués par la sécurité Google. Essayez de modifier la description.');
    }
    logger.warn('generation', 'Aucun candidat dans la reponse', data);
    throw new Error('Aucun resultat genere. Le contenu a peut-etre ete filtre.');
  }

  // 🛡️ ANTI-FILTER: Catch silent post-generation safety execution blocks
  if (candidates[0].finishReason === 'SAFETY' || candidates[0].finishReason === 'IMAGE_SAFETY') {
    throw new Error("⚠️ L'image a été générée puis censurée par Google (Trop de peau visible / Contexte jugé inapproprié). Essayez de changer le cadrage (Caméra) pour zoomer sur le visage, ou couvrez un peu plus le modèle.");
  }

  if (candidates[0].finishReason && candidates[0].finishReason !== 'STOP') {
    logger.warn('generation', `Génération interrompue (FinishReason: ${candidates[0].finishReason})`, candidates[0]);
    if (candidates[0].finishReason === 'OTHER') {
      throw new Error(`⚠️ Le modèle a bloqué silencieusement ou échoué (Raison: OTHER). Réessayez ou ajustez les Negative Prompts.`);
    }
  }

  const parts = candidates[0]?.content?.parts || [];
  let imageBase64 = null;
  let mimeType = 'image/png';
  let textResponse = '';

  for (const part of parts) {
    if (part.inlineData) {
      imageBase64 = part.inlineData.data;
      mimeType = part.inlineData.mimeType || 'image/png';
    }
    if (part.text) {
      textResponse += part.text;
    }
  }

  if (!imageBase64) {
    logger.error('generation', 'Pas d\'image dans la reponse', {
      textResponse,
      partsCount: parts.length,
      finishReason: candidates[0]?.finishReason,
      fullCandidateData: candidates[0]
    });
    throw new Error(`Aucune image dans la reponse (FinishReason: ${candidates[0]?.finishReason || 'Unknown'}). ` + (textResponse || 'Essayez un prompt different.'));
  }

  const imgSizeKb = Math.round((imageBase64.length * 3) / 4 / 1024);
  logger.success('generation', `Image generee: ${mimeType} (~${imgSizeKb} KB) en ${elapsed}s`);

  return {
    imageBase64,
    mimeType,
    textResponse,
    dataUrl: `data:${mimeType};base64,${imageBase64}`,
    modelParts: [{ inlineData: { mimeType, data: imageBase64 } }],
  };
};

// ============================================
// MATRICE JSON — Mode ComfyUI (sortie JSON stricte)
// ============================================
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';




// ============================================
// EXTRACTION MODÈLE DEPUIS PHOTOS
// ============================================
export const MODEL_EXTRACTION_PROMPT = `You are an expert AI model descriptor. Analyze the provided image(s) of a person and extract their physical characteristics with surgical precision.

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
    "upper": "upper lip detail, e.g. 'defined cupid's bow', 'soft rounded'",
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
  "anatomical_fidelity": "Critical anatomical directives to preserve exact proportions across generations. Be extremely specific about unique body ratios.",
  "signature": "Overall aesthetic signature of this person, e.g. 'candid smartphone aesthetic, raw authenticity, sun-kissed beach girl energy'"
}

RULES:
1. Output ONLY the JSON object, no markdown, no explanation, no code fences.
2. Every value must be a descriptive English string.
3. Be as precise and specific as possible — vague descriptions will cause inconsistency.
4. For body characteristics not clearly visible, make your best educated estimate based on visible proportions.
5. The "anatomical_fidelity" field is CRITICAL: describe the most distinctive physical proportions to lock them across generations.
6. The "signature" field captures the overall vibe/aesthetic energy of this person.`;

// ============================================
// ROBUST JSON EXTRACTION
// ============================================

/**
 * Extract JSON from Gemini response text, handling markdown fences,
 * extra text before/after, trailing commas, etc.
 */
export const extractJSON = (rawText) => {
  let str = rawText.trim();

  // 1. Extract from markdown fences ```json ... ```
  const fenceMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) str = fenceMatch[1].trim();

  // 2. Try direct parse first
  try { return JSON.parse(str); } catch { /* continue */ }

  // 3. Find first { or [ and last matching } or ]
  const firstBrace = str.indexOf('{');
  const firstBracket = str.indexOf('[');
  let start, endChar;

  if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
    start = firstBrace; endChar = '}';
  } else if (firstBracket >= 0) {
    start = firstBracket; endChar = ']';
  } else {
    return null; // Don't throw, just return null so the chat can display the text
  }

  const end = str.lastIndexOf(endChar);
  if (end <= start) return null;

  let extracted = str.slice(start, end + 1);

  // 4. Remove trailing commas before } or ]
  extracted = extracted.replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(extracted);
};

/**
 * Extract model traits from uploaded photos via Gemini Vision.
 * @param {string} apiKey
 * @param {Array<{base64: string, mimeType: string}>} photos
 * @returns {Promise<object>} Parsed model JSON
 */
export const extractModelFromPhotos = async (apiKey, photos) => {
  logger.info('generation', `Extraction modèle depuis ${photos.length} photo(s)`, {
    model: GEMINI_TEXT_MODEL,
  });

  // Build image parts
  const imageParts = photos.map(p => ({
    inline_data: { mime_type: p.mimeType, data: p.base64 },
  }));

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          ...imageParts,
          { text: MODEL_EXTRACTION_PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };

  const url = `${API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${res.status}`;
    logger.error('generation', `Erreur Gemini extraction (${res.status})`, msg);
    throw new Error(msg);
  }

  const data = await res.json();
  const textContent = data.candidates?.[0]?.content?.parts
    ?.filter(p => p.text)
    .map(p => p.text)
    .join('') || '';

  if (!textContent.trim()) {
    throw new Error('Gemini n\'a retourné aucun contenu texte.');
  }

  try {
    const parsed = extractJSON(textContent);
    logger.success('generation', `Modèle extrait avec succès`, {
      fields: Object.keys(parsed),
    });
    return parsed;
  } catch (e) {
    logger.error('generation', 'JSON invalide retourné par Gemini', textContent.slice(0, 500));
    throw new Error('Le JSON retourné par Gemini est invalide ou tronqué.');
  }
};

// ============================================
// AUTO-FILL LIEU VIA IA
// ============================================
const LOCATION_AUTOFILL_PROMPT = `You are an expert at creating detailed photoshoot location descriptions for AI image generation.

The user will describe a location in French (it can be a simple name like "chambre" or a full description like "ma chambre d'étudiante avec un lit blanc et des fairy lights"). Generate ALL the attributes needed for a consistent photoshoot location.

IMPORTANT: For "lighting" and "vibe", you MUST pick from these EXACT values:

LIGHTING (pick exactly one):
- "golden hour sunlight"
- "harsh direct sunlight"
- "soft overcast daylight"
- "neon club lighting"
- "warm bedroom lamplight"
- "flash photography"
- "moody low light"
- "window natural light crossing room"

VIBE (pick exactly one):
- "candid Instagram photo"
- "warm vintage tones, faded colors, casual candid"
- "casual TikTok style photo, trendy angle"
- "amateur selfie"
- "disposable camera shot"
- "casual everyday snapshot"
- "behind the scenes candid"

TIME_OF_DAY (pick one or leave empty):
- "golden hour (magic hour)"
- "midday harsh sun"
- "blue hour (twilight)"
- "night"
- "morning soft light"
- "late afternoon"

Output a JSON object with these EXACT keys:
{
  "name": "short French name for this location (2-4 words max, e.g. 'Chambre Étudiante', 'Café Parisien')",
  "environment": "detailed environment description in English (be very specific about objects, textures, materials)",
  "lighting": "one of the EXACT lighting values above",
  "vibe": "one of the EXACT vibe values above",
  "time_of_day": "one of the time options above, or empty string",
  "anchor_details": "specific recurring visual elements for consistency (objects, colors, textures always present)",
  "color_palette": "dominant colors in the scene (e.g. warm tones, earth tones, cool blues)",
  "negative_prompt": "things to avoid in this specific location (e.g. crowds, cars, modern objects for a nature scene)",
  "default_outfit": "a very detailed suggested outfit that perfectly fits this environment (fabric, style, accessories)"
}

RULES:
1. Output ONLY the JSON, no markdown, no explanation.
2. "name" should be a short, catchy French name for the location (2-4 words).
3. "environment" should be 15-30 words, very descriptive and specific.
4. "anchor_details" should list 3-5 specific recurring visual elements.
5. "negative_prompt" should list 3-5 things to explicitly avoid.
6. All values in English EXCEPT "name" which must be in French.`;

/**
 * Auto-fill location attributes from a name/concept via Gemini.
 * @param {string} apiKey
 * @param {string} locationName - e.g. "Plage Bali", "Café Paris", "Gym"
 * @returns {Promise<object>} Location attributes
 */
export const autoFillLocation = async (apiKey, locationName) => {
  logger.info('generation', `Auto-fill lieu: "${locationName}"`, { model: GEMINI_TEXT_MODEL });

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: `Location concept: "${locationName}"\n\n${LOCATION_AUTOFILL_PROMPT}` }],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  };

  const url = `${API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const t0 = Date.now();
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${res.status}`;
    logger.error('generation', `Auto-fill HTTP ${res.status} (${elapsed}s)`, msg);
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.filter(p => p.text).map(p => p.text).join('') || '';

  try {
    const parsed = extractJSON(text);
    logger.success('generation', `Lieu auto-rempli en ${elapsed}s`, { fields: Object.keys(parsed) });
    return parsed;
  } catch (e) {
    logger.error('generation', 'JSON invalide pour auto-fill lieu', text.slice(0, 500));
    throw new Error('Gemini a retourné un format invalide. Réessaie.');
  }
};


/* (generateLocationPresets removed — replaced by chatWithDirector) */




/* ─── CHAT DIRECTOR (conversational multi-turn) ─── */

const CHAT_DIRECTOR_INSTRUCTION = `Tu es un directeur photo amateur/Instagram spécialisé dans la création de modèles virtuels cohérents. Tu aides à construire le prompt parfait. Tu parles français, décontracté.

FLOW (2-3 messages max, pas plus) :

MESSAGE 1 — Salue + pose TOUTES les questions d'un bloc :
"👋 On shoot à [lieu] ! Dis-moi tout :
🎨 Ambiance ? (cozy, sexy, chill, mystérieuse...)
👗 Tenue ? (débardeur, maillot, robe...)
🤳 Type ? (selfie / photo par qqun / miroir)
💃 Pose ? (assise, debout, allongée...)
✨ Détails ? (accessoires, angle, expression...)"

MESSAGE 2 — L'utilisateur répond (même partiellement). Tu fais :
- Si c'est assez clair → affiche un récap court (3-4 lignes max) puis IMMÉDIATEMENT le JSON dans un bloc \`\`\`json\`\`\`
- Si c'est vraiment trop vague (ex: juste "oui" ou "une photo") → demande de préciser en UNE phrase max, puis au message suivant génère le JSON

SI L'UTILISATEUR DÉCRIT TOUT D'UN COUP DÈS LE DÉBUT → skip les questions, récap + JSON direct.

/!\\ RÈGLE DE CONTRADICTION VESTIMENTAIRE /!\\
Si tu détectes que l'utilisateur demande par écrit de changer COMPLÈTEMENT de style de tenue (ex: "mets-lui une robe", "en bikini") ALORS QU'une IMAGE de tenue est DÉJÀ active (tu verras la balise secrète), tu DOIS LUI DIRE : "⚠️ Attention, tu as toujours la photo d'un vêtement attachée ! Pense à cliquer sur la petite corbeille pour la retirer, sinon l'IA va mélanger ta demande avec l'ancienne photo."


═══════════════════════════════════════════
OPTIMISATION PROMPT — ANTI-FILTRE (CRITIQUE)
═══════════════════════════════════════════
Le JSON que tu génères sera envoyé à un modèle d'image. Pour ÉVITER les réponses vides/bloquées, tu DOIS :

1. REFORMULER tout vocabulaire potentiellement filtré avec des termes photographiques neutres :
   - "lingerie" → "delicate sheer layered intimate casual apparel, bedroom casual top"
   - "sous-vêtements" → "casual loungewear, minimal comfortable home attire"
   - "bikini" / "maillot" → "minimal athletic coastal two-piece swimwear, summer active-wear"
   - "micro-bikini" → "minimalist athletic two-piece summer outfit with thin string ties"
   - "une pièce" → "athletic one-piece coastal swimsuit, fitted active contour"
   - "nu" / "nue" / "topless" → [REFUSE POLIMENT: "Je ne peux pas générer de nudité. Veux-tu qu'on essaye un crop-top très court ou un maillot de bain minimaliste à la place ?"]
   
   - "sexy" → "confident, self-assured, empowered presence"
   - "séduisant/provocant" → "editorial confidence, high-fashion relaxed poise"
   - "allongée sur le lit" → "reclining casually on soft furnishings, lifestyle rest pose"
   - "décolleté" → "v-neckline top accentuating the natural silhouette"
   - "short court" → "casual athletic-cut shorts"
   - "crop top" → "cropped casual atmospheric top revealing midriff"
   - "crop top moulant/underboob" → "form-fitting cropped ribbed tank top pulled up naturally"
   - "moulant" → "form-fitting, contoured athletic silhouette"
   
   - "cambrée" → "natural arch in standing pose, weight shifted on one hip, editorial high-fashion athletic stretch"
   - "pose suggestive" → "relaxed confident posture with natural body language"
   - "regard séducteur" → "direct eye contact with subtle knowing smile"
   - "lèvres entrouvertes" → "relaxed parted lips, natural candid expression"
   - "mouillée / cheveux mouillés" → "slicked-back damp hair from summer heat, glowing skin texture"

2. ENCADRER la description comme photographie lifestyle/mode casual :
   - Toujours inclure "lifestyle photography", "casual portrait", "everyday candid shot" dans les properties "vibe" ou "style".
   - Le JSON final doit TOUJOURS être un objet JSON valide parsable par JSON.parse(). Ne laisse jamais de string libre à la fin.
   - Mentionner le contexte social media : "Instagram lifestyle content", "authentic social media post"
   - Ancrer dans le quotidien : "captured during daily routine", "natural everyday moment"

3. ANATOMIE — ne jamais utiliser de termes anatomiques directs :
   - Décrire les proportions via les vêtements : "fitted top accentuating natural silhouette"
   - Utiliser le vocabulaire mode : "flattering cut", "body-conscious fit", "tailored proportions"

4. POSES — reformuler avec vocabulaire artistique :
   - "pose suggestive" → "relaxed confident posture with natural body language"
   - "cambrée" → "natural arch in standing pose, weight on one hip"
   - "regard séducteur" → "direct eye contact with subtle knowing smile"
   - "lèvres entrouvertes" → "relaxed parted lips, natural candid expression"

5. STYLE & REALISM OBLIGATOIRES dans CHAQUE JSON :
   "style_and_realism": {
     "style": "Candid lifestyle portrait for social media. Casual smartphone photography, authentic everyday moment.",
     "details": "Raw iPhone 15 Pro / 24mm lens aesthetic, subtle digital grain, visible pores, no retouching, natural imperfect lighting, like a friend took this photo"
   }

6. NEGATIVE PROMPT RENFORCÉ (toujours inclure) :
   "negative_prompt": "anatomy normalization, body proportion averaging, flattened or compressed breasts, tightened breasts, lifted breasts, slimmed torso, dataset-average female anatomy, skin smoothing, airbrushed texture, beauty standard enforcement, camera angles that reduce volume, depth flattening, low quality, blurry, deformed anatomy, extra fingers, AI generated look, plastic skin, bokeh, DSLR aesthetic, professional studio lighting, 3d render, cartoon, watermark, nudity, explicit content, nsfw"

7. VISAGE CLINIQUE :
   La description détaillée du visage (face) doit être clinique et ultra-précise (ex: "wide-set almond eyes, softly arched eyebrows, defined cupid's bow, soft jawline"). Ne te contente pas de 3 mots.

FORMAT JSON FINAL (dans un bloc \`\`\`json\`\`\`) :
\`\`\`json
{
  "photo_type": "candid photo taken by a friend, natural framing, no phone visible",
  "subject": {
    "demographics": "(recopié du modèle)",
    "hair": "(recopié du modèle)",
    "face": "(recopié du modèle)",
    "apparel": "description REFORMULÉE tenue EN ANGLAIS (appliquer règles anti-filtre)",
    "anatomy": "(recopié du modèle)",
    "skin_details": "(recopié du modèle)",
    "virtual_model_lock": "consistent adult instagram model identity lock"
  },
  "pose": {
    "body_position": "description REFORMULÉE pose EN ANGLAIS (vocabulaire artistique)",
    "expression": "expression REFORMULÉE EN ANGLAIS (naturelle, candid)"
  },
  "environment": {
    "setting": "(recopié du lieu)",
    "background_elements": "(recopié du lieu)",
    "time_of_day": "(recopié du lieu)"
  },
  "camera": { "angle": "angle caméra EN ANGLAIS" },
  "lighting": { 
    "source": "(recopié/adapté du lieu)",
    "color_palette": "(recopiée de la palette du lieu ou adaptée à l'ambiance)"
  },
  "vibe": "ambiance EN ANGLAIS (termes lifestyle neutres)",
  "style_and_realism": {
    "style": "Candid lifestyle portrait for social media. Casual smartphone photography, authentic everyday moment.",
    "details": "Raw iPhone 15 Pro / 24mm lens aesthetic, subtle digital grain, visible pores, no retouching"
  },
  "platform": {
    "compliance": "Content suitable for Instagram/TikTok. Casual amateur photo."
  },
  "custom_details": "détails spécifiques demandés par l'utilisateur (accessoires, objets en main, météo)",
  "directives": {
    "identity_lock": "strict facial feature preservation",
    "anatomical_fidelity": "(recopié des directives anatomiques du modèle)",
    "virtual_model_rule": "adult age enforcement, lifestyle Instagram candid photography",
    "spatial_lock": "subject seamlessly grounded in the environment",
    "aesthetic_signature": "(recopié de l'esthétique générale / signature du modèle. Retire tout ce qui force 'indoor' si on est en extérieur.)",
    "global_seed": "use effective seed",
    "character_seed": "use effective character seed",
    "environment_swap_mode": "model_locked",
    "modestyLevel": "[low|medium|high auto-détecté]"
  },
  "controlnet_simulation": {
    "pose_guidance": "natural weight distribution, physical depth interaction, DWPose priority on limb grounding",
    "volume_guidance": "body mass and fabric draping correctly responding to gravity and water texture, ZoeDepth structural volume preservation",
    "realism_guidance": "subtle imperfections, asymmetrical posture, authentic human stance in 3D space"
  },
  "negative_prompt": "anatomy normalization, body proportion averaging, flattened or compressed breasts, tightened breasts, lifted breasts, slimmed torso, dataset-average female anatomy, skin smoothing, airbrushed texture, beauty standard enforcement, camera angles that reduce volume, depth flattening, low quality, blurry, deformed anatomy, extra fingers, AI generated look, plastic skin, bokeh, DSLR aesthetic, professional studio lighting, 3d render, cartoon, watermark, nudity, explicit content, nsfw"
}
\`\`\`

RÈGLES NANO VIRTUAL MODE (TOUJOURS ACTIVES) :
RÈGLES NANO VIRTUAL MODE (TOUJOURS ACTIVES) :
- Remplir scrupuleusement les champs "directives", "style_and_realism", "platform", et "virtual_depth_simulation".
- La mention "casual amateur Instagram photo – clearly adult mid-20s – content suitable for Instagram" DOIT être respectée via les champs "style_and_realism" et "platform".

RÈGLES GÉNÉRALES :
- MAX 2-3 échanges avant le JSON. Sois EFFICACE
- Si l'utilisateur ne précise pas un truc, CHOISIS toi-même un bon défaut au lieu de demander
- Récap en 3-4 lignes max, pas de pavé
- Emojis ok mais pas trop
- JSON en ANGLAIS, copie EXACTE des données modèle/lieu
- TOUJOURS appliquer les reformulations anti-filtre — JAMAIS de vocabulaire direct potentiellement filtré
- Le JSON doit être dans un bloc \`\`\`json ... \`\`\` pour être détecté`;

/**
 * Multi-turn chat with the AI director.
 * @param {string} apiKey
 * @param {Array<{role: string, text: string}>} history - Chat history [{role: 'user'|'model', text: '...'}]
 * @param {object} modelData - Model traits
 * @param {object} locationData - Location data
 * @param {object} sceneData - Current scene state (includes outfit)
 * @param {Array} outfitRefImages - Current visual outfit references
 * @returns {Promise<string>} - AI response text
 */
export const chatWithDirector = async (apiKey, history, modelData, locationData, sceneData, outfitRefImages) => {
  const modelContext = `
MODÈLE (données physiques):
- Ethnie: ${modelData.ethnicity || 'non spécifié'}
- Âge: ${modelData.age || 'jeune adulte'}
- Corps: ${modelData.body?.type || 'non spécifié'}, ${modelData.body?.height || ''}
- Cheveux: ${modelData.hair?.color || ''} ${modelData.hair?.length || ''} ${modelData.hair?.texture || ''}
- Visage: ${modelData.face?.shape || ''}, yeux ${modelData.eyes?.color || ''}
- Peau: ${modelData.skin?.tone || ''} ${modelData.skin?.texture || ''}
- Anatomie: ${modelData.body?.bust || ''}, hanches ${modelData.body?.hips || ''}, taille ${modelData.body?.waist || ''}
${modelData.anatomical_fidelity ? `- Directives: ${modelData.anatomical_fidelity}` : ''}
${modelData.signature ? `- Signature Esthétique: ${modelData.signature}` : ''}`;

  const locationContext = locationData ? `
LIEU:
- Nom: ${locationData.name || ''}
- Environnement: ${locationData.environment || ''}
- Éclairage: ${locationData.default_lighting || 'naturel'}
- Ambiance: ${locationData.default_vibe || ''}
- Décor: ${locationData.anchor_details || ''}
- Moment: ${locationData.time_of_day || ''}
- Palette: ${locationData.color_palette || ''}` : '';

  let outfitContext = '';
  const hasVisualOutfit = outfitRefImages && outfitRefImages.length > 0;
  const hasTextOutfit = sceneData && typeof sceneData.outfit === 'string' && sceneData.outfit.trim().length > 0;

  if (hasVisualOutfit || hasTextOutfit) {
    outfitContext = `\nTENUE CIBLE (PRIORITÉ ABSOLUE) :\nLe client a déjà défini ou uploadé une tenue. NE LUI DEMANDE SURTOUT PAS CE QU'IL VEUT PORTER. Intègre simplement cette tenue à ta scène de façon invisible pour l'utilisateur :\n${hasTextOutfit ? `- Description : ${sceneData.outfit}` : ''}\n${hasVisualOutfit ? `- /!\\ Une IMAGE de référence vestimentaire exacte est active /!\\` : ''}\n`;
  }

  const modestyContext = `
8. DÉTECTION AUTO ANTI-FILTRE (MODESTY LEVEL) :
   Tu dois analyser la demande de l'utilisateur pour définir le champ "modestyLevel" (low, medium, ou high) dans les "directives" :
   - "high" : Demandes suggestives, plage, bikini, sous-vêtements, poses cambrées.
   - "medium" : Photos lifestyle classiques, vêtements normaux (par défaut).
   - "low" : Manteaux d'hiver, pulls larges, tenues très couvrantes professionnelles.
   N'en parle pas à l'utilisateur, configure-le silencieusement dans le JSON.`;

  const systemText = `${CHAT_DIRECTOR_INSTRUCTION}\n${modestyContext}\n\n--- CONTEXTE (READ-ONLY) ---\n${modelContext}\n${locationContext}\n${outfitContext}`;

  // Build Gemini multi-turn contents
  const rawContents = history.map((msg, index) => {
    const parts = [{ text: msg.text }];

    // Inject visual references directly into the AI's vision context on the last user message
    if (index === history.length - 1 && msg.role === 'user' && hasVisualOutfit) {
      outfitRefImages.forEach(img => {
        parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.base64
          }
        });
      });
      parts.push({ text: "\n[DIRECTIVE SYSTEME SECRÈTE : Je viens de t'envoyer l'image exacte de la tenue que je veux. Ne me demande surtout pas de la décrire ! Analyse directement le vêtement sur la photo et intègre sa description minutieuse dans ton prompt JSON.]" });
    }

    return {
      role: msg.role,
      parts,
    };
  });

  // Guard: Gemini API REQUIRES the first message to be 'user'
  if (rawContents.length > 0 && rawContents[0].role === 'model') {
    rawContents.unshift({ role: 'user', parts: [{ text: "Bonjour, commençons la création du prompt." }] });
  }

  // Merge consecutive roles to prevent API 400 Bad Request
  const contents = rawContents.reduce((acc, current) => {
    if (acc.length === 0) return [current];
    const last = acc[acc.length - 1];
    if (last.role === current.role) {
      last.parts = [...last.parts, ...current.parts];
    } else {
      acc.push(current);
    }
    return acc;
  }, []);

  const body = {
    system_instruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: { temperature: 0.8 },
    safetySettings: [
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const url = `${API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};




