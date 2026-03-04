// Wrapper pour l'API Google Gemini — génération d'images
// Supporte deux clés API distinctes (AI Studio + GCP) pour doubler les quotas
// Les deux utilisent le même endpoint Gemini (generativelanguage.googleapis.com)

import logger from './logger';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_ID = 'gemini-3-pro-image-preview';

// ============================================
// RETRY — backoff exponentiel pour erreurs transitoires
// ============================================
const RETRYABLE_CODES = [429, 500, 502, 503, 504];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

const withRetry = async (fn, context = 'api') => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable = err._retryable || err.message?.includes('fetch') || err.message?.includes('network');
      if (!isRetryable || attempt === MAX_RETRIES) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(context, `Tentative ${attempt}/${MAX_RETRIES} échouée, retry dans ${delay / 1000}s...`, err.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
};

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

// conversationHistory: array of { role: 'user'|'model', parts: [...] }
export const generateImage = async (apiKey, promptText, aspectRatio = '9:16', conversationHistory = [], options = {}) => {
  return withRetry(async () => {
    const historyTurns = Math.floor(conversationHistory.length / 2);
    logger.info('generation', `Lancement génération (${aspectRatio}, ${historyTurns} tour(s) historique)`, {
      model: MODEL_ID,
      aspectRatio,
      historyTurns,
      promptLength: promptText.length,
    });

    const contents = [
      ...conversationHistory,
      { role: 'user', parts: [{ text: promptText }] },
    ];

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

    const body = {
      system_instruction: {
        parts: [{
          text: `You are a photorealistic image generator that receives JSON anchor matrices.

ABSOLUTE RULES — VIOLATION IS FORBIDDEN:
1. Reproduce EVERY field of the JSON literally. Each key describes a precise visual attribute.
2. NEVER normalize, average, reduce, or "correct" any body proportion, volume, or curvature.
3. The "subject" block defines the person's EXACT appearance: demographics, hair, face, anatomy, skin. Follow each sub-field word for word.
4. The "pose" block defines EXACT body position, limb placement, and head/gaze direction. Do not deviate.
5. The "camera" block defines perspective, shot type, focal length, and depth of field. Reproduce exactly.
6. The "lighting" block defines source, quality, and shadows. Match precisely.
7. The "negative_prompt" is a list of FORBIDDEN elements. Never produce any element listed there.
8. The "controlnet" block defines skeletal and depth constraints. Respect recommended weights and all constraints.
9. The "directives.identity_lock" is ABSOLUTE: same face, same body proportions, same skin, always. The person must be recognizable as the SAME individual across every generation.
10. If reference images were provided earlier in this conversation, the generated person MUST match that exact face and body.

OUTPUT: Generate a single photorealistic image matching ALL specifications above.` }]
      },
      contents,
      generationConfig,
    };

    const url = `${API_BASE}/${MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
    logger.debug('api', `POST ${API_BASE}/${MODEL_ID}:generateContent`, { bodySize: JSON.stringify(body).length });

    const t0 = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(fetchErr => {
      const e = new Error(`Erreur reseau: ${fetchErr.message}`);
      e._retryable = true;
      throw e;
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `Erreur ${res.status}`;

      logger.error('api', `HTTP ${res.status} apres ${elapsed}s`, { status: res.status, message: msg });

      if (RETRYABLE_CODES.includes(res.status)) {
        const e = new Error(res.status === 429
          ? 'Quota dépassé. Essayez votre autre clé API, ou attendez quelques minutes.'
          : `Serveurs satures (${res.status}). Retry automatique en cours...`);
        e._retryable = true;
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

    const data = await res.json();

    const candidates = data.candidates || [];
    if (candidates.length === 0) {
      logger.warn('generation', 'Aucun candidat dans la reponse', data);
      throw new Error('Aucun resultat genere. Le contenu a peut-etre ete filtre.');
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
      logger.error('generation', 'Pas d\'image dans la reponse', { textResponse, partsCount: parts.length });
      throw new Error('Aucune image dans la reponse. ' + (textResponse || 'Essayez un prompt different.'));
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
  }, 'generation'); // end withRetry
};

// ============================================
// MATRICE JSON — Mode ComfyUI (sortie JSON stricte)
// ============================================
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';

export const generateAnchorMatrixViaGemini = async (apiKey, anchorMatrix) => {
  logger.info('generation', 'Lancement generation Matrice JSON via Gemini', {
    model: GEMINI_TEXT_MODEL,
    matrixKeys: Object.keys(anchorMatrix),
  });

  const systemPrompt = `You are a professional AI image generation prompt engineer specialized in ComfyUI workflows with ControlNet (DWPose + ZoeDepth).

Your task: take the provided JSON anchor matrix and ENRICH it. Fill in any null values with realistic, coherent defaults. Improve descriptions to be more detailed and specific for ControlNet processing. Return ONLY the enriched JSON, maintaining the exact same schema structure.

Rules:
- Keep all existing non-null values exactly as-is
- Fill null fields with contextually appropriate values
- All text values must be in English
- The negative_prompt block must remain unchanged
- The controlnet block must remain unchanged
- Be extremely specific in pose, camera, and lighting descriptions`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [
      { role: 'user', parts: [{ text: JSON.stringify(anchorMatrix, null, 2) }] },
    ],
    generationConfig: {
      responseModalities: ['TEXT'],
      response_mime_type: 'application/json',
      temperature: 0.4,
    },
  };

  const url = `${API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  logger.debug('api', `POST ${API_BASE}/${GEMINI_TEXT_MODEL}:generateContent`, { bodySize: JSON.stringify(body).length });

  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `Erreur ${res.status}`;
    logger.error('api', `HTTP ${res.status} apres ${elapsed}s (Matrice)`, { status: res.status, message: msg });

    if (res.status === 503) throw new Error('Serveurs satures (503). Essayez votre autre cle API.');
    if (res.status === 429) throw new Error('Quota depasse. Essayez votre autre cle API.');
    throw new Error(msg);
  }

  logger.success('api', `Reponse Matrice OK en ${elapsed}s`);

  const data = await res.json();
  const candidates = data.candidates || [];
  if (candidates.length === 0) {
    logger.warn('generation', 'Aucun candidat Matrice', data);
    throw new Error('Aucun resultat genere par Gemini.');
  }

  const textContent = candidates[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    logger.error('generation', 'Pas de texte dans la reponse Matrice', candidates[0]);
    throw new Error('Reponse Gemini vide.');
  }

  try {
    const enrichedMatrix = JSON.parse(textContent);
    logger.success('generation', `Matrice enrichie: ${Object.keys(enrichedMatrix).length} sections`, {
      sections: Object.keys(enrichedMatrix),
    });
    return enrichedMatrix;
  } catch (e) {
    logger.error('generation', 'Impossible de parser le JSON retourne par Gemini', textContent.slice(0, 500));
    throw new Error('Le JSON retourne par Gemini est invalide.');
  }
};

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

  // Extract JSON from response (handle code fences)
  let jsonStr = textContent.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    logger.success('generation', `Modèle extrait avec succès`, {
      fields: Object.keys(parsed),
    });
    return parsed;
  } catch (e) {
    logger.error('generation', 'JSON invalide retourné par Gemini', jsonStr.slice(0, 500));
    throw new Error('Le JSON retourné par Gemini est invalide.');
  }
};

