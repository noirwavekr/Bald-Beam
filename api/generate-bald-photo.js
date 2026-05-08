const DEFAULT_TIMEOUT_MS = 120000;

function findImageUrl(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return (
    data.imageDataUrl ||
    data.imageUrl ||
    data.image ||
    data.url ||
    data.output?.[0] ||
    data.images?.[0]?.url ||
    data.data?.[0]?.url ||
    null
  );
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'POST only' });
    return;
  }

  const { image, prompt, negativePrompt, size, style } = request.body || {};

  if (!image || !prompt) {
    response.status(400).json({ error: 'Image and prompt are required' });
    return;
  }

  const endpoint = process.env.BALD_BEAM_AI_ENDPOINT;
  const token = process.env.BALD_BEAM_AI_TOKEN;

  if (!endpoint) {
    response.status(501).json({
      error: 'AI generation API is not configured',
      prompt,
      size,
      style
    });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        image,
        prompt,
        negativePrompt,
        size,
        style
      }),
      signal: controller.signal
    });

    const contentType = aiResponse.headers.get('content-type') || '';

    if (contentType.startsWith('image/')) {
      const mimeType = contentType.split(';')[0];
      const arrayBuffer = await aiResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      response.status(200).json({
        imageDataUrl: `data:${mimeType};base64,${base64}`
      });
      return;
    }

    const data = await aiResponse.json().catch(() => ({}));
    const imageUrl = findImageUrl(data);

    if (!aiResponse.ok || !imageUrl) {
      response.status(aiResponse.ok ? 502 : aiResponse.status).json({
        error: data.error || data.message || 'AI provider did not return an image'
      });
      return;
    }

    response.status(200).json({ imageUrl });
  } catch (error) {
    response.status(504).json({
      error: error.name === 'AbortError' ? 'AI generation timed out' : error.message
    });
  } finally {
    clearTimeout(timeout);
  }
}
