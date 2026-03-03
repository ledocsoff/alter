// Convertit le JSON structuré en prompt texte optimisé pour Gemini image generation

const compact = (obj) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return Object.values(obj).filter(v => v && v !== 'null').join(', ');
};

export const promptToText = (promptJSON) => {
  const parts = [];

  // Quality
  if (promptJSON.quality) {
    parts.push(promptJSON.quality.render);
    parts.push(promptJSON.quality.camera);
  }

  // Subject
  if (promptJSON.subject) {
    const s = promptJSON.subject;
    parts.push(`${s.type}, ${s.age} years old, ${s.ethnicity}, ${s.body_type}, ${s.height}`);
  }

  // Face
  if (promptJSON.face) {
    const f = promptJSON.face;
    const eyeStr = f.eyes ? `${f.eyes.color} ${f.eyes.shape} eyes, ${f.eyes.size}, ${f.eyes.lashes}, ${f.eyes.brows}` : '';
    const lipsStr = f.lips ? `${f.lips.shape} lips` : '';
    parts.push(`${f.shape} face, ${f.jawline}, ${f.forehead}, ${eyeStr}, ${f.nose} nose, ${lipsStr}`);
  }

  // Hair
  if (promptJSON.hair) {
    const h = promptJSON.hair;
    parts.push(`${h.color} ${h.length} ${h.texture} hair, ${h.style}`);
  }

  // Body
  if (promptJSON.body) {
    parts.push(compact(promptJSON.body));
  }

  // Skin
  if (promptJSON.skin) {
    parts.push(compact(promptJSON.skin));
  }

  // Outfit
  if (promptJSON.outfit) {
    parts.push(promptJSON.outfit);
  }

  // Scene
  if (promptJSON.scene) {
    const sc = promptJSON.scene;
    if (sc.pose) parts.push(sc.pose);
    if (sc.expression) parts.push(sc.expression);
    if (sc.camera_angle) parts.push(sc.camera_angle);
    if (sc.vibe) parts.push(sc.vibe);
  }

  // Environment
  if (promptJSON.environment) {
    const env = promptJSON.environment;
    if (env.setting) parts.push(env.setting);
    if (env.lighting) parts.push(env.lighting);
    if (env.time_of_day) parts.push(env.time_of_day);
    if (env.color_palette) parts.push(`color palette: ${env.color_palette}`);
    if (env.anchor_details) parts.push(env.anchor_details);
  }

  // Directives
  if (promptJSON.directives) {
    const d = promptJSON.directives;
    if (d.identity_lock) parts.push(d.identity_lock);
    if (d.anatomical_fidelity) parts.push(d.anatomical_fidelity);
    if (d.aesthetic_signature) parts.push(d.aesthetic_signature);
    if (d.spatial_lock) parts.push(d.spatial_lock);
  }

  // Platform compliance
  if (promptJSON.platform?.compliance) {
    parts.push(promptJSON.platform.compliance);
  }

  const positivePrompt = parts.filter(Boolean).join('. ');

  const negativePrompt = Array.isArray(promptJSON.negative_prompt)
    ? promptJSON.negative_prompt.join(', ')
    : '';

  return { positivePrompt, negativePrompt };
};

export const getAspectRatio = (promptJSON) => {
  return promptJSON?.format?.aspect_ratio || '9:16';
};
