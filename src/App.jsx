import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// OPTIONS DES CHAMPS MODÈLE (listes déroulantes)
// Les valeurs restent en anglais pour le JSON final
// ═══════════════════════════════════════════════════════════

const MODEL_OPTIONS = {
  face: {
    shape: ["soft oval", "round", "heart-shaped", "square", "oblong", "diamond", "inverted triangle", "rectangular"],
    jawline: ["soft rounded", "sharp defined", "angular", "V-shaped", "strong square", "gentle tapered", "wide", "narrow delicate"],
    forehead: ["medium, partially covered by hair", "high and smooth", "small and round", "broad", "narrow", "slightly exposed", "hidden by bangs", "prominent"],
  },
  eyes: {
    color: ["dark brown", "light brown", "hazel", "green", "blue", "grey", "amber", "honey", "deep black", "blue-green", "emerald"],
    shape: ["almond, slightly upturned", "round", "hooded", "monolid", "cat-eye upturned", "downturned", "wide-set almond", "close-set round", "deep-set"],
    size: ["large", "medium", "small", "very large doe eyes", "narrow elongated"],
    lashes: ["long natural lashes", "thick dark lashes", "light sparse lashes", "curled voluminous lashes", "subtle fine lashes", "dramatic long lashes"],
    brows: ["soft arched, well-defined", "thick straight", "thin arched", "bushy natural", "feathered soft", "high arched dramatic", "flat minimal", "angular sharp"],
  },
  lips: {
    shape: ["full, naturally plump", "thin and defined", "heart-shaped", "wide full", "bow-shaped petite", "asymmetric natural", "round pouty", "straight subtle"],
    upper: ["defined cupid's bow", "flat upper lip", "sharp cupid's bow", "soft rounded", "thin subtle", "peaked prominent"],
    lower: ["slightly fuller lower lip", "balanced with upper", "very full pouty", "thin", "prominent protruding", "subtle and flat"],
  },
  nose: {
    shape: ["small, straight, slightly upturned tip", "button nose, small and round", "straight and narrow", "aquiline, prominent bridge", "wide with flat bridge", "curved with rounded tip", "pointed and thin", "snub and short", "long and elegant"],
  },
  hair: {
    color: [
      "rich brown with subtle caramel highlights", "jet black", "platinum blonde", "dark auburn", "honey blonde",
      "strawberry blonde", "copper red", "ash brown", "chocolate brown", "dirty blonde",
      "raven black with blue sheen", "ombré dark to light", "warm chestnut", "cool ash blonde",
      "bright ginger", "dark brown with golden highlights", "silver grey", "deep burgundy"
    ],
    length: ["long, past shoulders", "very long, waist length", "medium, shoulder length", "short bob", "pixie cut", "mid-back length", "chest length", "cropped close"],
    texture: ["wavy, flowing, voluminous", "straight and sleek", "tight curls", "loose curls", "coily natural", "kinky textured", "slightly wavy", "thick and coarse", "fine and silky", "beachy waves"],
    style: [
      "loose and natural, face-framing layers", "slicked back", "messy bun", "high ponytail",
      "braided", "half up half down", "curtain bangs", "side-swept", "wild and untamed",
      "straight blowout", "tousled bedhead", "french braids", "space buns", "low chignon"
    ],
  },
  skin: {
    tone: [
      "sun-kissed warm tan", "fair porcelain", "light ivory", "olive", "medium golden",
      "deep warm brown", "dark ebony", "cool beige", "warm peach", "bronze",
      "caramel", "honey", "almond", "tawny", "rich mahogany"
    ],
    texture: ["visible pores, natural texture", "smooth and even", "slightly textured", "rough natural", "soft and dewy", "matte natural", "combination zones"],
    features: [
      "light freckles across nose and cheeks", "no visible marks", "beauty mark near lip",
      "scattered freckles", "dimples on cheeks", "faint acne scars", "birthmark",
      "heavy freckles", "clear and unmarked", "beauty mark near eye", "multiple beauty marks"
    ],
    sheen: [
      "natural skin sheen, slight perspiration glow", "matte and dry", "dewy and glowing",
      "oily shine on T-zone", "subtle satin finish", "wet look / post-shower glow", "sun-glistened"
    ],
    details: [
      "occasional tan lines, subtle moles, subsurface scattering",
      "no visible tan lines, clean even skin",
      "prominent tan lines from bikini",
      "subtle veins visible, realistic imperfections",
      "stretch marks, natural body marks",
      "tattoos visible",
      "goosebumps texture, cold skin reaction"
    ],
  },
  body: {
    type: ["extreme hourglass", "hourglass", "pear-shaped", "athletic", "slim", "curvy", "petite", "tall and lean", "voluptuous", "fit and toned"],
    bust: [
      "exceptionally voluminous, heavy, natural, strong forward projection, bust depth greater than ribcage, deep cleavage",
      "large, full, natural with visible weight and movement",
      "medium, proportional, perky",
      "small, subtle, delicate frame",
      "athletic, toned, minimal projection",
      "very large, heavy, prominent cleavage, natural sag",
      "full and round, moderate projection, natural bounce"
    ],
    waist: ["extremely narrow, defined", "narrow and toned", "average, natural", "thick and strong", "slim but soft", "very defined V-taper"],
    hips: ["wide, full, proportional to bust", "narrow and slim", "very wide, prominent", "average, balanced", "athletic and square", "rounded and curvy"],
    glutes: ["full, rounded, prominent in rear views", "flat and subtle", "athletic and firm", "very large and round", "average, natural shape", "toned and lifted", "wide and full"],
    height: ["petite, around 5'0", "short, around 5'2", "average, around 5'5", "tall, around 5'7", "very tall, around 5'10", "model height, around 6'0"],
    limbs: ["toned but soft, feminine proportions", "long and slender", "muscular and defined", "petite and delicate", "thick and curvy", "athletic and strong", "soft and full"],
    details: [
      "gravity and soft tissue realism visible, natural body folds, no artificial smoothing",
      "very toned, visible muscle definition, low body fat",
      "soft and natural, slight belly, realistic body",
      "curvy with natural cellulite, authentic texture",
      "slim with minimal body fat, visible bone structure",
      "thick and voluptuous, natural weight distribution"
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// CONSTANTES & PRÉRÉGLAGES
// ═══════════════════════════════════════════════════════════

const DEFAULT_MODEL = {
  name: "Jessi", age: "22",
  face: { shape: MODEL_OPTIONS.face.shape[0], jawline: MODEL_OPTIONS.face.jawline[0], forehead: MODEL_OPTIONS.face.forehead[0] },
  eyes: { color: MODEL_OPTIONS.eyes.color[0], shape: MODEL_OPTIONS.eyes.shape[0], size: MODEL_OPTIONS.eyes.size[0], lashes: MODEL_OPTIONS.eyes.lashes[0], brows: MODEL_OPTIONS.eyes.brows[0] },
  lips: { shape: MODEL_OPTIONS.lips.shape[0], upper: MODEL_OPTIONS.lips.upper[0], lower: MODEL_OPTIONS.lips.lower[0] },
  nose: { shape: MODEL_OPTIONS.nose.shape[0] },
  hair: { color: MODEL_OPTIONS.hair.color[0], length: MODEL_OPTIONS.hair.length[0], texture: MODEL_OPTIONS.hair.texture[0], style: MODEL_OPTIONS.hair.style[0] },
  skin: { tone: MODEL_OPTIONS.skin.tone[0], texture: MODEL_OPTIONS.skin.texture[0], features: MODEL_OPTIONS.skin.features[0], sheen: MODEL_OPTIONS.skin.sheen[0], details: MODEL_OPTIONS.skin.details[0] },
  body: {
    type: MODEL_OPTIONS.body.type[0], bust: MODEL_OPTIONS.body.bust[0], waist: MODEL_OPTIONS.body.waist[0],
    hips: MODEL_OPTIONS.body.hips[0], glutes: MODEL_OPTIONS.body.glutes[0], height: MODEL_OPTIONS.body.height[2],
    limbs: MODEL_OPTIONS.body.limbs[0], details: MODEL_OPTIONS.body.details[0],
  },
  anatomical_fidelity: "Exact preservation of high-volume chest-to-waist ratio, heavy natural outward projection, bust depth exceeding ribcage width, no chest volume reduction, gravity and soft tissue realism, no anatomy normalization, no proportion averaging, maintain extreme waist-to-hip differential",
  signature: "candid smartphone aesthetic, raw authenticity, sun-kissed beach girl energy",
};

const OUTFIT_PRESETS = [
  { id: "bikini_string", label: "Bikini String", value: "tiny string bikini, minimal coverage, thin straps", icon: "👙" },
  { id: "bikini_micro", label: "Micro Bikini", value: "micro triangle bikini, minimal fabric, revealing cut", icon: "🔥" },
  { id: "bikini_black", label: "Bikini Noir", value: "sleek black bikini, classic cut, matte fabric", icon: "🖤" },
  { id: "tank_white", label: "Débardeur Blanc", value: "tight white ribbed tank top, form-fitting, thin fabric showing contours", icon: "🤍" },
  { id: "crop", label: "Crop Top", value: "cropped fitted top exposing midriff, tight fabric", icon: "✂️" },
  { id: "bodycon", label: "Robe Moulante", value: "form-fitting bodycon mini dress, fabric hugging every curve", icon: "👗" },
  { id: "oversized", label: "Sweat Oversize", value: "oversized hoodie pulled off one shoulder, bare legs visible, cozy and revealing contrast", icon: "🧥" },
  { id: "sundress", label: "Robe d'Été", value: "flowy thin-strap sundress, light fabric, feminine", icon: "🌸" },
  { id: "jeans_bra", label: "Jean + Brassière", value: "low-rise jeans with fitted sports bra, exposed midriff", icon: "👖" },
  { id: "onepiece", label: "Maillot 1 Pièce", value: "high-cut one-piece swimsuit, plunging neckline", icon: "🩱" },
  { id: "lingerie", label: "Lingerie", value: "delicate lace lingerie set, sheer fabric details", icon: "🎀" },
  { id: "gym", label: "Tenue Sport", value: "tight sports leggings and cropped workout top, athletic wear", icon: "💪" },
];

const ENV_PRESETS = [
  { id: "beach", label: "Plage Tropicale", value: "tropical beach at golden hour, warm fine sand, palm trees, gentle turquoise waves, golden orange sky, paradise setting", icon: "🏖️", lighting: "golden_hour" },
  { id: "pool_night", label: "Piscine Nuit", value: "luxury infinity pool at night, underwater LED lights casting blue glow, dark sky with stars, modern architecture, lounge chairs", icon: "🌙", lighting: "neon" },
  { id: "bedroom", label: "Chambre", value: "cozy modern bedroom, soft white bed sheets, warm bedside lamp, personal items, intimate private setting, soft textures", icon: "🛏️", lighting: "soft_indoor" },
  { id: "rooftop", label: "Rooftop Nuit", value: "urban rooftop at night, panoramic city skyline with glowing lights, string lights overhead, moody metropolitan atmosphere", icon: "🏙️", lighting: "neon" },
  { id: "garden", label: "Jardin", value: "lush green garden in warm afternoon sun, colorful flowers, dense foliage, dappled sunlight filtering through trees, natural paradise", icon: "🌿", lighting: "golden_hour" },
  { id: "bathroom", label: "Salle de Bain", value: "modern luxury bathroom, large mirror, marble surfaces, soft ambient steam, warm lighting, private intimate space", icon: "🪞", lighting: "soft_indoor" },
  { id: "cafe", label: "Café Terrasse", value: "charming outdoor café terrace, warm European afternoon, espresso cups on table, cobblestone street backdrop, ambient chatter", icon: "☕", lighting: "natural" },
  { id: "car", label: "Voiture", value: "inside luxury car, leather seats, dashboard ambient lights, natural light through tinted windows, casual candid moment", icon: "🚗", lighting: "natural" },
  { id: "party", label: "Soirée / Club", value: "night club or house party, colorful dynamic lights, crowd in blurred background, high energy atmosphere, flash photography feel", icon: "🎉", lighting: "flash" },
  { id: "gym_env", label: "Salle de Sport", value: "modern gym interior, equipment in background, mirrors, bright overhead lighting, athletic environment", icon: "🏋️", lighting: "natural" },
  { id: "yacht", label: "Yacht", value: "luxury yacht deck, open ocean horizon, sun reflecting on water, expensive teak wood deck, exclusive atmosphere", icon: "🛥️", lighting: "golden_hour" },
  { id: "hotel", label: "Chambre d'Hôtel", value: "upscale hotel room, floor-to-ceiling windows with city view, king bed, modern luxury decor, ambient mood lighting", icon: "🏨", lighting: "soft_indoor" },
];

const POSE_PRESETS = [
  { id: "selfie_front", label: "Selfie Face", value: "front-facing selfie, one arm extended holding smartphone, slight head tilt, direct eye contact with camera lens, natural arm position" },
  { id: "selfie_mirror", label: "Selfie Miroir", value: "mirror selfie, phone held at chest level with both hands, slight twist of torso showing curves, looking at phone screen in reflection" },
  { id: "standing", label: "Debout Face", value: "standing facing camera, relaxed natural posture, one hip slightly popped to side, arms naturally at sides or one hand on hip" },
  { id: "sitting", label: "Assise", value: "seated casually on edge of surface, leaning slightly forward, hands resting on knees, legs together or slightly parted" },
  { id: "back_view", label: "Vue de Dos", value: "back view showing rear silhouette, looking over shoulder toward camera with soft smile, natural arch in lower back, showcasing posterior" },
  { id: "lying_side", label: "Allongée Côté", value: "lying on side propped up on one elbow, body creating S-curve, other hand resting on hip, looking at camera" },
  { id: "leaning", label: "Accoudée", value: "leaning back against wall or railing, one leg bent, casual confident stance, arms relaxed, head tilted" },
  { id: "walking", label: "Marche Candid", value: "mid-walk candid shot, natural body movement, hair flowing with motion, one foot forward, relaxed expression, authentic movement" },
  { id: "kneeling", label: "À Genoux", value: "kneeling on soft surface, sitting back on heels, hands on thighs, upright torso, direct gaze at camera" },
  { id: "bending", label: "Penchée", value: "leaning forward slightly, hands on knees or surface, emphasizing upper body, looking up at camera from below eye level" },
];

const LIGHTING_PRESETS = [
  { id: "golden_hour", label: "Heure Dorée", value: "warm natural golden hour sunlight, soft directional warmth, sun-kissed glow on skin, long gentle shadows, orange-warm color cast" },
  { id: "flash", label: "Flash Smartphone", value: "direct harsh smartphone flash at night, strong frontal illumination, dark background falloff, raw flash photography look, hard shadows behind subject" },
  { id: "soft_indoor", label: "Lumière Douce", value: "soft warm ambient indoor lighting from bedside lamp, intimate gentle shadows, warm color temperature, cozy atmosphere lighting" },
  { id: "neon", label: "Néons / Club", value: "colorful neon light reflections on skin, alternating blue pink and purple tones, nightlife atmosphere, dynamic colored shadows" },
  { id: "natural", label: "Lumière Naturelle", value: "soft diffused natural daylight, even illumination, gentle shadows, clean and bright, true-to-life color rendering" },
  { id: "window", label: "Lumière Fenêtre", value: "directional soft window light from one side, creating gentle shadow gradient across face and body, Rembrandt-style natural lighting" },
  { id: "sunset_back", label: "Contre-jour", value: "deep sunset backlighting, warm orange-pink sky behind, golden rim light outlining hair and body edges, silhouette contrast" },
  { id: "overcast", label: "Ciel Couvert", value: "soft overcast sky diffused light, no harsh shadows, even flattering illumination, muted tones, cloudy day natural beauty" },
];

const MOOD_PRESETS = [
  { id: "sultry", label: "Séductrice", value: "sultry confident expression, slightly parted lips, intense direct smoldering gaze, bedroom eyes, magnetic presence", emoji: "😏" },
  { id: "smile", label: "Sourire Naturel", value: "genuine warm radiant smile, eyes crinkling slightly, relaxed happy expression, approachable and naturally joyful", emoji: "😊" },
  { id: "candid", label: "Candid", value: "caught mid-moment candid expression, unposed authentic reaction, natural and spontaneous, real-life captured feel", emoji: "📸" },
  { id: "playful", label: "Joueuse", value: "playful teasing expression, slight smirk, mischievous sparkling eyes, fun youthful energy, tongue or lip bite", emoji: "😜" },
  { id: "dreamy", label: "Rêveuse", value: "soft dreamy faraway expression, gazing slightly off-camera, peaceful serene energy, gentle half-smile, ethereal mood", emoji: "🌙" },
  { id: "confident", label: "Confiante", value: "strong self-assured expression, chin slightly raised, powerful direct gaze, commanding presence, alpha energy", emoji: "💎" },
  { id: "laugh", label: "Rire", value: "mid-laugh genuine expression, mouth open in joy, eyes squinting with happiness, natural unforced laughter, infectious energy", emoji: "😂" },
  { id: "mysterious", label: "Mystérieuse", value: "enigmatic half-smile, eyes partially hidden by hair or shadow, mysterious alluring presence, leaving something to imagination", emoji: "🖤" },
];

const CAMERA_PRESETS = [
  { id: "selfie", label: "Selfie Smartphone", value: { shot_type: "smartphone selfie", angle: "slightly above eye level", perspective: "wide smartphone front camera lens, slight barrel distortion", distance: "arm's length, close-up" } },
  { id: "candid", label: "Photo Candid", value: { shot_type: "candid friend photo", angle: "eye level, natural", perspective: "standard smartphone rear camera", distance: "medium shot, waist up" } },
  { id: "full_body", label: "Plein Pied", value: { shot_type: "full body photo", angle: "eye level or slightly low", perspective: "standard lens, minimal distortion", distance: "full body visible, some environment" } },
  { id: "close_up", label: "Gros Plan", value: { shot_type: "close-up portrait", angle: "eye level, intimate", perspective: "portrait mode, shallow depth of field", distance: "face and upper chest" } },
  { id: "low_angle", label: "Contre-plongée", value: { shot_type: "low angle photo", angle: "from below looking up", perspective: "dramatic low perspective, subject dominant", distance: "medium, emphasizing height and presence" } },
];

const NEGATIVE_PROMPT_FULL = "anatomy normalization, breast reduction, smaller bust than reference, volume compression, torso slimming, bust flattening, chest volume reduction, skin smoothing, beautification filters, depth flattening, body proportion averaging, dataset-average female anatomy, cinematic color grading, studio lighting setup, airbrushed skin texture, plastic unrealistic skin, oversaturated colors, doll-like features, cartoon proportions, symmetry enforcement, overly perfect features, digital art look, 3D render aesthetic, painting illustration style, anime style, blurry out-of-focus, lens blur artifacts, overexposed blown highlights, underexposed crushed blacks, excessive noise grain, watermark text overlay, extra limbs fingers, deformed hands, cross-eyed, asymmetric eyes, uncanny valley, wax figure look, mannequin appearance, stock photo aesthetic, magazine retouching, HDR tonemapping, vignette effect";

const ANATOMICAL_PRESETS = [
  { id: "extreme_curves", label: "Courbes Extrêmes", value: "Exact preservation of high-volume chest-to-waist ratio, heavy natural outward projection, bust depth exceeding ribcage width, no chest volume reduction, gravity and soft tissue realism, no anatomy normalization, no proportion averaging, maintain extreme waist-to-hip differential" },
  { id: "athletic", label: "Physique Athlétique", value: "Preserve visible muscle definition and low body fat percentage, maintain broad shoulders to narrow waist V-taper, no muscle smoothing, visible veins and sinew detail, athletic proportions without softening" },
  { id: "natural_soft", label: "Corps Naturel Doux", value: "Preserve natural body fat distribution, visible skin folds and cellulite, no smoothing or idealization, gravity-realistic soft tissue, maintain authentic body imperfections, no toning or slimming" },
  { id: "petite", label: "Silhouette Menue", value: "Maintain small frame proportions, do not scale up or average body size, preserve delicate bone structure, small hands and feet, narrow shoulders, compact proportions" },
  { id: "voluptuous", label: "Silhouette Voluptueuse", value: "Maintain full-figured proportions throughout, no slimming or volume reduction anywhere, preserve heavy natural tissue weight and movement, gravity-realistic large proportions, thick thighs and full arms" },
  { id: "custom", label: "Personnalisé", value: "" },
];

const SIGNATURE_PRESETS = [
  { id: "beach_girl", label: "Fille de Plage", value: "candid smartphone aesthetic, raw authenticity, sun-kissed beach girl energy" },
  { id: "instagram", label: "Influenceuse Instagram", value: "polished Instagram aesthetic, curated lifestyle, aspirational but relatable" },
  { id: "editorial", label: "Éditorial Brut", value: "raw editorial photography, high fashion meets street, unretouched powerful imagery" },
  { id: "girl_next_door", label: "Fille d'à Côté", value: "approachable everyday beauty, natural no-makeup look, warm genuine personality" },
  { id: "luxury", label: "Style Luxe", value: "luxury lifestyle aesthetic, designer fashion, exclusive locations, refined elegance" },
  { id: "alt_girl", label: "Alt / E-Girl", value: "alternative aesthetic, edgy makeup, bold hair colors, punk or gothic influences, expressive" },
  { id: "fitness", label: "Modèle Fitness", value: "fitness lifestyle, gym selfies, progress shots, athletic and powerful, motivational energy" },
  { id: "custom", label: "Personnalisé", value: "" },
];

// ═══════════════════════════════════════════════════════════
// STOCKAGE LOCAL
// ═══════════════════════════════════════════════════════════

function loadProfiles() {
  try { const r = localStorage.getItem("model-profiles"); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
function saveProfiles(profiles) {
  try { localStorage.setItem("model-profiles", JSON.stringify(profiles)); } catch (e) { console.error(e); }
}
function loadHistory() {
  try { const r = localStorage.getItem("gen-history"); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem("gen-history", JSON.stringify(h.slice(0, 50))); } catch (e) { console.error(e); }
}

// ═══════════════════════════════════════════════════════════
// GÉNÉRATEUR JSON (sortie en anglais)
// ═══════════════════════════════════════════════════════════

function buildJSON(model, scene) {
  const m = model;
  const subjectDesc = `${m.age} year old woman, ${m.face.shape} face shape with ${m.face.jawline} jawline, ${m.eyes.color} ${m.eyes.shape} eyes (${m.eyes.size}, ${m.eyes.lashes}, ${m.eyes.brows}), ${m.lips.shape} lips (${m.lips.upper}, ${m.lips.lower}), ${m.nose.shape} nose, ${m.hair.color} ${m.hair.length} ${m.hair.texture} hair (${m.hair.style}), ${m.skin.tone} skin with ${m.skin.texture}, ${m.skin.features}, ${m.skin.details}. Body: ${m.body.type} silhouette, bust: ${m.body.bust}, waist: ${m.body.waist}, hips: ${m.body.hips}, ${m.body.limbs}. ${m.body.details}. ${scene.outfit}.`;

  return {
    subject: { description: subjectDesc, anatomical_fidelity: m.anatomical_fidelity },
    pose: {
      description: scene.pose, posture: "natural, relaxed, authentic body language",
      limb_placement: "anatomically correct, natural positioning",
      constraints: ["anatomically correct limb placement", "no unnatural joint bending", "realistic hand and finger positioning", "natural weight distribution"]
    },
    environment: {
      location: scene.environment,
      background_elements: "natural contextual details, lived-in authentic environment",
      spatial_depth: "clear foreground subject separation, natural depth layers, realistic spatial relationships, 3D volume preservation"
    },
    camera: {
      shot_type: scene.camera.shot_type, angle: scene.camera.angle,
      framing: "3:4 vertical", perspective: scene.camera.perspective,
      depth_of_field: "shallow depth of field, subject tack sharp, background naturally soft",
      distance: scene.camera.distance
    },
    lighting: {
      description: scene.lighting,
      skin_interaction: "natural light interaction with skin texture, visible pore detail, subsurface scattering, realistic specular highlights and diffuse shadows"
    },
    mood_and_expression: { expression: scene.mood, energy: scene.moodEnergy || "natural, authentic, unforced" },
    style_and_realism: "Photorealistic digital photography, raw and unedited, candid smartphone photography, no filters, no smoothing, no beautification, visible pores, natural skin texture, subsurface scattering, authentic imperfections, real-life captured moment",
    colors_and_tone: {
      palette: "natural realistic tones, true-to-life skin colors, no artificial color grading",
      saturation: "natural saturation levels, no oversaturation",
      contrast: "natural dynamic range, no HDR tonemapping",
      white_balance: scene.whiteBalance || "natural, scene-appropriate"
    },
    quality_and_technical_details: {
      resolution: "high resolution, maximum detail preservation",
      sharpness: "tack sharp on subject, natural lens characteristics",
      texture_detail: "visible skin pores, fabric weave texture, hair strand detail, environmental texture",
      noise: "minimal clean noise, no excessive grain",
      artifacts: "zero AI artifacts, no smoothing, no plastic skin, no uncanny valley"
    },
    aspect_ratio_and_output: "3:4",
    controlnet: {
      pose_control: {
        model_type: "DWPose", purpose: "Maintain exact pose positioning and anatomical proportions throughout generation",
        recommended_weight: 1.15,
        constraints: ["no chest volume reduction", "preserve prominent chest foreground dominance", "maintain extreme waist-to-hip ratio", "preserve natural body proportions as described", "no anatomy normalization or averaging"]
      },
      depth_control: {
        model_type: "ZoeDepth", purpose: "Preserve accurate 3D volume, spatial depth, and realistic body dimensionality",
        recommended_weight: 1.0,
        constraints: ["no depth flattening", "maintain 3D volume and gravity realism", "realistic foreground-background separation", "preserve bust projection depth and body curvature", "natural shadow depth mapping"]
      }
    },
    negative_prompt: NEGATIVE_PROMPT_FULL,
    ...(scene.extra ? { additional_notes: scene.extra } : {})
  };
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

const FONT_LINK = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700;800&display=swap";

const theme = {
  bg: "#08080a", surface: "#111114", surface2: "#18181c", border: "#222228",
  border2: "#2a2a32", accent: "#e4a853", accent2: "#c48a2a", accentBg: "rgba(228,168,83,0.08)",
  accentBorder: "rgba(228,168,83,0.25)", text: "#e8e8ec", text2: "#9898a4", text3: "#5a5a68",
  danger: "#e85454", success: "#4ade80", white: "#ffffff", info: "#60a5fa",
};

const css = {
  page: { fontFamily: "'DM Mono', monospace", background: theme.bg, minHeight: "100vh", color: theme.text, fontSize: 13 },
  label: { fontFamily: "'Outfit'", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: theme.accent, marginBottom: 6, display: "block" },
  input: { width: "100%", background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: 8, padding: "9px 11px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" },
  select: { width: "100%", background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: 8, padding: "9px 11px", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box", appearance: "none", cursor: "pointer", transition: "border-color 0.2s", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239898a4' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 30 },
  card: { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 },
  btnPrimary: { padding: "11px 20px", background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, border: "none", borderRadius: 10, color: theme.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit'", letterSpacing: "0.02em", transition: "all 0.15s", boxShadow: `0 4px 20px rgba(228,168,83,0.2)` },
  btnGhost: { padding: "8px 14px", background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.text2, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit'", transition: "all 0.15s" },
  btnDanger: { padding: "8px 14px", background: "transparent", border: `1px solid rgba(232,84,84,0.3)`, borderRadius: 8, color: theme.danger, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit'", transition: "all 0.15s" },
  chip: (active) => ({ padding: "7px 12px", background: active ? theme.accentBg : theme.surface, border: `1px solid ${active ? theme.accentBorder : theme.border}`, borderRadius: 8, color: active ? theme.accent : theme.text2, fontSize: 11, cursor: "pointer", fontFamily: "'Outfit'", fontWeight: active ? 600 : 400, transition: "all 0.15s", whiteSpace: "nowrap" }),
  section: { marginBottom: 24 },
  badge: (color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, fontFamily: "'Outfit'", letterSpacing: "0.05em", textTransform: "uppercase", background: `${color}18`, color, border: `1px solid ${color}40` }),
};

// ═══════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════

function Field({ label, value, onChange, placeholder, multi, small }) {
  const Tag = multi ? "textarea" : "input";
  return (
    <div style={{ marginBottom: small ? 8 : 12 }}>
      {label && <label style={css.label}>{label}</label>}
      <Tag value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={multi ? 2 : undefined}
        style={{ ...css.input, ...(multi ? { resize: "vertical", minHeight: 44 } : {}), ...(small ? { fontSize: 11, padding: "6px 9px" } : {}) }}
        onFocus={e => e.target.style.borderColor = theme.accent}
        onBlur={e => e.target.style.borderColor = theme.border} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, small }) {
  const isCustom = !options.includes(value) && value !== "";
  return (
    <div style={{ marginBottom: small ? 8 : 12 }}>
      {label && <label style={css.label}>{label}</label>}
      <select value={isCustom ? "__custom__" : value}
        onChange={e => {
          if (e.target.value === "__custom__") onChange(value);
          else onChange(e.target.value);
        }}
        style={{ ...css.select, ...(small ? { fontSize: 10, padding: "6px 9px" } : {}) }}
        onFocus={e => e.target.style.borderColor = theme.accent}
        onBlur={e => e.target.style.borderColor = theme.border}>
        {options.map((opt, i) => <option key={i} value={opt} style={{ background: theme.surface, color: theme.text }}>{opt}</option>)}
        <option value="__custom__" style={{ background: theme.surface, color: theme.accent }}>✏️ Personnalisé...</option>
      </select>
      {isCustom && (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="Valeur personnalisée..."
          style={{ ...css.input, marginTop: 4, fontSize: 10, padding: "5px 8px", borderColor: theme.accentBorder }} />
      )}
    </div>
  );
}

function ChipSelect({ label, options, value, onChange, columns = 4 }) {
  return (
    <div style={css.section}>
      {label && <label style={css.label}>{label}</label>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 6 }}>
        {options.map(o => (
          <button key={o.id} onClick={() => onChange(o.id)} style={css.chip(value === o.id)}>
            {o.icon && <span style={{ marginRight: 4 }}>{o.icon}</span>}
            {o.emoji && <span style={{ marginRight: 4 }}>{o.emoji}</span>}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${theme.border}`, background: theme.surface, position: "sticky", top: 0, zIndex: 50 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: "12px 8px", background: active === t.id ? theme.accentBg : "transparent",
          border: "none", borderBottom: active === t.id ? `2px solid ${theme.accent}` : "2px solid transparent",
          color: active === t.id ? theme.accent : theme.text3, fontSize: 11, fontWeight: 600, cursor: "pointer",
          fontFamily: "'Outfit'", textTransform: "uppercase", letterSpacing: "0.1em", transition: "all 0.2s", position: "relative",
        }}>
          {t.icon} {t.label}
          {t.badge && <span style={{ position: "absolute", top: 6, right: 8, width: 6, height: 6, borderRadius: "50%", background: theme.accent }} />}
        </button>
      ))}
    </div>
  );
}

function Collapsible({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...css.card, marginBottom: 12 }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: open ? 14 : 0 }}>
        <label style={{ ...css.label, fontSize: 12, marginBottom: 0, cursor: "pointer", pointerEvents: "none" }}>{icon} {title}</label>
        <span style={{ color: theme.text3, fontSize: 16, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </button>
      {open && children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ÉDITEUR DE MODÈLE (avec liste déroulante profils + import JSON)
// ═══════════════════════════════════════════════════════════

function ModelEditor({ model, setModel, onSave, profiles, onLoad, onDelete, onRandomize, onReset }) {
  const u = (path, val) => {
    setModel(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = val;
      return copy;
    });
  };

  const profileNames = Object.keys(profiles);
  const [jsonImportVal, setJsonImportVal] = useState("");
  const [jsonImportError, setJsonImportError] = useState("");
  const [jsonImportSuccess, setJsonImportSuccess] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  const handleExport = () => {
    const json = JSON.stringify(model, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2200);
  };

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonImportVal);
      if (parsed.name && parsed.face && parsed.eyes) {
        setModel(parsed);
        setJsonImportError("");
        setJsonImportSuccess(true);
        setTimeout(() => { setJsonImportSuccess(false); setJsonImportVal(""); }, 2000);
      } else {
        setJsonImportError("JSON invalide : les champs 'name', 'face' et 'eyes' sont requis.");
      }
    } catch {
      setJsonImportError("Erreur de syntaxe JSON. Vérifiez le format.");
    }
  };

  const currentAnatPreset = ANATOMICAL_PRESETS.find(p => p.value === model.anatomical_fidelity);
  const [anatPresetId, setAnatPresetId] = useState(currentAnatPreset?.id || "custom");

  const currentSigPreset = SIGNATURE_PRESETS.find(p => p.value === model.signature);
  const [sigPresetId, setSigPresetId] = useState(currentSigPreset?.id || "custom");

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      {/* SECTION 1: Import rapide JSON */}
      <Collapsible title="Import Rapide JSON" icon="📋" defaultOpen={false}>
        <p style={{ fontSize: 11, color: theme.text3, marginBottom: 10, lineHeight: 1.5 }}>
          Si vous avez déjà le JSON complet d'un modèle, collez-le ici pour charger instantanément toutes ses caractéristiques.
        </p>
        <textarea
          value={jsonImportVal}
          onChange={e => { setJsonImportVal(e.target.value); setJsonImportError(""); setJsonImportSuccess(false); }}
          rows={5}
          placeholder={'{\n  "name": "Luna",\n  "age": "23",\n  "face": { ... },\n  "eyes": { ... },\n  ...\n}'}
          style={{ ...css.input, resize: "vertical", minHeight: 80, fontSize: 10, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}
        />
        {jsonImportError && (
          <div style={{ fontSize: 11, color: theme.danger, marginBottom: 8, padding: "6px 10px", background: `${theme.danger}15`, borderRadius: 6, border: `1px solid ${theme.danger}30` }}>
            ⚠️ {jsonImportError}
          </div>
        )}
        {jsonImportSuccess && (
          <div style={{ fontSize: 11, color: theme.success, marginBottom: 8, padding: "6px 10px", background: `${theme.success}15`, borderRadius: 6, border: `1px solid ${theme.success}30` }}>
            ✅ Modèle importé avec succès !
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleJsonImport} disabled={!jsonImportVal.trim()} style={{ ...css.btnPrimary, padding: "8px 16px", fontSize: 11, opacity: jsonImportVal.trim() ? 1 : 0.4 }}>
            📥 Importer ce modèle
          </button>
          {jsonImportVal && (
            <button onClick={() => { setJsonImportVal(""); setJsonImportError(""); }} style={{ ...css.btnGhost, fontSize: 11, padding: "8px 12px" }}>
              ✕ Effacer
            </button>
          )}
        </div>
      </Collapsible>

      {/* SECTION 2: Gestion des profils avec liste déroulante */}
      <div style={{ ...css.card, marginBottom: 16, borderColor: theme.accentBorder }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <label style={{ ...css.label, marginBottom: 0 }}>💾 Profils sauvegardés</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleExport} style={{ ...css.btnGhost, padding: "6px 12px", fontSize: 10, color: copiedExport ? theme.success : theme.text2, borderColor: copiedExport ? theme.success : theme.border }}>
              {copiedExport ? "✓ Copié !" : "📤 Exporter"}
            </button>
            <button onClick={onSave} style={{ ...css.btnPrimary, padding: "6px 14px", fontSize: 11 }}>💾 Sauvegarder</button>
          </div>
        </div>

        {profileNames.length > 0 ? (
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value=""
                onChange={e => { if (e.target.value) onLoad(e.target.value); }}
                style={{ ...css.select, flex: 1, fontSize: 12 }}
              >
                <option value="" style={{ background: theme.surface, color: theme.text3 }}>— Sélectionner un profil —</option>
                {profileNames.map(name => (
                  <option key={name} value={name} style={{ background: theme.surface, color: theme.text }}>{name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {profileNames.map(name => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 2, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "3px 3px 3px 8px", fontSize: 10 }}>
                  <span style={{ color: theme.text2, fontFamily: "'Outfit'", fontWeight: 500 }}>{name}</span>
                  <button onClick={() => onDelete(name)} style={{ background: "none", border: "none", color: theme.text3, fontSize: 12, cursor: "pointer", padding: "2px 4px", lineHeight: 1 }} title="Supprimer">×</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ color: theme.text3, fontSize: 11, margin: 0 }}>Aucun profil sauvegardé. Configurez un modèle et cliquez sur Sauvegarder.</p>
        )}
      </div>

      {/* Actions rapides */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={onRandomize} style={{ ...css.btnGhost, borderColor: theme.info + "50", color: theme.info, fontSize: 11, padding: "6px 12px" }}>🎲 Aléatoire</button>
        <button onClick={onReset} style={{ ...css.btnGhost, fontSize: 11, padding: "6px 12px" }}>↺ Réinitialiser</button>
      </div>

      {/* Identité */}
      <Collapsible title="Identité" icon="🪪">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <Field label="Nom / Alias" value={model.name} onChange={v => u("name", v)} />
          <Field label="Âge" value={model.age} onChange={v => u("age", v)} />
        </div>
      </Collapsible>

      {/* Visage */}
      <Collapsible title="Visage" icon="👤" defaultOpen={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectField label="Forme du visage" value={model.face.shape} onChange={v => u("face.shape", v)} options={MODEL_OPTIONS.face.shape} small />
          <SelectField label="Mâchoire" value={model.face.jawline} onChange={v => u("face.jawline", v)} options={MODEL_OPTIONS.face.jawline} small />
        </div>
        <SelectField label="Front" value={model.face.forehead} onChange={v => u("face.forehead", v)} options={MODEL_OPTIONS.face.forehead} small />
      </Collapsible>

      {/* Yeux */}
      <Collapsible title="Yeux" icon="👁️" defaultOpen={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectField label="Couleur" value={model.eyes.color} onChange={v => u("eyes.color", v)} options={MODEL_OPTIONS.eyes.color} small />
          <SelectField label="Forme" value={model.eyes.shape} onChange={v => u("eyes.shape", v)} options={MODEL_OPTIONS.eyes.shape} small />
          <SelectField label="Taille" value={model.eyes.size} onChange={v => u("eyes.size", v)} options={MODEL_OPTIONS.eyes.size} small />
          <SelectField label="Cils" value={model.eyes.lashes} onChange={v => u("eyes.lashes", v)} options={MODEL_OPTIONS.eyes.lashes} small />
        </div>
        <SelectField label="Sourcils" value={model.eyes.brows} onChange={v => u("eyes.brows", v)} options={MODEL_OPTIONS.eyes.brows} small />
      </Collapsible>

      {/* Bouche & Nez */}
      <Collapsible title="Bouche & Nez" icon="👄" defaultOpen={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectField label="Forme des lèvres" value={model.lips.shape} onChange={v => u("lips.shape", v)} options={MODEL_OPTIONS.lips.shape} small />
          <SelectField label="Nez" value={model.nose.shape} onChange={v => u("nose.shape", v)} options={MODEL_OPTIONS.nose.shape} small />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectField label="Lèvre supérieure" value={model.lips.upper} onChange={v => u("lips.upper", v)} options={MODEL_OPTIONS.lips.upper} small />
          <SelectField label="Lèvre inférieure" value={model.lips.lower} onChange={v => u("lips.lower", v)} options={MODEL_OPTIONS.lips.lower} small />
        </div>
      </Collapsible>

      {/* Cheveux */}
      <Collapsible title="Cheveux" icon="💇" defaultOpen={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectField label="Couleur" value={model.hair.color} onChange={v => u("hair.color", v)} options={MODEL_OPTIONS.hair.color} small />
          <SelectField label="Longueur" value={model.hair.length} onChange={v => u("hair.length", v)} options={MODEL_OPTIONS.hair.length} small />
          <SelectField label="Texture" value={model.hair.texture} onChange={v => u("hair.texture", v)} options={MODEL_OPTIONS.hair.texture} small />
          <SelectField label="Coiffure" value={model.hair.style} onChange={v => u("hair.style", v)} options={MODEL_OPTIONS.hair.style} small />
        </div>
      </Collapsible>

      {/* Peau */}
      <Collapsible title="Peau" icon="✨" defaultOpen={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectField label="Teint" value={model.skin.tone} onChange={v => u("skin.tone", v)} options={MODEL_OPTIONS.skin.tone} small />
          <SelectField label="Texture" value={model.skin.texture} onChange={v => u("skin.texture", v)} options={MODEL_OPTIONS.skin.texture} small />
        </div>
        <SelectField label="Traits particuliers" value={model.skin.features} onChange={v => u("skin.features", v)} options={MODEL_OPTIONS.skin.features} small />
        <SelectField label="Éclat de la peau" value={model.skin.sheen} onChange={v => u("skin.sheen", v)} options={MODEL_OPTIONS.skin.sheen} small />
        <SelectField label="Détails (marques, grains de beauté...)" value={model.skin.details} onChange={v => u("skin.details", v)} options={MODEL_OPTIONS.skin.details} small />
      </Collapsible>

      {/* Corps */}
      <Collapsible title="Corps" icon="🏋️" defaultOpen={false}>
        <SelectField label="Type de silhouette" value={model.body.type} onChange={v => u("body.type", v)} options={MODEL_OPTIONS.body.type} small />
        <SelectField label="Poitrine" value={model.body.bust} onChange={v => u("body.bust", v)} options={MODEL_OPTIONS.body.bust} small />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectField label="Taille" value={model.body.waist} onChange={v => u("body.waist", v)} options={MODEL_OPTIONS.body.waist} small />
          <SelectField label="Hanches" value={model.body.hips} onChange={v => u("body.hips", v)} options={MODEL_OPTIONS.body.hips} small />
        </div>
        <SelectField label="Fessier" value={model.body.glutes} onChange={v => u("body.glutes", v)} options={MODEL_OPTIONS.body.glutes} small />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectField label="Hauteur" value={model.body.height} onChange={v => u("body.height", v)} options={MODEL_OPTIONS.body.height} small />
          <SelectField label="Membres" value={model.body.limbs} onChange={v => u("body.limbs", v)} options={MODEL_OPTIONS.body.limbs} small />
        </div>
        <SelectField label="Détails corporels" value={model.body.details} onChange={v => u("body.details", v)} options={MODEL_OPTIONS.body.details} small />
      </Collapsible>

      {/* Fidélité Anatomique */}
      <Collapsible title="Fidélité Anatomique" icon="🛡️" defaultOpen={false}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {ANATOMICAL_PRESETS.map(p => (
            <button key={p.id} onClick={() => {
              setAnatPresetId(p.id);
              if (p.id !== "custom") u("anatomical_fidelity", p.value);
            }} style={css.chip(anatPresetId === p.id)}>{p.label}</button>
          ))}
        </div>
        <Field value={model.anatomical_fidelity} onChange={v => { u("anatomical_fidelity", v); setAnatPresetId("custom"); }} multi placeholder="Contraintes anti-normalisation..." />
      </Collapsible>

      {/* Signature / Style */}
      <Collapsible title="Signature / Style" icon="🎯" defaultOpen={false}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {SIGNATURE_PRESETS.map(p => (
            <button key={p.id} onClick={() => {
              setSigPresetId(p.id);
              if (p.id !== "custom") u("signature", p.value);
            }} style={css.chip(sigPresetId === p.id)}>{p.label}</button>
          ))}
        </div>
        <Field value={model.signature} onChange={v => { u("signature", v); setSigPresetId("custom"); }} placeholder="Le style unique de ce modèle..." />
      </Collapsible>

      {/* Aperçu */}
      <div style={{ ...css.card, borderColor: theme.border2, marginTop: 4 }}>
        <label style={{ ...css.label, marginBottom: 10 }}>👁️ Aperçu rapide du modèle</label>
        <div style={{ fontSize: 11, lineHeight: 1.7, color: theme.text2 }}>
          <strong style={{ color: theme.accent }}>{model.name}</strong>, {model.age} ans —{" "}
          {model.hair.color} {model.hair.texture}, yeux {model.eyes.color}, peau {model.skin.tone}.{" "}
          Silhouette {model.body.type}, {model.body.height}.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CONSTRUCTEUR DE SCÈNE
// ═══════════════════════════════════════════════════════════

function SceneBuilder({ scene, setScene, model, onGenerate }) {
  const s = (key, val) => setScene(prev => ({ ...prev, [key]: val }));

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{ background: theme.accentBg, border: `1px solid ${theme.accentBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>👤</span>
        <div>
          <div style={{ fontFamily: "'Outfit'", fontWeight: 700, color: theme.accent, fontSize: 14 }}>{model.name}</div>
          <div style={{ fontSize: 10, color: theme.text3 }}>Modèle actif • Les caractéristiques physiques sont verrouillées</div>
        </div>
      </div>

      <ChipSelect label="👗 Tenue" options={OUTFIT_PRESETS} value={scene.outfitId} onChange={v => s("outfitId", v)} columns={3} />
      {scene.outfitId === "custom_outfit" || !OUTFIT_PRESETS.find(o => o.id === scene.outfitId) ? null :
        <div style={{ marginTop: -16, marginBottom: 20 }}>
          <Field value={scene.outfitCustom || ""} onChange={v => s("outfitCustom", v)} placeholder="Personnaliser la tenue..." small />
        </div>
      }

      <ChipSelect label="🌍 Environnement" options={ENV_PRESETS} value={scene.envId} onChange={v => {
        s("envId", v);
        const env = ENV_PRESETS.find(e => e.id === v);
        if (env?.lighting) s("lightId", env.lighting);
      }} columns={3} />
      <div style={{ marginTop: -16, marginBottom: 20 }}>
        <Field value={scene.envCustom || ""} onChange={v => s("envCustom", v)} placeholder="Personnaliser / ajouter des détails au décor..." small />
      </div>

      <ChipSelect label="🤸 Pose" options={POSE_PRESETS} value={scene.poseId} onChange={v => s("poseId", v)} columns={2} />
      <ChipSelect label="📷 Caméra" options={CAMERA_PRESETS} value={scene.camId} onChange={v => s("camId", v)} columns={3} />
      <ChipSelect label="💡 Éclairage" options={LIGHTING_PRESETS} value={scene.lightId} onChange={v => s("lightId", v)} columns={2} />
      <ChipSelect label="😏 Expression / Humeur" options={MOOD_PRESETS} value={scene.moodId} onChange={v => s("moodId", v)} columns={2} />

      <div style={css.section}>
        <label style={css.label}>📝 Notes & détails supplémentaires</label>
        <textarea value={scene.extra || ""} onChange={e => s("extra", e.target.value)} placeholder="Accessoires, contexte narratif, détails spécifiques..." rows={3}
          style={{ ...css.input, resize: "vertical", minHeight: 60 }} />
      </div>

      <div style={css.section}>
        <label style={css.label}>💬 Légende Instagram (optionnel)</label>
        <Field value={scene.caption || ""} onChange={v => s("caption", v)} placeholder="Ex: sunday night vibes 🌙" small />
      </div>

      <button onClick={onGenerate} style={{ ...css.btnPrimary, width: "100%", padding: 14, fontSize: 14 }}>
        ⚡ Générer le JSON
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VUE RÉSULTAT
// ═══════════════════════════════════════════════════════════

function OutputView({ json, caption, modelName, onBack, editableJson, setEditableJson }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const formatted = JSON.stringify(json, null, 2);

  const copy = (text) => {
    navigator.clipboard.writeText(text || formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const startEdit = () => {
    setEditing(true);
    setEditableJson(formatted);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditableJson("");
  };

  const applyEdit = () => {
    try {
      JSON.parse(editableJson);
      setEditing(false);
    } catch { /* JSON invalide, rester en édition */ }
  };

  // Prompt texte plat pour Higgsfield
  const higgsfieldPrompt = (() => {
    const j = json;
    const parts = [
      j.subject?.description,
      j.pose?.description,
      j.environment?.location,
      j.camera ? `${j.camera.shot_type}, ${j.camera.angle}, ${j.camera.perspective}` : "",
      j.lighting?.description,
      j.mood_and_expression?.expression,
      j.style_and_realism,
      j.subject?.anatomical_fidelity,
    ].filter(Boolean);
    return parts.join(". ").replace(/\.\./g, ".");
  })();

  const [copiedHf, setCopiedHf] = useState(false);
  const copyHf = () => {
    navigator.clipboard.writeText(higgsfieldPrompt).then(() => {
      setCopiedHf(true);
      setTimeout(() => setCopiedHf(false), 2200);
    });
  };

  const [copiedNeg, setCopiedNeg] = useState(false);

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      {caption && (
        <div style={{ marginBottom: 16, fontFamily: "'Outfit'", fontSize: 15, color: theme.text, fontWeight: 500 }}>
          {caption} <span style={{ color: theme.text3, fontSize: 12 }}>— NanaBanana Studio 🍌</span>
        </div>
      )}

      {/* Section JSON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: theme.text3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Outfit'", fontWeight: 600 }}>
          JSON • {modelName} • NanaBanana Studio
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {!editing && <button onClick={startEdit} style={{ ...css.btnGhost, fontSize: 10, padding: "5px 10px", color: theme.text3 }}>✏️ Éditer</button>}
          <button onClick={() => copy(editing ? editableJson : formatted)} style={{
            ...css.btnGhost, borderColor: copied ? theme.success : theme.border,
            color: copied ? theme.success : theme.accent, fontSize: 10, padding: "5px 10px"
          }}>
            {copied ? "✓ Copié !" : "📋 Copier JSON"}
          </button>
        </div>
      </div>

      {editing ? (
        <div>
          <textarea value={editableJson} onChange={e => setEditableJson(e.target.value)} style={{
            ...css.input, fontFamily: "'DM Mono', monospace", fontSize: 10, lineHeight: 1.5,
            minHeight: "40vh", resize: "vertical", background: "#050507", color: "#b0b0bc"
          }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={applyEdit} style={{ ...css.btnPrimary, flex: 1, fontSize: 11, padding: 8 }}>✓ Valider le JSON</button>
            <button onClick={cancelEdit} style={{ ...css.btnDanger, flex: 1, fontSize: 11, padding: 8 }}>✕ Annuler</button>
          </div>
        </div>
      ) : (
        <pre style={{
          background: "#050507", border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14,
          fontSize: 10.5, lineHeight: 1.5, color: "#b0b0bc", whiteSpace: "pre-wrap", wordBreak: "break-word",
          maxHeight: "50vh", overflowY: "auto", fontFamily: "'DM Mono', monospace"
        }}>{formatted}</pre>
      )}

      {/* Prompt Higgsfield */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: theme.text3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Outfit'", fontWeight: 600 }}>
              Prompt Higgsfield
            </span>
            <span style={css.badge(theme.info)}>Texte plat</span>
          </div>
        </div>
        <div style={{
          background: "#050507", border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14,
          fontSize: 10.5, lineHeight: 1.6, color: "#a8c4e0", maxHeight: "30vh", overflowY: "auto",
          fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word"
        }}>
          {higgsfieldPrompt}
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button onClick={copyHf} style={{
            ...css.btnGhost, flex: 1, fontSize: 11,
            borderColor: copiedHf ? theme.success : theme.info + "50",
            color: copiedHf ? theme.success : theme.info
          }}>
            {copiedHf ? "✓ Copié !" : "📋 Copier le prompt Higgsfield"}
          </button>
        </div>
      </div>

      {/* Prompt négatif */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: theme.text3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Outfit'", fontWeight: 600 }}>
            Prompt Négatif
          </span>
          <button onClick={() => { navigator.clipboard.writeText(json.negative_prompt); setCopiedNeg(true); setTimeout(() => setCopiedNeg(false), 2200); }} style={{ ...css.btnGhost, fontSize: 10, padding: "5px 10px", color: copiedNeg ? theme.success : theme.danger, borderColor: copiedNeg ? theme.success + "40" : theme.danger + "40" }}>
            {copiedNeg ? "✓ Copié !" : "📋 Copier"}
          </button>
        </div>
        <div style={{
          background: "#050507", border: `1px solid ${theme.danger}30`, borderRadius: 12, padding: 14,
          fontSize: 10, lineHeight: 1.5, color: "#e08080", maxHeight: "15vh", overflowY: "auto",
          fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word"
        }}>
          {json.negative_prompt}
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button onClick={onBack} style={{ ...css.btnGhost, flex: 1 }}>← Modifier la scène</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VUE HISTORIQUE
// ═══════════════════════════════════════════════════════════

function HistoryView({ history, onReload, onClear }) {
  if (!history.length) return (
    <div style={{ padding: 40, textAlign: "center", color: theme.text3 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
      <p style={{ fontFamily: "'Outfit'", fontSize: 14 }}>Aucune génération dans l'historique</p>
    </div>
  );

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <label style={{ ...css.label, marginBottom: 0 }}>📜 Dernières générations ({history.length})</label>
        <button onClick={onClear} style={{ ...css.btnDanger, fontSize: 10, padding: "5px 10px" }}>🗑️ Tout effacer</button>
      </div>
      {history.map((entry, i) => (
        <div key={i} style={{ ...css.card, marginBottom: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 13, color: theme.text }}>{entry.model || "?"}</div>
            <div style={{ fontSize: 10, color: theme.text3, marginTop: 2 }}>
              {new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              {entry.caption && <span style={{ marginLeft: 8, color: theme.text2 }}>"{entry.caption}"</span>}
            </div>
          </div>
          <button onClick={() => onReload(entry.scene)} style={{ ...css.btnGhost, fontSize: 10, padding: "5px 10px" }}>↻ Recharger</button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// APPLICATION PRINCIPALE
// ═══════════════════════════════════════════════════════════

export default function PromptStudio() {
  const [tab, setTab] = useState("scene");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [profiles, setProfiles] = useState({});
  const [scene, setScene] = useState({
    outfitId: "bikini_string", envId: "beach", poseId: "selfie_front",
    camId: "selfie", lightId: "golden_hour", moodId: "sultry",
    outfitCustom: "", envCustom: "", extra: "", caption: ""
  });
  const [jsonOutput, setJsonOutput] = useState(null);
  const [history, setHistory] = useState([]);
  const [editableJson, setEditableJson] = useState("");

  useEffect(() => {
    setProfiles(loadProfiles());
    setHistory(loadHistory());
  }, []);

  const handleSaveProfile = useCallback(() => {
    const updated = { ...profiles, [model.name]: JSON.parse(JSON.stringify(model)) };
    setProfiles(updated);
    saveProfiles(updated);
  }, [model, profiles]);

  const handleLoadProfile = useCallback((name) => {
    if (profiles[name]) setModel(JSON.parse(JSON.stringify(profiles[name])));
  }, [profiles]);

  const handleDeleteProfile = useCallback((name) => {
    const updated = { ...profiles };
    delete updated[name];
    setProfiles(updated);
    saveProfiles(updated);
  }, [profiles]);

  const handleRandomize = useCallback(() => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const names = ["Luna", "Maya", "Aria", "Zara", "Jade", "Nora", "Mila", "Sofia", "Ivy", "Lena", "Kira", "Vera", "Nina", "Elsa", "Ava"];
    const ages = ["19", "20", "21", "22", "23", "24", "25", "26", "27", "28"];
    setModel({
      name: pick(names), age: pick(ages),
      face: { shape: pick(MODEL_OPTIONS.face.shape), jawline: pick(MODEL_OPTIONS.face.jawline), forehead: pick(MODEL_OPTIONS.face.forehead) },
      eyes: { color: pick(MODEL_OPTIONS.eyes.color), shape: pick(MODEL_OPTIONS.eyes.shape), size: pick(MODEL_OPTIONS.eyes.size), lashes: pick(MODEL_OPTIONS.eyes.lashes), brows: pick(MODEL_OPTIONS.eyes.brows) },
      lips: { shape: pick(MODEL_OPTIONS.lips.shape), upper: pick(MODEL_OPTIONS.lips.upper), lower: pick(MODEL_OPTIONS.lips.lower) },
      nose: { shape: pick(MODEL_OPTIONS.nose.shape) },
      hair: { color: pick(MODEL_OPTIONS.hair.color), length: pick(MODEL_OPTIONS.hair.length), texture: pick(MODEL_OPTIONS.hair.texture), style: pick(MODEL_OPTIONS.hair.style) },
      skin: { tone: pick(MODEL_OPTIONS.skin.tone), texture: pick(MODEL_OPTIONS.skin.texture), features: pick(MODEL_OPTIONS.skin.features), sheen: pick(MODEL_OPTIONS.skin.sheen), details: pick(MODEL_OPTIONS.skin.details) },
      body: { type: pick(MODEL_OPTIONS.body.type), bust: pick(MODEL_OPTIONS.body.bust), waist: pick(MODEL_OPTIONS.body.waist), hips: pick(MODEL_OPTIONS.body.hips), glutes: pick(MODEL_OPTIONS.body.glutes), height: pick(MODEL_OPTIONS.body.height), limbs: pick(MODEL_OPTIONS.body.limbs), details: pick(MODEL_OPTIONS.body.details) },
      anatomical_fidelity: pick(ANATOMICAL_PRESETS.filter(p => p.id !== "custom")).value,
      signature: pick(SIGNATURE_PRESETS.filter(p => p.id !== "custom")).value,
    });
  }, []);

  const handleReset = useCallback(() => setModel(JSON.parse(JSON.stringify(DEFAULT_MODEL))), []);

  const handleGenerate = useCallback(() => {
    const outfit = OUTFIT_PRESETS.find(o => o.id === scene.outfitId);
    const env = ENV_PRESETS.find(e => e.id === scene.envId);
    const pose = POSE_PRESETS.find(p => p.id === scene.poseId);
    const light = LIGHTING_PRESETS.find(l => l.id === scene.lightId);
    const mood = MOOD_PRESETS.find(m => m.id === scene.moodId);
    const cam = CAMERA_PRESETS.find(c => c.id === scene.camId);

    const sceneData = {
      outfit: scene.outfitCustom || outfit?.value || "",
      environment: (env?.value || "") + (scene.envCustom ? `, ${scene.envCustom}` : ""),
      pose: pose?.value || "",
      lighting: light?.value || "",
      mood: mood?.value || "",
      camera: cam?.value || CAMERA_PRESETS[0].value,
      extra: scene.extra || "",
    };

    const json = buildJSON(model, sceneData);
    setJsonOutput(json);

    const entry = { date: new Date().toISOString(), model: model.name, caption: scene.caption, scene: scene };
    const newHist = [entry, ...history].slice(0, 50);
    setHistory(newHist);
    saveHistory(newHist);

    setTab("output");
  }, [model, scene, history]);

  const handleReloadScene = (s) => {
    setScene(s);
    setTab("scene");
  };

  const handleClearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const tabs = [
    { id: "model", label: "Modèle", icon: "👤" },
    { id: "scene", label: "Scène", icon: "🎬" },
    { id: "output", label: "Résultat", icon: "📋", badge: !!jsonOutput },
    { id: "history", label: "Historique", icon: "📜", badge: history.length > 0 },
  ];

  return (
    <div style={css.page}>
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${theme.bg}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border2}; border-radius: 4px; }
        ::selection { background: rgba(228,168,83,0.3); }
        input:focus, textarea:focus, select:focus { border-color: ${theme.accent} !important; }
        select option { background: ${theme.surface}; color: ${theme.text}; }
      `}
      </style>

      {/* En-tête */}
      <div style={{ borderBottom: `1px solid ${theme.border}`, padding: "14px 18px", background: theme.surface, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg, ${theme.accent}, #8b5e20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: theme.bg }}>N</div>
          <div>
            <h1 style={{ fontFamily: "'Outfit'", fontSize: 16, fontWeight: 800, color: theme.white, margin: 0, letterSpacing: "-0.03em" }}>
              NanaBanana Studio
            </h1>
            <p style={{ fontSize: 9, color: theme.text3, margin: 0, marginTop: 1, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Moteur de Prompts IA
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: theme.text3, fontFamily: "'DM Mono'" }}>v3.1</span>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: theme.success, boxShadow: `0 0 8px ${theme.success}` }} />
        </div>
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "model" && (
        <ModelEditor
          model={model} setModel={setModel}
          onSave={handleSaveProfile} profiles={profiles}
          onLoad={handleLoadProfile} onDelete={handleDeleteProfile}
          onRandomize={handleRandomize} onReset={handleReset}
        />
      )}
      {tab === "scene" && (
        <SceneBuilder scene={scene} setScene={setScene} model={model} onGenerate={handleGenerate} />
      )}
      {tab === "output" && (
        jsonOutput ? (
          <OutputView json={jsonOutput} caption={scene.caption} modelName={model.name}
            onBack={() => setTab("scene")} editableJson={editableJson} setEditableJson={setEditableJson} />
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: theme.text3 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🍌</div>
            <p style={{ fontFamily: "'Outfit'", fontSize: 14 }}>Configurez votre scène et générez votre premier JSON</p>
            <button onClick={() => setTab("scene")} style={{ ...css.btnGhost, marginTop: 14, borderColor: theme.accent, color: theme.accent }}>→ Aller à la scène</button>
          </div>
        )
      )}
      {tab === "history" && (
        <HistoryView history={history} onReload={handleReloadScene} onClear={handleClearHistory} />
      )}
    </div>
  );
}
