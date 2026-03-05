// Wrapper pour l'API Google Gemini — génération d'images
// Supporte deux clés API distinctes (AI Studio + GCP) pour doubler les quotas
// Les deux utilisent le même endpoint Gemini (generativelanguage.googleapis.com)

import logger from './logger';
import { debugLogger } from './debugLogger';

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

    const shuffled = [...IMPERFECTIONS].sort(() => Math.random() - 0.5);
    const imperfectionText = `\n\nIMPERFECTION LAYER (add these realistic details):\n- ${shuffled.slice(0, 3).join('\n- ')}`;

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
- If it contains "selfie": the model is taking her OWN photo. Her phone and arm MUST be visible. The angle is from her extended arm.
- If it contains "another person" or "third_person": someone ELSE is taking the photo. NO phone visible in the frame. NO selfie arm. Natural photography framing.
- If it contains "mirror": the model is seen in a MIRROR REFLECTION. Phone visible in her hand in the reflection. Full body in mirror.
NEVER add selfie elements (phone, arm) if photo_type says "another person" or "third_person".

RULE #4 — SMARTPHONE CAMERA:
The output must look like a casual photo taken with an iPhone.
- Deep focus: everything sharp (foreground AND background). NO background blur. NO bokeh.
- 26mm smartphone wide lens. Natural phone sensor noise. Auto white balance.

RULE #5 — JSON FIDELITY:
Reproduce every field of the JSON prompt. Each block maps to a visual element.

RULE #6 — BODY PRESERVATION:
NEVER normalize or "correct" body proportions. Celebrate real bodies.

RULE #7 — NEGATIVE PROMPT:
The "negative_prompt" lists forbidden elements. Never produce anything listed there.${imperfectionText}

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

    // Debug: log full prompt sent
    debugLogger.prompt('generateImage', {
      promptText: promptText.slice(0, 2000),
      aspectRatio,
      historyTurns,
      seed: options.seed || null,
      systemInstruction: body.system_instruction?.parts?.[0]?.text?.slice(0, 300) + '...',
    });

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
    debugLogger.apiResponse('generateImage', { elapsed: `${elapsed}s`, status: res.status });
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

