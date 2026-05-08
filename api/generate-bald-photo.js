const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_HF_MODEL = 'black-forest-labs/FLUX.1-Kontext-dev';
const HF_IMAGE_TO_IMAGE_BASE_URL = 'https://api-inference.huggingface.co/models';

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

function dataUrlToBase64(dataUrl) {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}

function parseTargetSize(size) {
  const [width, height] = String(size || '1024x1316')
    .split('x')
    .map((value) => Number.parseInt(value, 10));

  return {
    width: Number.isFinite(width) ? width : 1024,
    height: Number.isFinite(height) ? height : 1316
  };
}

async function callHuggingFace({ image, prompt, negativePrompt, size, signal }) {
  const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
  const model = process.env.HF_IMAGE_MODEL || DEFAULT_HF_MODEL;
  const provider = process.env.HF_PROVIDER;

  if (!token) {
    return null;
  }

  const targetSize = parseTargetSize(size);
  const endpoint = `${HF_IMAGE_TO_IMAGE_BASE_URL}/${model}`;

  const hfResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(provider ? { 'X-HF-Inference-Provider': provider } : {})
    },
    body: JSON.stringify({
      inputs: dataUrlToBase64(image),
      parameters: {
        prompt,
        negative_prompt: negativePrompt,
        guidance_scale: 7,
        num_inference_steps: 28,
        target_size: targetSize
      },
      options: {
        wait_for_model: true
      }
    }),
    signal
  });

  const contentType = hfResponse.headers.get('content-type') || '';

  if (contentType.startsWith('image/')) {
    const mimeType = contentType.split(';')[0];
    const arrayBuffer = await hfResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      ok: hfResponse.ok,
      status: hfResponse.status,
      payload: {
        imageDataUrl: `data:${mimeType};base64,${base64}`,
        provider: 'huggingface',
        model
      }
    };
  }

  const data = await hfResponse.json().catch(() => ({}));
  const imageUrl = findImageUrl(data);

  return {
    ok: hfResponse.ok && Boolean(imageUrl),
    status: hfResponse.ok ? 502 : hfResponse.status,
    payload: imageUrl
      ? { imageUrl, provider: 'huggingface', model }
      : {
          error:
            data.error ||
            data.message ||
            'Hugging Face did not return an image. Try another HF_IMAGE_MODEL.'
        }
  };
}

async function callCustomEndpoint({ image, prompt, negativePrompt, size, style, signal }) {
  const endpoint = process.env.BALD_BEAM_AI_ENDPOINT;
  const token = process.env.BALD_BEAM_AI_TOKEN;

  if (!endpoint) {
    return null;
  }

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
    signal
  });

  const contentType = aiResponse.headers.get('content-type') || '';

  if (contentType.startsWith('image/')) {
    const mimeType = contentType.split(';')[0];
    const arrayBuffer = await aiResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      ok: aiResponse.ok,
      status: aiResponse.status,
      payload: {
        imageDataUrl: `data:${mimeType};base64,${base64}`,
        provider: 'custom'
      }
    };
  }

  const data = await aiResponse.json().catch(() => ({}));
  const imageUrl = findImageUrl(data);

  return {
    ok: aiResponse.ok && Boolean(imageUrl),
    status: aiResponse.ok ? 502 : aiResponse.status,
    payload: imageUrl
      ? { imageUrl, provider: 'custom' }
      : { error: data.error || data.message || 'AI provider did not return an image' }
  };
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const payload = {
      image,
      prompt,
      negativePrompt,
      size,
      style,
      signal: controller.signal
    };
    const aiResult = (await callCustomEndpoint(payload)) || (await callHuggingFace(payload));

    if (!aiResult) {
      response.status(501).json({
        error: 'Missing server-side HF_TOKEN.',
        prompt,
        size,
        style
      });
      return;
    }

    if (!aiResult.ok) {
      response.status(aiResult.status).json(aiResult.payload);
      return;
    }

    response.status(200).json(aiResult.payload);
  } catch (error) {
    response.status(504).json({
      error: error.name === 'AbortError' ? 'AI generation timed out' : error.message
    });
  } finally {
    clearTimeout(timeout);
  }
}
