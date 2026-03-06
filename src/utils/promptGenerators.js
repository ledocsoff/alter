// promptGenerators.js
// Moteur de génération Matrice d'Ancrage v3 — Nano Virtual Edition
// Chaque champ = description narrative détaillée pour cohérence maximale
// nanoVirtualMode: active le pack de verrouillage virtuel (ON par défaut)

import logger from './logger';

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

// Core negative directives (Gemini-optimized: clear instructions > keyword lists)
const NEGATIVE_DIRECTIVES_BASE = [
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

// Nano Virtual Mode — extended anti-normalization directives
const NEGATIVE_DIRECTIVES_NANO = [
  "anatomy normalization", "body proportion averaging",
  "smaller bust than reference", "flattened or compressed breasts",
  "tightened, lifted, or artificially supported breasts",
  "slimmed torso", "beauty standard enforcement",
  "dataset-average female anatomy",
  "skin smoothing", "airbrushed texture",
  "editorial fashion proportions",
  "camera angles that reduce volume", "depth flattening", "beautification filters",
];

// ============================================
// MATRICE JSON D'ANCRAGE — Prompt principal
// Signature: (model, scene, activeAccount, options)
// options: { nanoVirtualMode, globalSeed, characterId }
// ============================================
export const generateAnchorMatrix = (model, scene, activeAccount = null, options = {}) => {
  const {
    nanoVirtualMode = true,   // ON by default — backward compat: pass false to disable
    globalSeed,
    characterId,
  } = options;

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

  // Build final negative directives string
  const allNegDirectives = nanoVirtualMode
    ? [...NEGATIVE_DIRECTIVES_BASE, ...NEGATIVE_DIRECTIVES_NANO]
    : NEGATIVE_DIRECTIVES_BASE;

  const customNeg = scene.custom_negative_prompt?.trim();
  const negativeStr = customNeg
    ? [...allNegDirectives, customNeg].join(', ')
    : allNegDirectives.join(', ');

  // Resolve seed — priority: globalSeed option > scene.seed
  const effectiveSeed = globalSeed || scene.seed || null;

  // Build anatomical fidelity — enhanced in Nano Virtual Mode
  const baseAnatomicalFidelity = get(model, 'anatomical_fidelity') || 'Preserve exact anatomical proportions from reference.';
  const nanoAnatomicalFidelity = nanoVirtualMode
    ? `${baseAnatomicalFidelity} Never normalize or average body proportions. Preserve all natural volume, soft tissue behavior, sag, projection and asymmetry exactly as described. This is a virtual model with locked proportions — NO anatomy correction allowed.`
    : baseAnatomicalFidelity;

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

    style: "Casual amateur photo for Instagram/TikTok. Smartphone camera: deep focus, 26mm wide lens, no bokeh, no studio lighting. Photorealistic: visible skin texture, natural imperfect lighting, no retouching, no beauty filter. Like a friend took this photo with their phone.",

    negative_prompt: negativeStr,
  };

  // Add custom details if present
  if (scene.custom_details?.trim()) {
    rawMatrix.custom_details = scene.custom_details.trim();
  }

  // === DIRECTIVES (base) ===
  rawMatrix.directives = {
    identity_lock: "Maintain exact same face across all generations. Same person, consistent identity. Consistent skin color and body proportions.",
    anatomical_fidelity: nanoAnatomicalFidelity,
  };

  // Aesthetic signature if model has one
  const sig = get(model, 'signature');
  if (sig) rawMatrix.directives.aesthetic_signature = sig;

  if (effectiveSeed) {
    rawMatrix.directives.seed = effectiveSeed;
  }

  // Spatial lock for anchored locations
  if (meta.anchor_details) {
    rawMatrix.directives.spatial_lock = "Background must remain spatially consistent: same furniture placement, same objects visible.";
  }

  // === NANO VIRTUAL MODE — Extended Identity Lock ===
  if (nanoVirtualMode) {
    const resolvedCharacterId = characterId || (model.name ? `MODEL_${model.name.toUpperCase().replace(/\s+/g, '_')}` : 'MODEL_V01');

    // Virtual model lock on subject
    rawMatrix.subject.virtual_model_lock =
      "This is ALWAYS the exact same virtual model. Same face, same body proportions, same skin tone, same hair texture. NEVER change identity between shots.";

    // ControlNet simulation (inform Gemini about 3D volume expectations)
    rawMatrix.virtual_depth_simulation = {
      pose_guidance: "Preserve exact shoulder width, hip angle, and spine curvature from subject description. No pose compression.",
      volume_guidance: "Preserve chest/hip foreground dominance. Prevent flat or depth-compressed rendering. Maintain realistic 3D soft tissue volume.",
      realism_guidance: "Raw iPhone 15 Pro / 24mm lens aesthetic. Subtle digital grain, natural imperfect ambient lighting, visible skin texture and pores.",
    };

    // Extended directives for virtual model
    rawMatrix.directives.global_seed = effectiveSeed;
    rawMatrix.directives.character_seed = effectiveSeed;
    rawMatrix.directives.environment_swap_mode = "model_locked";
    rawMatrix.directives.virtual_model_rule =
      "Only the environment section may change between shots. Model face, anatomy, skin, hair are 100% locked by character_seed. NEVER update, average or normalize the model's appearance.";
  }

  // Platform compliance
  if (activeAccount) {
    const p = activeAccount.platform;
    const compliance = {
      Instagram: "Content suitable for Instagram. Casual amateur photo.",
      TikTok: "Content suitable for TikTok. Casual amateur photo.",
      Tinder: "Dating profile photo. Approachable, attractive, natural.",
    };
    rawMatrix.platform = {
      compliance: compliance[p] || null,
    };
  }

  // Remove all null/empty fields for a cleaner prompt
  const matrix = compact(rawMatrix);

  logger.verbose('prompt', '📝 buildPromptMatrix (Nano Virtual Edition)', {
    nanoVirtualMode,
    characterId: matrix.subject?.character_id || null,
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