const LOCATION_PRESETS_PROMPT = `You are a creative director for casual Instagram and TikTok content. You specialize in amateur-looking, natural lifestyle photography — like a real person posting their daily life, NOT like a brand campaign.

Given a location, generate content presets for casual social media content:

1. EXACTLY 8 scene presets (ambiances) — each a different casual mood (lazy morning, golden hour chill, spontaneous mirror check, rainy day inside, etc.)
2. EXACTLY 8 outfit suggestions — real everyday fashion: loungewear, casual wear, swimwear, gym clothes, going-out looks. Described like a real person would wear them.
3. EXACTLY 8 pose suggestions — NATURAL and CASUAL. NOT professional model poses. Think: "how would a normal person stand when a friend says let me take a pic".

CREATIVE DIRECTION:
- Think: "What would a real 22-year-old girl post on her Instagram story?"
- Outfits: describe like a real person would — fabric, color, vibe. Example: "ribbed cream tank top tucked into high-waisted mom jeans, white Air Force 1s" instead of just "casual outfit".
- Poses: describe naturally — NOT like a photographer directing a model. Example: "leaning against doorframe, one hand on hip, looking at phone casually" instead of "weight shifted to back leg, editorial posture".
- Mood: each preset should feel like a real moment — morning coffee, getting ready, bored afternoon, post-workout, night out getting ready, etc.

PHOTO TYPE RULES:
- photo_type defines WHO takes the photo. MUST be one of these EXACT values:
  "selfie" = the model takes her own photo (phone in hand, arm visible)
  "third_person" = someone else takes the photo (natural framing, no phone visible) 
  "mirror" = mirror selfie (phone visible in reflection, full body in mirror)
- "mirror" is ONLY allowed if the location has a mirror (bathroom, gym, locker room, bedroom with mirror). NEVER use "mirror" for outdoor locations.
- Mix it up: "selfie" for intimate moments, "third_person" for casual friend shots, "mirror" when location allows.

TECHNICAL:
- camera_angle MUST be one of: "high angle shot, looking down", "low angle shot, looking up", "eye-level shot", "over-the-shoulder view", "full body shot", "close-up portrait", "medium shot from waist up"
- pose: 5-12 words, describe body position like a friend would see it (NOT model direction)
- expression MUST be one of: "soft natural smile", "seductive smirk", "playful lip bite", "serious model stare", "laughing candidly", "surprised playful look", "mouth slightly open, relaxed"
- outfit: DETAILED description (10-20 words) — fabric, cut, color, accessories, but CASUAL not editorial

ALL "label"/"labelFR" fields in FRENCH. All "value"/"promptEN" fields in English.

Output JSON:
{
  "presets": [
    {
      "id": "unique_id",
      "label": "emoji Nom Court EN FRANCAIS",
      "desc": "mood/vibe casual en francais",
      "scene": {
        "photo_type": "selfie OR third_person OR mirror",
        "camera_angle": "EXACT camera value",
        "pose": "natural body position in english",
        "expression": "EXACT expression value",
        "outfit": "detailed casual fashion description"
      }
    }
  ],
  "outfits": [
    {
      "id": "unique_outfit_id",
      "label": "Nom EN FRANCAIS",
      "value": "complete casual outfit description: fabric type, cut, color, fit details, shoes or accessories",
      "icon": "single emoji"
    }
  ],
  "poses": [
    {
      "id": "unique_pose_id",
      "labelFR": "Nom court en francais",
      "promptEN": "natural body position, casual stance (5-12 words)"
    }
  ]
}

OUTPUT RULES:
1. JSON ONLY, no markdown.
2. Outfit descriptions must sound like what a real person wears — specific fabrics (ribbed knit, jersey, denim, cotton), cuts (high-waisted, cropped, oversized), colors (cream, sage, washed black).
3. Pose descriptions must sound natural and unposed — NOT professional model direction.
4. Every preset must feel like a real casual moment, not a photoshoot concept.
5. Vary everything: moods, angles, outfits, poses, photo_types.`;




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
    `Environment: ${location.environment || 'not specified'} `,
    location.default_lighting ? `Lighting: ${location.default_lighting} ` : null,
    location.anchor_details ? `Key objects: ${location.anchor_details} ` : null,
    location.time_of_day ? `Time: ${location.time_of_day} ` : null,
  ].filter(Boolean).join('\n');

  logger.info('generation', `Generating presets for "${location.name}"`, { model: GEMINI_TEXT_MODEL });

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: `${locationContext}\n\n${LOCATION_PRESETS_PROMPT} ` }],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const url = `${API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  debugLogger.locationGen('Envoi prompt presets', location.name, { prompt: locationContext, model: GEMINI_TEXT_MODEL });
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

    // Validate and filter items to ensure required fields exist
    const validPreset = p => p && typeof p === 'object' && p.id && p.label && p.scene;
    const validOutfit = o => o && typeof o === 'object' && o.id && o.label && o.value;
    const validPose = p => p && typeof p === 'object' && p.promptEN && p.labelFR;

    // Handle both { presets, outfits, poses } and flat array format
    let presets, outfits, poses;
    if (Array.isArray(parsed)) {
      presets = parsed.filter(validPreset);
      outfits = [];
      poses = [];
    } else {
      presets = (Array.isArray(parsed.presets) ? parsed.presets : []).filter(validPreset);
      outfits = (Array.isArray(parsed.outfits) ? parsed.outfits : []).filter(validOutfit);
      poses = (Array.isArray(parsed.poses) ? parsed.poses : []).filter(validPose);
    }

    if (presets.length === 0) throw new Error('No valid presets generated');

    logger.success('generation', `${presets.length} presets + ${outfits.length} outfits + ${poses.length} poses en ${elapsed}s pour "${location.name}"`);
    debugLogger.locationGen('Presets reçus', location.name, { presets: presets.length, outfits: outfits.length, poses: poses.length, elapsed: `${elapsed}s` });
    return { presets: presets.slice(0, 8), outfits: outfits.slice(0, 8), poses: poses.slice(0, 8) };
  } catch (e) {
    logger.error('generation', 'Presets invalides', `${e.message} — raw: ${text.slice(0, 300)}`);
    throw new Error('Gemini a retourné un format invalide pour les presets. Réessaie.');
  }
};

/* ─── SMART PROMPT — Natural Language → JSON Matrix ─── */

const SMART_PROMPT_INSTRUCTION = `Tu es un directeur de photographie amateur/Instagram. L'utilisateur décrit une scène en langage naturel. Tu dois générer une matrice JSON optimisée pour la génération d'image.

