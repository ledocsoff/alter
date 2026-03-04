// ============================================
// CONSTANTES MÉTIER — ControlNet & Negative Prompt
// Pour workflow ComfyUI (DWPose + ZoeDepth)
// ============================================

// Negative prompt OFM — injecté automatiquement, jamais visible dans l'UI
export const NEGATIVE_PROMPT_OFM = {
    forbidden_elements: [
        "anatomy normalization",
        "body proportion averaging",
        "smaller bust than reference",
        "reduced chest volume",
        "flattened or compressed breasts",
        "tightened or artificially supported breasts",
        "slimmed torso",
        "aesthetic proportion correction",
        "beauty standard enforcement",
        "dataset-average female anatomy",
        "camera angles that reduce volume",
        "wide-angle distortion not in reference",
        "lens compression not in reference",
        "cropping that removes volume",
        "depth flattening",
        "beautification filters",
        "skin smoothing",
        "plastic skin",
        "airbrushed texture",
        "stylized realism",
        "editorial fashion proportions",
        "dry skin",
        "standing pose",
    ],
};

// ============================================
// PRESETS CONTROLNET
// Chaque preset = un ensemble de constraints pour DWPose + ZoeDepth
// ============================================

export const CONTROLNET_PRESETS = [
    {
        id: 'selfie_high_angle',
        labelFR: 'Selfie Plongeant',
        icon: '🤳',
        pose_control: {
            constraints: [
                "One arm extended upward holding phone",
                "Head tilted slightly up toward camera",
                "Shoulders visible, slight lean forward",
                "Torso angled 10-15° from vertical",
                "Chin subtly lifted, neck elongated",
            ],
            recommended_weight: 1.0,
        },
        depth_control: {
            constraints: [
                "Camera-to-face distance: 40-60cm (arm's length)",
                "Strong depth gradient: face closest, torso receding",
                "Background at 2-4m depth minimum",
                "Slight perspective foreshortening on extended arm",
            ],
            recommended_weight: 0.8,
        },
        camera_defaults: {
            perspective: "High angle, 15-30° downward tilt",
            shot_type: "Close-up to medium shot",
            focal_length: "24-28mm equivalent (phone wide lens)",
            depth_of_field: "Shallow, bokeh on background",
        },
    },
    {
        id: 'standing_front',
        labelFR: 'Debout Face',
        icon: '🧍‍♀️',
        pose_control: {
            constraints: [
                "Standing upright, weight on one leg",
                "Hips slightly shifted to one side (contrapposto)",
                "Arms relaxed, one hand on hip optional",
                "Shoulders level or slight asymmetry",
                "Full body visible head to feet",
            ],
            recommended_weight: 1.0,
        },
        depth_control: {
            constraints: [
                "Camera-to-subject: 2-3m",
                "Uniform depth across body plane",
                "Background at 4-8m depth",
                "Floor plane visible, establishing ground contact",
            ],
            recommended_weight: 0.8,
        },
        camera_defaults: {
            perspective: "Eye level, frontal",
            shot_type: "Full body",
            focal_length: "50-85mm portrait lens",
            depth_of_field: "Medium, subject sharp, background soft",
        },
    },
    {
        id: 'sitting_bed',
        labelFR: 'Assise sur le Lit',
        icon: '🛏️',
        pose_control: {
            constraints: [
                "Seated on soft surface, slight sink into mattress",
                "Legs crossed or tucked to one side",
                "Torso upright or slight forward lean",
                "Hands resting on knee/bed or adjusting hair",
                "Natural spine curvature visible",
            ],
            recommended_weight: 1.0,
        },
        depth_control: {
            constraints: [
                "Camera-to-subject: 1-2m",
                "Bed surface creates horizontal depth plane",
                "Pillows/headboard in background at 0.5-1m behind subject",
                "Depth compression on seated lower body",
            ],
            recommended_weight: 0.8,
        },
        camera_defaults: {
            perspective: "Slightly above eye level, 5-10° down",
            shot_type: "Medium shot, waist up or three-quarter",
            focal_length: "35-50mm",
            depth_of_field: "Shallow, focus on face and upper body",
        },
    },
    {
        id: 'laying_stomach',
        labelFR: 'Allongée sur le Ventre',
        icon: '😴',
        pose_control: {
            constraints: [
                "Lying prone on flat surface",
                "Upper body propped on elbows or forearms",
                "Chin resting on hands or arms extended",
                "Legs bent at knees, feet possibly raised",
                "Spine in natural arch, chest lifted",
            ],
            recommended_weight: 1.0,
        },
        depth_control: {
            constraints: [
                "Camera at subject level or slightly above",
                "Very compressed depth: entire body on same plane",
                "Face closest to camera, feet furthest",
                "Surface texture visible (bed/floor) at 0m depth",
            ],
            recommended_weight: 0.85,
        },
        camera_defaults: {
            perspective: "Low angle, near floor/bed level",
            shot_type: "Three-quarter body",
            focal_length: "35-50mm",
            depth_of_field: "Shallow, face sharp, legs soft",
        },
    },
    {
        id: 'mirror_selfie',
        labelFR: 'Selfie Miroir',
        icon: '🪞',
        pose_control: {
            constraints: [
                "Phone held at chest or face level",
                "Body facing mirror at 0-30° angle",
                "One arm extended holding phone, other arm natural",
                "Full body or three-quarter visible in mirror reflection",
                "Slight hip pop for dynamic pose",
            ],
            recommended_weight: 1.0,
        },
        depth_control: {
            constraints: [
                "Double depth: real body + mirror reflection",
                "Phone-to-mirror: 0.5-1.5m",
                "Reflected depth doubled (appears 1-3m in mirror)",
                "Mirror frame as depth boundary element",
            ],
            recommended_weight: 0.75,
        },
        camera_defaults: {
            perspective: "Frontal via mirror, phone as POV",
            shot_type: "Full body in mirror",
            focal_length: "24-28mm phone lens",
            depth_of_field: "Medium, both body and reflection sharp",
        },
    },
    {
        id: 'over_shoulder',
        labelFR: 'Regard par-dessus l\'Épaule',
        icon: '👀',
        pose_control: {
            constraints: [
                "Body facing away from camera, 130-170°",
                "Head turned over shoulder toward camera",
                "Back and shoulder blades visible",
                "One hip shifted for S-curve silhouette",
                "Neck rotation showing jawline profile",
            ],
            recommended_weight: 1.0,
        },
        depth_control: {
            constraints: [
                "Camera-to-subject: 1.5-2.5m",
                "Back plane closest, face slightly further",
                "Depth variation across turned torso",
                "Background at 3-6m",
            ],
            recommended_weight: 0.8,
        },
        camera_defaults: {
            perspective: "Slightly below eye level",
            shot_type: "Medium shot, waist up from behind",
            focal_length: "50-85mm",
            depth_of_field: "Shallow, focus on face over shoulder",
        },
    },
    {
        id: 'squatting',
        labelFR: 'Accroupie',
        icon: '⬇️',
        pose_control: {
            constraints: [
                "Deep squat or crouching position",
                "Knees bent, thighs parallel to ground or lower",
                "Arms resting on knees or between legs",
                "Weight balanced on balls of feet",
                "Torso upright, chest forward",
            ],
            recommended_weight: 1.0,
        },
        depth_control: {
            constraints: [
                "Camera at squat level or slightly above",
                "Compact body depth: knees-to-back ~40cm",
                "Ground plane immediately visible",
                "Background at 2-5m",
            ],
            recommended_weight: 0.8,
        },
        camera_defaults: {
            perspective: "Eye level with squatting subject",
            shot_type: "Full body, low angle",
            focal_length: "35-50mm",
            depth_of_field: "Medium depth of field",
        },
    },
    {
        id: 'leaning_wall',
        labelFR: 'Adossée au Mur',
        icon: '🧱',
        pose_control: {
            constraints: [
                "Back or shoulder pressed against vertical surface",
                "One leg bent, foot flat on wall",
                "Arms crossed or one hand in hair",
                "Head tilted slightly, relaxed posture",
                "Hip pushed forward creating body angle",
            ],
            recommended_weight: 1.0,
        },
        depth_control: {
            constraints: [
                "Wall surface at 0m depth (contact point)",
                "Subject body 0-20cm from wall",
                "Camera-to-subject: 1.5-3m",
                "Flat background (wall) eliminates depth ambiguity",
            ],
            recommended_weight: 0.7,
        },
        camera_defaults: {
            perspective: "Eye level, frontal or slight three-quarter",
            shot_type: "Full body or three-quarter",
            focal_length: "50mm",
            depth_of_field: "Shallow, subject sharp against wall",
        },
    },
];

// Default ControlNet config for fallback
export const DEFAULT_CONTROLNET = {
    pose_control: {
        model_type: "DWPose",
        purpose: "Exact skeletal and pose lock",
        constraints: [],
        recommended_weight: 1.0,
    },
    depth_control: {
        model_type: "ZoeDepth",
        purpose: "Depth, volume, and camera-to-body spatial lock",
        constraints: [],
        recommended_weight: 0.8,
    },
};
