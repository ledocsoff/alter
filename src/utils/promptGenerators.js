// promptGenerators.js
// Moteur de génération Matrice d'Ancrage v2
// Chaque champ = description narrative détaillée pour cohérence maximale
// Refactoré: negative prompt simplifié, champs null supprimés, ControlNet retiré

import { debugLogger } from './debugLogger';

// Helper: accès safe aux propriétés imbriquées
const get = (obj, path, fallback = null) => {
  if (!obj) return fallback;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return fallback;
    current = current[key];
  }
  return current != null ? current : fallback;
};

// Helper: joindre des fragments non-null en phrase narrative
const narrate = (...parts) => parts.filter(Boolean).join(', ') || null;

// Helper: joindre en phrases séparées par des points
const sentences = (...parts) => parts.filter(Boolean).join('. ') || null;

// Helper: remove null/undefined values from an object recursively
const compact = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(compact).filter(v => v != null);
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const cleaned = compact(v);
    if (cleaned != null && cleaned !== '') result[k] = cleaned;
  }
  return Object.keys(result).length > 0 ? result : null;
};

// Normalize shorthand photo_type values from AI presets to full prompt strings
const PHOTO_TYPE_NORMALIZE = {
  'selfie': 'selfie taken by the model herself, phone in hand, arm extended or close',
  'third_person': 'photo taken by another person, natural framing, no phone visible',
  'mirror': 'mirror selfie, full body reflection, phone visible in hand',
};

// Simplified negative prompt — focused directives instead of 120+ keyword spam
// Gemini is NOT Stable Diffusion; it responds better to clear instructions than keyword lists
const NEGATIVE_DIRECTIVES = [
  // Core quality
  "low quality", "blurry", "deformed anatomy", "extra fingers", "mutated hands",
  // Anti-AI look
  "AI generated", "plastic skin", "uncanny valley", "over-processed",
  // Anti-DSLR (keep smartphone feel)
  "bokeh", "shallow DOF", "DSLR look", "studio lighting", "blurred background",
  // Anti-illustration
  "3d render", "cartoon", "anime", "cgi", "painting",
  // Anti-overlay
  "watermark", "text", "logo", "phone UI", "status bar",
  // Scene consistency
  "inconsistent background",
];

