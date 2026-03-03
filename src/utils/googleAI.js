// Wrapper pour l'API Google Gemini — génération d'images
// Supporte le multi-turn conversation pour la cohérence visuelle

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_ID = 'gemini-3-pro-image-preview';

export const validateApiKey = async (apiKey) => {
  try {
    const res = await fetch(
      `${API_BASE}?key=${encodeURIComponent(apiKey)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { valid: false, error: err.error?.message || `Erreur ${res.status}` };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Erreur reseau' };
  }
};

// conversationHistory: array of { role: 'user'|'model', parts: [...] }
// On envoie tout l'historique pour que Gemini maintienne la cohérence visuelle
// exactement comme dans le playground Google AI Studio (mode chat)
export const generateImage = async (apiKey, promptText, aspectRatio = '9:16', conversationHistory = []) => {
  // Build contents: historique + nouveau prompt
  const contents = [
    ...conversationHistory,
    { role: 'user', parts: [{ text: promptText }] },
  ];

  const body = {
    contents,
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    },
  };

  const res = await fetch(
    `${API_BASE}/${MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `Erreur ${res.status}`;

    if (res.status === 429) throw new Error('Quota depasse. Attendez quelques minutes.');
    if (res.status === 400 && msg.includes('safety')) throw new Error('Contenu filtre par les regles de securite.');
    if (res.status === 403) throw new Error('Cle API invalide ou acces refuse.');
    throw new Error(msg);
  }

  const data = await res.json();

  const candidates = data.candidates || [];
  if (candidates.length === 0) {
    throw new Error('Aucun resultat genere. Le contenu a peut-etre ete filtre.');
  }

  const parts = candidates[0]?.content?.parts || [];
  let imageBase64 = null;
  let mimeType = 'image/png';
  let textResponse = '';

  for (const part of parts) {
    if (part.inlineData) {
      imageBase64 = part.inlineData.data;
      mimeType = part.inlineData.mimeType || 'image/png';
    }
    if (part.text) {
      textResponse += part.text;
    }
  }

  if (!imageBase64) {
    throw new Error('Aucune image dans la reponse. ' + (textResponse || 'Essayez un prompt different.'));
  }

  // Retourne aussi les parts du modèle pour l'historique
  return {
    imageBase64,
    mimeType,
    textResponse,
    dataUrl: `data:${mimeType};base64,${imageBase64}`,
    // Pour reconstruire l'historique de conversation
    modelParts: [{ inlineData: { mimeType, data: imageBase64 } }],
  };
};
