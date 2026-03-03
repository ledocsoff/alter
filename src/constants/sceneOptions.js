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
    { labelFR: "Photo Instagram spontanée", promptEN: "candid Instagram photo" },
    { labelFR: "Photo Polaroid", promptEN: "Polaroid picture" },
    { labelFR: "Capture d'écran TikTok", promptEN: "Tiktok screenshot" },
    { labelFR: "Selfie amateur", promptEN: "amateur selfie" },
    { labelFR: "Shooting professionnel", promptEN: "professional photoshoot" },
    { labelFR: "Film argentique 35mm", promptEN: "35mm film photography" },
    { labelFR: "Appareil photo jetable", promptEN: "disposable camera shot" },
    { labelFR: "Quotidien décontracté", promptEN: "casual everyday snapshot" },
    { labelFR: "Prise sur le vif (A l'improviste)", promptEN: "behind the scenes candid" }
  ],
  lighting: [
    { labelFR: "Lumière dorée (Coucher de soleil)", promptEN: "golden hour sunlight" },
    { labelFR: "Plein soleil direct", promptEN: "harsh direct sunlight" },
    { labelFR: "Lumière douce (Journée nuageuse)", promptEN: "soft overcast daylight" },
    { labelFR: "Éclairage club / Néon", promptEN: "neon club lighting" },
    { labelFR: "Lumière chaude de chambre", promptEN: "warm bedroom lamplight" },
    { labelFR: "Photo au flash direct", promptEN: "flash photography" },
    { labelFR: "Lumière basse d'ambiance", promptEN: "moody low light" },
    { labelFR: "Lumière naturelle traversant la fenêtre", promptEN: "window natural light crossing room" }
  ],
  environment: [
    // --- LIEUX "GIRL NEXT DOOR" (Habituels/Normaux) ---
    { labelFR: "Petite chambre d'étudiante, vêtements sur le lit", promptEN: "cozy messy bedroom with clothes on bed" },
    { labelFR: "Miroir classique de salle de bain", promptEN: "standard apartment bathroom mirror" },
    { labelFR: "Petite cuisine moderne classique", promptEN: "small modern domestic kitchen" },
    { labelFR: "Balcon d'appartement parisien / ville", promptEN: "city apartment balcony with plants" },
    { labelFR: "Canapé classique de salon", promptEN: "casual living room couch" },
    { labelFR: "Murs blancs simples, lit défait", promptEN: "simple white bedroom walls, unmade bed" },

    // --- LIEUX EXTÉRIEURS CLASSIQUES ---
    { labelFR: "Café de quartier (intérieur)", promptEN: "local coffee shop interior" },
    { labelFR: "Trottoir de rue classique", promptEN: "regular city street sidewalk" },
    { labelFR: "Vestiaire de salle de sport", promptEN: "local gym locker room mirror" },
    { labelFR: "Machine et poids (Salle de sport)", promptEN: "modern gym interior equipment" },
    { labelFR: "Rayon de petit supermarché", promptEN: "supermarket aisle" },
    { labelFR: "Siège passager de voiture normale", promptEN: "passenger seat of a regular car" },

    // --- LIEUX HAUT DE GAMME (Luxe) ---
    { labelFR: "Chambre principale moderne de luxe", promptEN: "luxurious modern bedroom" },
    { labelFR: "Piscine privée en Villa tropicale", promptEN: "tropical villa private pool" },
    { labelFR: "Ponton de yacht luxueux", promptEN: "luxury yacht deck" }
  ],
  camera_angle: [
    { labelFR: "Selfie Miroir (Téléphone visible)", promptEN: "mirror selfie, phone visible" },
    { labelFR: "Selfie plongée (Pris de haut)", promptEN: "high angle selfie" },
    { labelFR: "Contre-plongée (Pris d'en bas)", promptEN: "low angle shot" },
    { labelFR: "Portrait niveau des yeux", promptEN: "eye-level portrait" },
    { labelFR: "Vue par-dessus l'épaule", promptEN: "over-the-shoulder view" },
    { labelFR: "Plein pied (Corps entier)", promptEN: "full body shot" },
    { labelFR: "Gros plan visage", promptEN: "close-up portrait" },
    { labelFR: "Plan moyen (À partir de la taille)", promptEN: "medium shot from waist up" }
  ],
  pose: [
    { labelFR: "Debout détendue, main sur la hanche", promptEN: "casual standing, hand on hip" },
    { labelFR: "Assise sur le lit, jambes croisées", promptEN: "sitting on bed, legs crossed" },
    { labelFR: "Adossée contre un mur", promptEN: "leaning against wall" },
    { labelFR: "Regard par-dessus son épaule", promptEN: "looking over shoulder" },
    { labelFR: "Allongée sur le ventre (sur lit/canapé)", promptEN: "laying on stomach on bed" },
    { labelFR: "Ajuste ses cheveux naturellement", promptEN: "adjusting hair casually" },
    { labelFR: "Tient son téléphone pour un selfie", promptEN: "holding phone for selfie" },
    { labelFR: "S'accroupit de façon joueuse", promptEN: "squatting playfully" },
    { labelFR: "Assise au bord de l'eau/piscine", promptEN: "sitting on edge of pool" }
  ],
  expression: [
    { labelFR: "Sourire doux naturel", promptEN: "soft natural smile" },
    { labelFR: "Sourire séducteur", promptEN: "seductive smirk" },
    { labelFR: "Se mordille la lèvre", promptEN: "playful lip bite" },
    { labelFR: "Regard sérieux de modèle photo", promptEN: "serious model stare" },
    { labelFR: "Rire franc", promptEN: "laughing candidly" },
    { labelFR: "Air surpris / joueur", promptEN: "surprised playful look" },
    { labelFR: "Bouche légèrement entrouverte", promptEN: "mouth slightly open, relaxed" }
  ],
  aspect_ratio: [
    { labelFR: "Story / TikTok (9:16)", promptEN: "--ar 9:16", icon: "📱" },
    { labelFR: "Feed / Carré (1:1)", promptEN: "--ar 1:1", icon: "⏹️" }
  ]
};

export const DEFAULT_SCENE = {
  outfit: OUTFIT_PRESETS[0],
  vibe: SCENE_OPTIONS.vibe[0].promptEN, // On stocke le EN en valeur primaire pour l'IA
  camera_angle: SCENE_OPTIONS.camera_angle[7].promptEN,
  pose: SCENE_OPTIONS.pose[0].promptEN,
  environment: SCENE_OPTIONS.environment[0].promptEN,
  lighting: SCENE_OPTIONS.lighting[0].promptEN,
  expression: SCENE_OPTIONS.expression[0].promptEN,
  aspect_ratio: "--ar 9:16",
  seed: null,
};