// ============================================
// ROBUST JSON EXTRACTION
// ============================================

/**
 * Extract JSON from Gemini response text, handling markdown fences,
 * extra text before/after, trailing commas, etc.
 */
const extractJSON = (rawText) => {
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
    throw new Error('No JSON found');
  }

  const end = str.lastIndexOf(endChar);
  if (end <= start) throw new Error('Malformed JSON');

  let extracted = str.slice(start, end + 1);

  // 4. Remove trailing commas before } or ]
  extracted = extracted.replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(extracted);
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
  "negative_prompt": "things to avoid in this specific location (e.g. crowds, cars, modern objects for a nature scene)"
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

/* ─── LOCATION PRESETS GENERATION ─── */

const LOCATION_PRESETS_PROMPT = `You are an expert at creating photo scene presets for a specific location.

Given a location with its details, generate EXACTLY 8 scene presets that make sense FOR THIS SPECIFIC LOCATION.
Each preset represents a different "vibe" or scenario that a model could do in this exact place.

IMPORTANT RULES:
- Each preset must be REALISTIC for the given location
- DO NOT suggest scenes that don't match the location (e.g. no "poolside" for a bedroom)
- camera_angle MUST be one of these EXACT values:
  "mirror selfie, phone visible", "high angle selfie", "low angle shot", "eye-level portrait",
  "over-the-shoulder view", "full body shot", "close-up portrait", "medium shot from waist up"
- pose MUST be a short english description (5-10 words max)
- expression MUST be one of these EXACT values:
  "soft natural smile", "seductive smirk", "playful lip bite", "serious model stare",
  "laughing candidly", "surprised playful look", "mouth slightly open, relaxed"
- label: emoji + short french name (max 3 words)
- desc: short french description (max 6 words)
- id: unique snake_case identifier

Output a JSON array of exactly 8 objects:
[
  {
    "id": "unique_id",
    "label": "emoji Nom Court",
    "desc": "courte description en français",
    "scene": {
      "camera_angle": "one of the EXACT values above",
      "pose": "short english pose description",
      "expression": "one of the EXACT values above"
    }
  }
]

RULES:
1. Output ONLY the JSON array, no markdown, no explanation.
2. All scene values in English, labels and desc in French.
3. Make presets VARIED — different poses, angles, expressions.
4. Think about what people ACTUALLY do in this specific location.`;

/**
 * Generate 8 location-specific scene presets via Gemini.
 * Called once at location creation, results stored with the location.
 * @param {string} apiKey
 * @param {object} location - { name, environment, default_lighting, ... }
 * @returns {Promise<Array>} Array of 8 preset objects
 */
export const generateLocationPresets = async (apiKey, location) => {
  const locationContext = [
    `Location: "${location.name}"`,
    `Environment: ${location.environment || 'not specified'}`,
    location.default_lighting ? `Lighting: ${location.default_lighting}` : null,
    location.anchor_details ? `Key objects: ${location.anchor_details}` : null,
    location.time_of_day ? `Time: ${location.time_of_day}` : null,
  ].filter(Boolean).join('\n');

  logger.info('generation', `Generating presets for "${location.name}"`, { model: GEMINI_TEXT_MODEL });

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: `${locationContext}\n\n${LOCATION_PRESETS_PROMPT}` }],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const url = `${API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const t0 = Date.now();
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${res.status}`;
    logger.error('generation', `Presets generation HTTP ${res.status} (${elapsed}s)`, msg);
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.filter(p => p.text).map(p => p.text).join('') || '';

  try {
    const parsed = extractJSON(text);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    if (arr.length === 0) throw new Error('Empty array');
    logger.success('generation', `${arr.length} presets générés en ${elapsed}s pour "${location.name}"`);
    return arr.slice(0, 8);
  } catch (e) {
    logger.error('generation', 'JSON invalide pour presets lieu', text.slice(0, 500));
    throw new Error('Gemini a retourné un format invalide pour les presets. Réessaie.');
  }
};