CONTEXTE FOURNI (READ-ONLY — NE PAS MODIFIER):
- Les données du modèle (physique, visage, corps) → recopie-les EXACTEMENT dans "subject"
- Les données du lieu (environment, lighting) → recopie-les EXACTEMENT dans "environment"

CE QUE TU PEUX VARIER (basé sur la description de l'utilisateur):
- pose.body_position : la pose décrite
- pose.expression : l'expression faciale
- camera.angle : l'angle de caméra
- photo_type : selfie / third_person / mirror (selon la description)
- vibe : l'ambiance générale
- subject.apparel : la tenue (si décrite, sinon "casual outfit")

FORMAT DE SORTIE (JSON strict, rien d'autre):
{
  "photo_type": "selfie taken by the model herself, phone in hand, arm extended or close" | "photo taken by another person, natural framing, no phone visible" | "mirror selfie, full body reflection, phone visible in hand",
  "subject": {
    "demographics": "...(recopié du modèle)",
    "hair": "...(recopié du modèle)",
    "face": "...(recopié du modèle)",
    "apparel": "description détaillée de la tenue en anglais",
    "anatomy": "...(recopié du modèle)",
    "skin_details": "...(recopié du modèle)"
  },
  "pose": {
    "body_position": "description détaillée de la pose en anglais",
    "expression": "expression faciale en anglais"
  },
  "environment": {
    "setting": "...(recopié du lieu)",
    "background_elements": "...(recopié du lieu)",
    "time_of_day": "...(recopié du lieu)"
  },
  "camera": {
    "angle": "angle de caméra en anglais"
  },
  "lighting": {
    "source": "...(recopié du lieu ou adapté)"
  },
  "vibe": "ambiance/mood en anglais",
  "style": "Casual amateur photo for Instagram/TikTok. Smartphone camera: deep focus, 26mm wide lens, no bokeh. Like a friend took this photo.",
  "negative_prompt": "low quality, blurry, deformed anatomy, extra fingers, AI generated, plastic skin, bokeh, DSLR, studio lighting, 3d render, cartoon, watermark, phone UI, inconsistent background"
}

RÈGLES:
1. Réponds UNIQUEMENT avec le JSON, pas de commentaires
2. Tout le texte dans le JSON doit être en ANGLAIS
3. La description de pose doit être naturelle et amateur, pas de pose de mannequin pro
4. Si l'utilisateur ne précise pas quelque chose, utilise les valeurs du contexte
5. L'apparel doit être une description fashion détaillée même si l'utilisateur dit juste "en maillot"`;

/**
 * Generate an optimized JSON prompt matrix from a natural language description.
 * Uses Gemini TEXT to convert casual user input into structured prompt.
 * @param {string} apiKey
 * @param {string} userText - Natural language description in any language
 * @param {object} modelData - Model traits (demographics, body, hair, face, skin)
 * @param {object} locationData - Location data (environment, lighting, props)
 * @returns {Promise<object>} - Optimized JSON matrix
 */
export const generateSmartPrompt = async (apiKey, userText, modelData, locationData) => {
  return withRetry(async () => {
    const modelContext = `
MODÈLE (données physiques — recopier tel quel):
- Ethnie: ${modelData.ethnicity || 'non spécifié'}
- Âge: ${modelData.age || 'jeune adulte'}
- Corps: ${modelData.body?.type || 'non spécifié'}, ${modelData.body?.height || ''}
- Cheveux: ${modelData.hair?.color || ''} ${modelData.hair?.length || ''} ${modelData.hair?.texture || ''}
- Visage: ${modelData.face?.shape || ''}, yeux ${modelData.eyes?.color || ''}
- Peau: ${modelData.skin?.tone || ''} ${modelData.skin?.texture || ''}
- Anatomie: ${modelData.body?.bust || ''}, hanches ${modelData.body?.hips || ''}, taille ${modelData.body?.waist || ''}`;

    const locationContext = locationData ? `
LIEU (environnement — recopier tel quel):
- Nom: ${locationData.name || ''}
- Environnement: ${locationData.environment || ''}
- Éclairage: ${locationData.default_lighting || ''}
- Ambiance: ${locationData.default_vibe || ''}
- Décor/props: ${locationData.anchor_details || ''}
- Moment: ${locationData.time_of_day || ''}
- Palette: ${locationData.color_palette || ''}` : '';

    const prompt = `${modelContext}\n${locationContext}\n\nDESCRIPTION DE L'UTILISATEUR:\n"${userText}"\n\nGénère la matrice JSON optimisée.`;

    logger.info('generation', `Smart prompt: "${userText.slice(0, 80)}..."`);
    debugLogger.prompt('smartPrompt:input', { userText, hasModel: !!modelData, hasLocation: !!locationData });

    const body = {
      system_instruction: { parts: [{ text: SMART_PROMPT_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const url = `${API_BASE}/${MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const t0 = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(fetchErr => {
      const e = new Error(`Erreur réseau: ${fetchErr.message}`);
      e._retryable = true;
      throw e;
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `Erreur ${res.status}`;
      if (RETRYABLE_CODES.includes(res.status)) {
        const e = new Error(res.status === 429 ? 'Quota dépassé.' : `Serveur saturé (${res.status})`);
        e._retryable = true;
        throw e;
      }
      throw new Error(msg);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const matrix = JSON.parse(text);
      logger.success('generation', `Smart prompt → JSON en ${elapsed}s`);
      debugLogger.prompt('smartPrompt:output', { elapsed: `${elapsed}s`, keys: Object.keys(matrix) });
      return matrix;
    } catch {
      throw new Error('Smart prompt: réponse invalide. Réessaie.');
    }
  }, 'smart-prompt');
};

/* ─── LOCATION IMAGE GENERATION ─── */

/**
 * Generate a photorealistic image of a location environment (no person).
 * Used as visual reference anchor for consistent scene generation.
 * @param {string} apiKey
 * @param {object} location - { environment, anchor_details, default_lighting, default_vibe, color_palette, time_of_day, name }
 * @returns {Promise<{ imageBase64: string, mimeType: string }>}
 */
export const generateLocationImage = async (apiKey, location) => {
  return withRetry(async () => {
    const locationDesc = [
      `Location name: "${location.name}"`,
      `Environment: ${location.environment}`,
      location.anchor_details ? `Key details/props: ${location.anchor_details}` : null,
      location.default_lighting ? `Lighting: ${location.default_lighting}` : null,
      location.default_vibe ? `Vibe/mood: ${location.default_vibe}` : null,
      location.color_palette ? `Color palette: ${location.color_palette}` : null,
      location.time_of_day ? `Time of day: ${location.time_of_day}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Generate a photorealistic EMPTY environment photograph based on this description:

${locationDesc}

CRITICAL RULES:
- Absolutely NO person, NO human, NO silhouette, NO body parts in the image
- Show ONLY the environment, background, decor, furniture, props
- Must be photorealistic (not illustration, not painting, not 3D render)
- High quality, sharp focus on the environment details
- The image should feel like a "before" shot where a model will be placed later
- Include all specific props and details mentioned above`;

    logger.info('generation', `Generating location image for "${location.name}"`);

    const body = {
      system_instruction: {
        parts: [{ text: `You are a photorealistic environment photographer. You generate images of EMPTY locations — no people. Focus on accurately reproducing the described space with correct lighting, colors, props, and atmosphere. The images will be used as visual references for consistent scene reproduction.` }]
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '16:9' },
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const url = `${API_BASE}/${MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const t0 = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(fetchErr => {
      const e = new Error(`Erreur réseau: ${fetchErr.message}`);
      e._retryable = true;
      throw e;
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `Erreur ${res.status}`;
      logger.error('api', `Location image HTTP ${res.status} (${elapsed}s)`, msg);
      if (RETRYABLE_CODES.includes(res.status)) {
        const e = new Error(res.status === 429 ? 'Quota dépassé.' : `Serveur saturé (${res.status})`);
        e._retryable = true;
        throw e;
      }
      throw new Error(msg);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    let imageBase64 = null;
    let mimeType = 'image/png';

    for (const part of parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'image/png';
      }
    }

    if (!imageBase64) {
      const textParts = parts.filter(p => p.text).map(p => p.text).join(' ');
      throw new Error('Aucune image générée. ' + (textParts || 'Réessaie.'));
    }

    logger.success('generation', `Image lieu "${location.name}" générée en ${elapsed}s`);
    return { imageBase64, mimeType };
  }, 'location-image');
};