// ============================================
// MATRICE JSON D'ANCRAGE — Prompt principal
// ============================================
export const generateAnchorMatrix = (model, scene, activeAccount = null) => {
  const meta = scene.location_meta || {};

  // === SUBJECT ===
  const ageStr = model.age ? `${model.age} years old` : null;
  const demographics = narrate(
    'Young adult female',
    get(model, 'ethnicity'),
    ageStr,
    get(model, 'body.type') ? `${get(model, 'body.type')} body type` : null,
    get(model, 'body.height'),
  );

  const hairDesc = narrate(
    get(model, 'hair.color') ? `${get(model, 'hair.color')} hair` : null,
    get(model, 'hair.length'),
    get(model, 'hair.texture'),
    get(model, 'hair.style') ? `styled ${get(model, 'hair.style')}` : null,
  );

  // Face — build a coherent narrative
  const faceNarrative = sentences(
    get(model, 'face.shape') ? `${get(model, 'face.shape')} face shape` : null,
    get(model, 'face.jawline') ? `${get(model, 'face.jawline')} jawline` : null,
    get(model, 'face.forehead') ? `Forehead: ${get(model, 'face.forehead')}` : null,
    get(model, 'eyes.color') ? `${get(model, 'eyes.color')} ${get(model, 'eyes.shape') || ''} eyes, ${get(model, 'eyes.size') || ''}, ${get(model, 'eyes.lashes') || ''}, ${get(model, 'eyes.brows') || ''}` : null,
    get(model, 'nose.shape') ? `${get(model, 'nose.shape')} nose` : null,
    get(model, 'lips.shape') ? `${get(model, 'lips.shape')} lips, ${get(model, 'lips.upper') || ''}, ${get(model, 'lips.lower') || ''}` : null,
  );

  const anatomyDesc = sentences(
    get(model, 'body.bust'),
    get(model, 'body.waist') ? `Waist: ${get(model, 'body.waist')}` : null,
    get(model, 'body.hips') ? `Hips: ${get(model, 'body.hips')}` : null,
    get(model, 'body.glutes') ? `Glutes: ${get(model, 'body.glutes')}` : null,
    get(model, 'body.limbs'),
    get(model, 'body.details'),
  );

  const skinDesc = narrate(
    get(model, 'skin.tone') ? `${get(model, 'skin.tone')} skin tone` : null,
    get(model, 'skin.texture'),
    get(model, 'skin.features'),
    get(model, 'skin.sheen'),
    get(model, 'skin.details'),
  );

  // Append custom negative prompt if user provided one
  const customNeg = scene.custom_negative_prompt?.trim();
  const negativeStr = customNeg
    ? [...NEGATIVE_DIRECTIVES, customNeg].join(', ')
    : NEGATIVE_DIRECTIVES.join(', ');

  // Build matrix — only include fields with values (compact removes nulls)
  const rawMatrix = {
    // PHOTO TYPE — top-level for maximum AI attention
    photo_type: PHOTO_TYPE_NORMALIZE[scene.photo_type] || scene.photo_type || "photo taken by another person, natural framing, no phone visible",

    subject: {
      demographics,
      hair: hairDesc,
      face: faceNarrative,
      apparel: scene.outfit?.value || "casual outfit",
      anatomy: anatomyDesc,
      skin_details: skinDesc,
    },

    pose: {
      body_position: scene.pose || "natural relaxed pose",
      expression: scene.expression || null,
    },

    environment: {
      setting: scene.environment || null,
      background_elements: meta.anchor_details || null,
      time_of_day: meta.time_of_day || null,
    },

    camera: {
      angle: scene.camera_angle || null,
    },

    lighting: {
      source: scene.lighting || null,
      color_palette: meta.color_palette || null,
    },

    vibe: scene.vibe || null,

    style: "Fashion lifestyle photo for Instagram. Resort editorial, sun-kissed lighting. Smartphone camera: deep focus, 26mm wide lens, no bokeh. Photorealistic: visible skin texture, natural light, no retouching.",

    negative_prompt: negativeStr,
  };

  // Add custom details if present
  if (scene.custom_details?.trim()) {
    rawMatrix.custom_details = scene.custom_details.trim();
  }

  // Identity lock directives
  rawMatrix.directives = {
    identity_lock: "Maintain exact same face across all generations. Same person, consistent identity. Consistent skin color and body proportions.",
    anatomical_fidelity: get(model, 'anatomical_fidelity') || "Preserve exact anatomical proportions from reference.",
  };

  // Aesthetic signature if model has one
  const sig = get(model, 'signature');
  if (sig) rawMatrix.directives.aesthetic_signature = sig;

  if (scene.seed) {
    rawMatrix.directives.seed = scene.seed;
  }

  // Spatial lock for anchored locations
  if (meta.anchor_details) {
    rawMatrix.directives.spatial_lock = "Background must remain spatially consistent: same furniture placement, same objects visible.";
  }

  // Platform compliance
  if (activeAccount) {
    const p = activeAccount.platform;
    const compliance = {
      Instagram: "Content suitable for Instagram. Tasteful fashion editorial.",
      TikTok: "Content suitable for TikTok. Tasteful fashion editorial.",
      Tinder: "Dating profile photo. Approachable, attractive, natural.",
    };
    rawMatrix.platform = {
      name: p,
      handle: activeAccount.handle,
      compliance: compliance[p] || null,
    };
  }

  // Remove all null/empty fields for a cleaner prompt
  const matrix = compact(rawMatrix);

  debugLogger.prompt('buildPromptMatrix', {
    photo_type: matrix.photo_type,
    subject_demographics: matrix.subject?.demographics,
    apparel: matrix.subject?.apparel,
    pose: matrix.pose?.body_position,
    environment: matrix.environment?.setting,
    camera_angle: matrix.camera?.angle,
    seed: matrix.directives?.seed || null,
    matrixSize: JSON.stringify(matrix).length,
  });

  return matrix;
};
