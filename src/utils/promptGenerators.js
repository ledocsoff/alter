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
  'selfie': 'POV extreme close-up selfie portrait, arm outstretched to hold the unseen lens, framing tightly on face and upper chest, ABSOLUTELY NO PHONE VISIBLE IN FRAME',
  'third_person': 'photo taken by another person, natural framing, no phone visible',
  'normal': 'photo taken by another person, natural framing, no phone visible',
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
  // Anti-overlay & Anti-device
  "watermark", "text", "logo", "phone UI", "status bar", "holding a phone", "showing a phone", "camera in frame",
  // Scene consistency & Apparel identity leaks
  "inconsistent background",
  "different face", "face changed", "different person", "age changed", "ethnicity changed",
  "face on clothes", "skin texture on fabric", "wrong clothing on model",
];

// Nano Virtual Mode — strict anti-normalization directives based on Grok analysis
const NEGATIVE_DIRECTIVES_NANO = [
  "anatomy normalization", "body proportion averaging",
  "smaller bust than reference", "flattened or compressed breasts",
  "tightened/lifted breasts", "dataset-average female anatomy",
  "slimmed torso", "beauty standard enforcement",
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
  const rawFaceNarrative = sentences(
    get(model, 'face.shape') ? `${get(model, 'face.shape')} face shape` : null,
    get(model, 'face.jawline') ? `${get(model, 'face.jawline')} jawline` : null,
    get(model, 'face.forehead') ? `Forehead: ${get(model, 'face.forehead')}` : null,
    get(model, 'eyes.color') ? `${get(model, 'eyes.color')} ${get(model, 'eyes.shape') || ''} eyes, ${get(model, 'eyes.size') || ''}, ${get(model, 'eyes.lashes') || ''}, ${get(model, 'eyes.brows') || ''}` : null,
    get(model, 'nose.shape') ? `${get(model, 'nose.shape')} nose` : null,
    get(model, 'lips.shape') ? `${get(model, 'lips.shape')} lips, ${get(model, 'lips.upper') || ''}, ${get(model, 'lips.lower') || ''}` : null,
  );
  const faceNarrative = (rawFaceNarrative?.length || 0) < 20
    ? (rawFaceNarrative ? rawFaceNarrative + ", " : "") + "wide-set almond eyes, softly arched eyebrows, defined cupid's bow, soft jawline, clinical preservation of facial ratios"
    : rawFaceNarrative;

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

  // ANTI-FILTRE V2.1 – Modesty Level (Auto-detected from Director JSON or manually set)
  const modestyLevel = scene.directives?.modestyLevel || scene.modestyLevel || meta.modestyLevel || 'medium';

  const customNeg = scene.custom_negative_prompt?.trim();
  let negativeStr = customNeg
    ? [...allNegDirectives, customNeg].join(', ')
    : allNegDirectives.join(', ');

  // FULL ANTI-NORMALIZATION 2026 NEGATIVE
  negativeStr = "anatomy normalization, body proportion averaging, smaller bust than reference, flattened or compressed breasts, tightened breasts, lifted breasts, slimmed torso, dataset-average female anatomy, skin smoothing, airbrushed texture, beauty standard enforcement, camera angles that reduce volume, depth flattening, " + negativeStr;

  // Resolve seed — priority: globalSeed option > scene.seed
  const effectiveSeed = globalSeed || scene.seed || null;

  // Build anatomical fidelity — enhanced in Nano Virtual Mode
  const baseAnatomicalFidelity = get(model, 'anatomical_fidelity') || 'Preserve exact anatomical proportions from reference.';
  const nanoAnatomicalFidelity = nanoVirtualMode
    ? `${baseAnatomicalFidelity} Ultra clinical anatomical fidelity: soft tissue behavior, natural sag, forward projection, NO normalization ever.`
    : baseAnatomicalFidelity;

  // ============================================
  // CONTEXT-AWARE FALLBACKS
  // ============================================
  const baseEnv = (scene.environment || meta.anchor_details || "").toLowerCase();

  // Intelligent Lighting Defaults
  let defaultLighting = "natural ambient lighting, appropriate for the scene, highlights on skin for realism";
  if (baseEnv.includes("gym") || baseEnv.includes("workout")) {
    defaultLighting = "warm window light mixed with gym LED, sweaty skin highlights, glowing skin";
  } else if (baseEnv.includes("night") || baseEnv.includes("dark") || baseEnv.includes("club")) {
    defaultLighting = "moody low light, practical environmental lights, subtle flash reflection, cinematic contrast";
  } else if (baseEnv.includes("bedroom") || baseEnv.includes("room") || baseEnv.includes("home")) {
    defaultLighting = "warm indoor lighting, cozy lamp light, mixed with practical LED accents, intimate mood";
  } else if (baseEnv.includes("outdoor") || baseEnv.includes("street") || baseEnv.includes("beach")) {
    defaultLighting = "bright natural sunlight, soft outdoor diffusion, golden hour warmth";
  }

  // Intelligent Camera Defaults
  let defaultCamera = "eye-level, slight low angle, subtle tilt for smartphone dynamism";
  if (scene.photo_type?.toLowerCase().includes("mirror")) {
    defaultCamera = "Mirror Selfie Mode: Camera is in front of the mirror. Reflection of the model + reflection of the arm + reflection of the phone must be visible in the mirror. Phone is visible ONLY in the mirror reflection, never directly. Correct mirror perspective and depth.";
  } else if (scene.photo_type?.toLowerCase().includes("selfie")) {
    defaultCamera = "close-up smartphone angle, candid selfie framing, arm stretched out completely off-screen holding unseen lens";
  }

  // Build matrix — only include fields with values (compact removes nulls)
  const rawMatrix = {
    // PHOTO TYPE — top-level for maximum AI attention
    photo_type: PHOTO_TYPE_NORMALIZE[scene.photo_type] || scene.photo_type || "candid photo taken by a friend, natural framing, no phone visible",

    subject: {
      demographics,
      hair: hairDesc,
      face: faceNarrative,
      apparel: scene.outfit?.value || "casual outfit",
      anatomy: anatomyDesc,
      skin_details: skinDesc,
    },

    pose: {
      body_position: scene.photo_type?.toLowerCase().includes("mirror")
        ? "selfie in mirror, reflection of arm and phone visible in mirror, correct mirror perspective, phone visible in reflection only"
        : (scene.photo_type?.toLowerCase().includes("selfie")
          ? "one arm extended far forward holding the unseen camera lens, phone completely invisible, tight framing on upper body"
          : (scene.pose || "natural relaxed pose")),
      expression: scene.expression || null,
    },

    environment: {
      setting: scene.environment || null,
      background_elements: meta.anchor_details || null,
      time_of_day: meta.time_of_day || null,
    },

    camera: {
      angle: scene.camera_angle || defaultCamera,
    },

    lighting: {
      source: scene.lighting || defaultLighting,
      color_palette: meta.color_palette || null,
    },

    vibe: scene.vibe || null,

    style_and_realism: {
      style: "Photorealistic amateur smartphone portrait for Instagram/TikTok",
      details: "Raw iPhone 15 Pro / 24mm lens aesthetic, subtle digital grain, visible pores, no retouching, natural imperfect lighting, like a friend took this photo"
    },

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
  if (sig) {
    // Retire ce qui force 'indoor' si on est en extérieur, etc.
    rawMatrix.directives.aesthetic_signature = sig.replace(/candid indoor portrait/g, 'candid lifestyle portrait');
  }

  if (effectiveSeed) {
    rawMatrix.directives.global_seed = effectiveSeed;
    rawMatrix.directives.character_seed = effectiveSeed;
  }

  rawMatrix.directives.environment_swap_mode = "model_locked";
  rawMatrix.directives.modestyLevel = modestyLevel;

  // Spatial lock for anchored locations
  if (meta.anchor_details) {
    rawMatrix.directives.spatial_lock = "Background is 100% identical to reference image. Same furniture placement, same lighting direction, same shadows, same reflections, same window light, same objects on table. Spatial Lock Level 4. Do not move anything.";
  }

  // === NANO VIRTUAL MODE — Extended Identity Lock ===
  if (nanoVirtualMode) {
    const resolvedCharacterId = characterId || (model.name ? `MODEL_${model.name.toUpperCase().replace(/\s+/g, '_')}` : 'MODEL_V01');

    // Virtual model lock on subject
    rawMatrix.subject.virtual_model_lock =
      "This is ALWAYS the exact same virtual model. Same face, same body proportions, same skin tone, same hair texture. NEVER change identity between shots.";
    if (resolvedCharacterId) rawMatrix.subject.character_id = resolvedCharacterId;

    // Dynamic ControlNet simulation logic based on framing
    let volumeGuidance = "body mass and fabric draping correctly responding to gravity and water texture, ZoeDepth structural volume preservation";
    let poseGuidance = "natural weight distribution, physical depth interaction, DWPose priority on limb grounding";
    if (scene.photo_type?.includes("selfie") || scene.photo_type?.includes("mirror")) {
      volumeGuidance = "Selfie perspective volume: maintain realistic soft tissue depth without wide-angle fish-eye distortion. Preserve authentic body proportions.";
    }

    // --- 🥊 ANTI-FILTER ABSTRACTION (Semantic Cloaking) ---
    // Inject technical framing if environment or apparel suggests high-risk filter terms
    const envString = (scene.environment + ' ' + (scene.outfit?.value || '')).toLowerCase();
    const isHighRisk = /(beach|pool|swim|water|bed|intimate|shower|bath|summer)/.test(envString);
    let realismGuid = "Raw iPhone 15 Pro / 24mm lens aesthetic. Subtle digital grain, natural imperfect ambient lighting, visible skin texture and pores.";

    if (isHighRisk) {
      realismGuid += " Technical fashion rendering for fit and drape analysis. Professional active-wear or loungewear showcase. Subject is engaged in athletic or professional showcase.";
      // ANTI-FILTRE V2.2 – Modesty Level équilibré
      if (modestyLevel === 'high') {
        realismGuid += " Natural amateur iPhone framing with subtle modesty. Prioritize natural body proportions and soft tissue behavior.";
      } else if (modestyLevel === 'medium') {
        realismGuid += " Modest framing, preserving natural distance.";
      }
    }

    // ControlNet simulation (inform Gemini about 3D volume expectations)
    // ANTI-FILTRE V2.2 – Modesty Level équilibré
    rawMatrix.controlnet_simulation = {
      pose_guidance: poseGuidance,
      volume_guidance: modestyLevel === 'high' ? volumeGuidance + " Natural arch but modest framing – preserve chest/hip foreground dominance and realistic 3D volume." : volumeGuidance,
      realism_guidance: realismGuid,
    };

    // Extended directives for virtual model
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
