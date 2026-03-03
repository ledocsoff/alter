// promptGenerators.js
// Moteur de génération JSON structuré pour NANO BANANA PRO
// Chaque champ est explicite — aucune ambiguïté, cohérence maximale

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
      ethnicity: model.ethnicity,
      body_type: model.body.type,
      height: model.body.height,
    },
    face: {
      shape: model.face.shape,
      jawline: model.face.jawline,
      forehead: model.face.forehead,
      eyes: {
        color: model.eyes.color,
        shape: model.eyes.shape,
        size: model.eyes.size,
        lashes: model.eyes.lashes,
        brows: model.eyes.brows,
      },
      nose: model.nose.shape,
      lips: {
        shape: model.lips.shape,
        upper: model.lips.upper,
        lower: model.lips.lower,
      },
    },
    hair: {
      color: model.hair.color,
      length: model.hair.length,
      texture: model.hair.texture,
      style: model.hair.style,
    },
    body: {
      bust: model.body.bust,
      waist: model.body.waist,
      hips: model.body.hips,
      glutes: model.body.glutes,
      limbs: model.body.limbs,
      details: model.body.details,
    },
    skin: {
      tone: model.skin.tone,
      texture: model.skin.texture,
      features: model.skin.features,
      sheen: model.skin.sheen,
      details: model.skin.details,
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
      anatomical_fidelity: model.anatomical_fidelity || null,
      aesthetic_signature: model.signature || null,
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
