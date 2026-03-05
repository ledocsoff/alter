// promptGenerators.js
// Moteur de génération Matrice d'Ancrage ultra-précise
// Chaque champ = description narrative détaillée pour cohérence maximale

import { NEGATIVE_PROMPT_OFM, CONTROLNET_PRESETS } from '../constants/controlnetPresets';

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

// ============================================
// MATRICE JSON D'ANCRAGE — Prompt principal
// ============================================
export const generateAnchorMatrix = (model, scene, activeAccount = null) => {
  const aspectRatio = scene.aspect_ratio || "--ar 9:16";
  const isVertical = aspectRatio.includes("9:16");
  const meta = scene.location_meta || {};

  // Resolve camera preset
  const presetId = scene.controlnet_preset || 'selfie_high_angle';
  const preset = CONTROLNET_PRESETS.find(p => p.id === presetId) || CONTROLNET_PRESETS[0];
  const cam = preset.camera_defaults || {};

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

  // === POSE ===
  const poseConstraints = preset.pose_control.constraints;
  const poseBody = scene.pose || "natural relaxed pose";

  // === ENVIRONMENT ===
  const envSetting = scene.environment || null;
  const envBg = meta.anchor_details || null;
  const envTime = meta.time_of_day || null;

  // === LIGHTING ===
  const lightSource = scene.lighting || null;

  // === CAMERA ===
  const camPerspective = scene.camera_angle || cam.perspective || null;
  const camShot = cam.shot_type || null;
  const camFocal = cam.focal_length || null;
  const camDoF = cam.depth_of_field || null;

  // === NEGATIVE PROMPT — format string compact ===
  const baseNegStr = [
    ...NEGATIVE_PROMPT_OFM.forbidden_elements,
    "worst quality", "low quality", "deformed anatomy",
    "extra fingers", "mutated hands", "blurry", "watermark",
    "text", "logo", "cgi", "3d render", "cartoon", "anime",
    "inconsistent background", "changing room layout",
    // Anti-blur / anti-DSLR
    "bokeh", "depth of field", "shallow DOF", "DSLR", "studio lighting",
    "professional photography", "cinematic color grading", "film grain",
    "blurred background", "portrait mode", "lens blur", "out of focus background",
    "artificial bokeh", "background blur", "defocused background",
    // Anti-phone-UI
    "phone UI", "status bar", "notification bar", "phone frame",
    "screenshot overlay", "app interface", "phone screen", "UI elements",
    "battery icon", "time display", "signal bars", "phone border",
    // Anti-AI-look
    "AI generated", "artificial skin", "plastic look", "over-processed",
    "HDR", "hyper-realistic", "over-sharpened", "uncanny valley",
  ].join(', ');

  // Append custom negative prompt if user provided one
  const customNeg = scene.custom_negative_prompt?.trim();
  const negativeStr = customNeg ? `${baseNegStr}, ${customNeg}` : baseNegStr;

  const matrix = {
    subject: {
      demographics,
      hair: hairDesc,
      face: faceNarrative,
      apparel: scene.outfit?.value || "casual outfit",
      accessories: null,
      anatomy: anatomyDesc,
      skin_details: skinDesc,
    },

    pose: {
      body_position: poseBody,
      orientation: cam.perspective || "Facing the camera",
      limbs: get(model, 'body.limbs'),
      head_and_gaze: scene.expression || null,
    },

    environment: {
      setting: envSetting,
      background_elements: envBg,
      surface_interaction: envTime,
    },

    camera: {
      perspective: camPerspective,
      shot_type: camShot,
      focal_length: camFocal,
      depth_of_field: camDoF,
    },

    lighting: {
      source: lightSource,
      quality: meta.color_palette ? `Color palette: ${meta.color_palette}` : null,
      shadows: null,
    },

    mood_and_expression: {
      emotion: scene.vibe || null,
      facial_expression: scene.expression || null,
    },

    style_and_realism: {
      aesthetic: "Casual photo taken with an iPhone smartphone camera. Raw, unprocessed look. NOT a professional photoshoot. NOT a DSLR photo. This is what a real person would post on Instagram from their phone.",
      fidelity: "Photorealistic with natural imperfections: visible pores, slight skin unevenness, natural hair flyaways. No airbrushing, no beauty filters, no skin smoothing.",
      camera: "Smartphone camera characteristics: deep focus (everything sharp), slight wide-angle distortion, natural phone sensor noise, auto white balance.",
      colors: meta.color_palette || "Natural realistic colors, slightly warm skin tones, no cinematic grading, no oversaturation",
    },

    negative_prompt: negativeStr,

    custom_details: scene.custom_details?.trim() || null,
  };

  // Pose constraints (kept as natural language, no ControlNet reference)
  if (preset.pose_control?.constraints?.length > 0) {
    matrix.pose.constraints = preset.pose_control.constraints;
  }

  // Identity lock directives
  matrix.directives = {
    identity_lock: "Maintain exact same face across all generations. Same person, consistent identity, no variation in facial structure or features. Consistent skin color and body proportions.",
    anatomical_fidelity: get(model, 'anatomical_fidelity') || "Preserve exact anatomical proportions from reference. No normalization, no averaging, no beautification.",
    aesthetic_signature: get(model, 'signature') || null,
  };

  if (scene.seed) {
    matrix.directives.seed = scene.seed;
    matrix.directives.seed_directive = `Use seed ${scene.seed} for deterministic visual consistency. This seed must produce identical facial features, body proportions, and skin characteristics across every generation.`;
  }

  // Spatial lock for anchored locations
  if (meta.anchor_details) {
    matrix.directives.spatial_lock = "Background must remain spatially consistent: same furniture placement, same wall decorations, same objects visible in every shot at this location.";
  }

  // Platform compliance
  if (activeAccount) {
    const p = activeAccount.platform;
    const compliance = {
      Instagram: "Content suitable for Instagram. No explicit nudity, tasteful and suggestive only.",
      TikTok: "Content suitable for TikTok. No explicit nudity, tasteful and suggestive only.",
      Tinder: "Dating profile photo. Approachable, attractive, natural looking.",
    };
    matrix.platform = {
      name: p,
      handle: activeAccount.handle,
      compliance: compliance[p] || null,
    };
  }

  return matrix;
};
