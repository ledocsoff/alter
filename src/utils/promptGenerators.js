// promptGenerators.js
// Moteur de génération JSON structuré pour NANO BANANA PRO
// Injection STRICTE du JSON modèle — aucune sur-interprétation, cohérence maximale

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

export const generatePromptJSON = (model, scene, activeAccount = null) => {
  const aspectRatio = scene.aspect_ratio || "--ar 9:16";
  const isVertical = aspectRatio.includes("9:16");
  const meta = scene.location_meta || {};

  const prompt = {
    format: {
      aspect_ratio: isVertical ? "9:16" : "1:1",
      orientation: isVertical ? "vertical portrait" : "square",
      target: isVertical ? "TikTok, Instagram Reels, Stories" : "Instagram Feed",
    },
    quality: {
      render: "masterpiece, best quality, ultra-realistic, photorealistic",
      weight: 1.4,
      camera: "RAW photo, 8k uhd, DSLR quality, film grain, Fujifilm XT3",
    },
    subject: {
      type: "1girl, solo",
      age: parseInt(model.age) || 22,
      ethnicity: get(model, 'ethnicity'),
      body_type: get(model, 'body.type'),
      height: get(model, 'body.height'),
    },
    // STRICT: pass face data exactly as provided in JSON
    face: {
      shape: get(model, 'face.shape'),
      jawline: get(model, 'face.jawline'),
      forehead: get(model, 'face.forehead'),
      eyes: {
        color: get(model, 'eyes.color'),
        shape: get(model, 'eyes.shape'),
        size: get(model, 'eyes.size'),
        lashes: get(model, 'eyes.lashes'),
        brows: get(model, 'eyes.brows'),
      },
      nose: get(model, 'nose.shape'),
      lips: {
        shape: get(model, 'lips.shape'),
        upper: get(model, 'lips.upper'),
        lower: get(model, 'lips.lower'),
      },
    },
    // STRICT: pass hair data exactly as provided
    hair: {
      color: get(model, 'hair.color'),
      length: get(model, 'hair.length'),
      texture: get(model, 'hair.texture'),
      style: get(model, 'hair.style'),
    },
    // STRICT: pass body data exactly as provided
    body: {
      bust: get(model, 'body.bust'),
      waist: get(model, 'body.waist'),
      hips: get(model, 'body.hips'),
      glutes: get(model, 'body.glutes'),
      limbs: get(model, 'body.limbs'),
      details: get(model, 'body.details'),
    },
    // STRICT: pass skin data exactly as provided
    skin: {
      tone: get(model, 'skin.tone'),
      texture: get(model, 'skin.texture'),
      features: get(model, 'skin.features'),
      sheen: get(model, 'skin.sheen'),
      details: get(model, 'skin.details'),
    },
    outfit: scene.outfit?.value || "casual outfit",
    scene: {
      vibe: scene.vibe || null,
      pose: scene.pose || null,
      expression: scene.expression || null,
      camera_angle: scene.camera_angle || null,
    },
    environment: {
      setting: scene.environment || null,
      lighting: scene.lighting || null,
      time_of_day: meta.time_of_day || null,
      color_palette: meta.color_palette || null,
      anchor_details: meta.anchor_details || null,
    },
    directives: {
      anatomical_fidelity: get(model, 'anatomical_fidelity'),
      aesthetic_signature: get(model, 'signature'),
      identity_lock: "Maintain exact same face across all generations. Same person, consistent identity, no variation in facial structure or features. Consistent skin color and body proportions.",
    },
    negative_prompt: [
      "worst quality, low quality, normal quality",
      "deformed iris, deformed pupils, bad eyes, semi-realistic",
      "cgi, 3d, render, sketch, cartoon, drawing, anime, illustration",
      "text, watermark, signature, logo, username, caption",
      "cropped, out of frame, poorly framed",
      "ugly, duplicate, morbid, mutilated, disfigured",
      "extra fingers, mutated hands, poorly drawn hands, poorly drawn face",
      "mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions",
      "extra limbs, cloned face, gross proportions, malformed limbs",
      "missing arms, missing legs, extra arms, extra legs",
      "fused fingers, too many fingers, long neck",
      "unnatural skin, plastic skin, airbrushed skin, overly smooth skin, oversaturated",
      "unnatural body proportions, uncanny valley",
      "inconsistent background, changing room layout, different furniture between shots",
    ],
  };

  // Cohérence spatiale si le lieu a des détails d'ancrage
  if (meta.anchor_details) {
    prompt.directives.spatial_lock = "Background must remain spatially consistent: same furniture placement, same wall decorations, same objects visible in every shot at this location.";
  }

  // Plateforme
  if (activeAccount) {
    const p = activeAccount.platform;
    const compliance = {
      Instagram: "Content suitable for Instagram. No explicit nudity, tasteful and suggestive only.",
      TikTok: "Content suitable for TikTok. No explicit nudity, tasteful and suggestive only.",
      Tinder: "Dating profile photo. Approachable, attractive, natural looking.",
    };
    prompt.platform = {
      name: p,
      handle: activeAccount.handle,
      compliance: compliance[p] || null,
    };
  }

  return prompt;
};
