export const MODEL_OPTIONS = {
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

export const DEFAULT_MODEL = {
  name: "Jessi", age: "22",
  ethnicity: "Latina, delicate and defined features",
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
