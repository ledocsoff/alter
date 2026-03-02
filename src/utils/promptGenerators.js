// promptGenerators.js
// Utilitaires de génération du texte pour NANO BANANA PRO (Google AI Studio)

export const generateNanoBananaPrompt = (model, scene) => {
  // 1. Définition du Sujet Principal (Type de photo et Sujet global)
  const baseSubject = `${scene.vibe}, ${scene.camera_angle} of a ${model.age}-year-old ${model.ethnicity} woman, ${model.body.type} figure, ${model.body.height}, wearing a ${scene.outfit.value}.`;

  // 2. Environnement et Contexte
  const setting = `She is located in a ${scene.environment}, illuminated by ${scene.lighting}.`;
  
  // 3. Pose et Expression
  const action = `She is ${scene.pose}, displaying a ${scene.expression}.`;

  // 4. Détails du Visage et Cheveux
  const faceDetails = `Her facial features include a ${model.face.shape} face, ${model.face.jawline} jawline, and a ${model.face.forehead} forehead. She has ${model.eyes.shape}, ${model.eyes.size} ${model.eyes.color} eyes with ${model.eyes.lashes} and ${model.eyes.brows} eyebrows. Her nose is ${model.nose.shape}. She has ${model.lips.shape} lips (${model.lips.upper} upper lip, ${model.lips.lower} lower lip).`;
  
  const hairDetails = `Her hair is ${model.hair.color}, ${model.hair.length}, ${model.hair.texture}, styled in a ${model.hair.style}.`;

  // 5. Détails du Corps et de la Peau (Crucial pour le photoréalisme Nano Banana Pro)
  const bodyDetails = `Her body features: ${model.body.bust} bust, ${model.body.waist} waist, ${model.body.hips} hips, ${model.body.glutes} glutes, with ${model.body.limbs} limbs. ${model.body.details}.`;
  
  const skinDetails = `Her skin is ${model.skin.tone} with a ${model.skin.texture}. She has ${model.skin.features} and a ${model.skin.sheen}. ${model.skin.details}.`;

  // 6. Directives du Modèle pour la fidélité anatomique (Directives fortes)
  const rigidStrucure = `Model directives: ${model.anatomical_fidelity}. Aesthetic signature: ${model.signature}.`;

  // Assemblage en "Natural Language" (Paragraphes fluides)
  return `${baseSubject}
${setting} ${action}

${faceDetails} ${hairDetails}

${bodyDetails}
${skinDetails}

${rigidStrucure}`.trim();
};

export const generateNegativePrompt = () => {
    return [
      "(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4)",
      "text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated",
      "extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy",
      "bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs",
      "extra arms, extra legs, fused fingers, too many fingers, long neck, bad makeup, plastic skin, smoothed skin, oversaturated"
    ].join(", ");
};
