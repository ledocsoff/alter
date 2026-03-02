export const OUTFIT_PRESETS = [
  { id: "bikini_string", label: "String Bikini", value: "tiny string bikini, minimal coverage, thin straps", icon: "👙" },
  { id: "bikini_micro", label: "Micro Bikini", value: "micro triangle bikini, minimal fabric, revealing cut", icon: "🔥" },
  { id: "bikini_black", label: "Bikini Noir", value: "sleek black bikini, classic cut, matte fabric", icon: "🖤" },
  { id: "lingerie_lace", label: "Dentelle", value: "delicate lace lingerie set, sheer details, elegant and sensual", icon: "✨" },
  { id: "lingerie_silk", label: "Ensemble Soie", value: "smooth silk lingerie set, matching top and bottom, luxurious feel", icon: "🎀" },
  { id: "gym_set", label: "Tenue de Sport", value: "tight yoga pants and sports bra set, matching colors, athletic fit", icon: "🏋️‍♀️" },
  { id: "gym_shorts", label: "Short de Sport", value: "spandex booty shorts, tight crop top, gym workout attire", icon: "🤸‍♀️" },
  { id: "casual_summer", label: "Robe d'Été", value: "light floral summer dress, flowing fabric, sundress", icon: "👗" },
  { id: "casual_denim", label: "Jean Domicile", value: "distressed denim shorts, casual fitted t-shirt", icon: "👖" },
  { id: "casual_urban", label: "Style Urbain", value: "oversized hoodie, tight leggings, chunky sneakers", icon: "🏙️" },
  { id: "club_dress", label: "Robe de Soirée", value: "tight bodycon micro dress, revealing neckline", icon: "💃" },
  { id: "office_chic", label: "Style Bureau", value: "fitted pencil skirt, white silk blouse unbuttoned slightly, heels", icon: "👠" },
  { id: "cozy_home", label: "Confortable", value: "oversized knitted sweater, thigh-high socks, cozy homewear", icon: "☕" },
  { id: "swimsuit_onepiece", label: "Maillot 1 Pièce", value: "high-cut one piece swimsuit, open back, deep V-neck", icon: "🩱" },
  { id: "elegant_gown", label: "Robe De Gala", value: "long elegant evening gown, high slit, floor-length", icon: "✨" },
  { id: "leather_outfit", label: "Tenue Cuir", value: "tight black leather pants, leather jacket, edgy look", icon: "🏍️" },
  { id: "school", label: "Uniforme", value: "pleated plaid skirt, white collar shirt, tie, knee-high socks", icon: "📚" }
];

export const SCENE_OPTIONS = {
  vibe: [
    "candid Instagram photo", "Polaroid picture", "Tiktok screenshot", "amateur selfie",
    "professional photoshoot", "cinematic still", "35mm film photography", "disposable camera shot"
  ],
  lighting: [
    "golden hour sunlight", "harsh direct sunlight", "soft overcast daylight", "neon club lighting",
    "warm bedroom lamplight", "flash photography", "dramatic cinematic lighting", "moody low light",
    "ring light illumination", "colorful RGB LED lighting"
  ],
  environment: [
    "luxurious modern bedroom", "messy teenager bedroom", "sunny beach resort", "tropical villa pool",
    "high-end hotel bathroom", "busy city street", "chic cafe interior", "neon-lit Tokyo street",
    "modern gym interior", "luxury yacht deck", "cozy living room couch", "aesthetic mirror selfie context",
    "car interior passenger seat", "clothing store dressing room"
  ],
  camera_angle: [
    "mirror selfie, phone visible", "high angle selfie", "low angle shot", "eye-level portrait",
    "over-the-shoulder view", "full body shot", "close-up portrait", "medium shot from waist up",
    "candid side profile", "wide angle lens perspective"
  ],
  pose: [
    "casual standing, hand on hip", "sitting on bed, legs crossed", "leaning against wall",
    "looking over shoulder", "laying on stomach on bed", "adjusting hair casually",
    "holding phone for selfie", "walking towards camera", "squatting playfully",
    "stretching arms up", "sitting on edge of pool", "kneeling on bed"
  ],
  expression: [
    "soft natural smile", "seductive smirk", "playful lip bite", "puckered lips kissing face",
    "serious model stare", "laughing candidly", "subtle confident smile", "surprised playful look",
    "mouth slightly open, relaxed", "winking playfully"
  ],
  modifiers: [
    "8k resolution", "ultra-detailed", "hyper-realistic", "unreal engine 5 render",
    "octane render", "volumetric lighting", "subsurface scattering", "intricate details",
    "sharp focus", "masterpiece", "best quality", "hdr", "raw photo"
  ],
  negative_prompts: [
    "(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4)",
    "text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated",
    "extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy",
    "bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs",
    "extra arms, extra legs, fused fingers, too many fingers, long neck, bad makeup, plastic skin, smoothed skin, oversaturated"
  ]
};

export const DEFAULT_SCENE = {
  outfit: OUTFIT_PRESETS[0],
  vibe: SCENE_OPTIONS.vibe[0],
  camera_angle: SCENE_OPTIONS.camera_angle[7], // medium shot
  pose: SCENE_OPTIONS.pose[0],
  environment: SCENE_OPTIONS.environment[0],
  lighting: SCENE_OPTIONS.lighting[0],
  expression: SCENE_OPTIONS.expression[0],
};
