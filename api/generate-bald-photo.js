const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_HF_MODEL = 'timbrooks/instruct-pix2pix';
const DEFAULT_OUTPUT_SIZE = '1024x1316';
const HF_MODEL_BASE_URL = 'https://api-inference.huggingface.co/models';
const DEFAULT_PROMPT =
  'Keep the person’s exact facial identity, facial features, expression, skin tone, pose, and lighting. Remove only the hair and create a natural smooth bald head. Do not change the face. Do not change the eyes, nose, lips, jaw, or expression. Keep realistic portrait photo quality. Convert to a clean 7:9 yearbook ID photo style.';
const DEFAULT_NEGATIVE_PROMPT =
  'changed face, different person, distorted face, extra eyes, deformed head, bad anatomy, cartoon, anime, low quality, blurry';
const TEXT_TO_IMAGE_MODELS = new Set([
  'stabilityai/stable-diffusion-2-1',
  'black-forest-labs/FLUX.1-Kontext-dev'
]);

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

function dataUrlToBinary(dataUrl) {
  const value = String(dataUrl || '');
  const base64 = value.includes(',') ? value.split(',')[1] : value;
  return Buffer.from(base64, 'base64');
}

function parseJsonText(text) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function resolveHuggingFaceModel() {
  const configuredModel = process.env.HF_IMAGE_MODEL;

  if (!configuredModel || TEXT_TO_IMAGE_MODELS.has(configuredModel)) {
    return DEFAULT_HF_MODEL;
  }

  return configuredModel;
}

async function callHuggingFace({ image, prompt, negativePrompt, signal }) {
  const token = process.env.HF_TOKEN;
  const model = resolveHuggingFaceModel();
  const provider = process.env.HF_PROVIDER;

  if (!token) {
    console.error('Missing HF_TOKEN', {
      HF_IMAGE_MODEL: model
    });
    return null;
  }

  const endpoint = `${HF_MODEL_BASE_URL}/${model}`;
  const imageBytes = dataUrlToBinary(image);
  const requestPayload = {
    inputs: imageBytes.toString('base64'),
    parameters: {
      prompt,
      negative_prompt: negativePrompt,
      guidance_scale: 7,
      num_inference_steps: 30
    },
    options: {
      wait_for_model: true
    }
  };
  const requestPayloadText = JSON.stringify(requestPayload);

  const hfResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(provider ? { 'X-HF-Inference-Provider': provider } : {})
    },
    body: requestPayloadText,
    signal
  });

  const contentType = hfResponse.headers.get('content-type') || '';
  const logBase = {
    selectedModel: model,
    HF_IMAGE_MODEL: model,
    requestPayloadSize: requestPayloadText.length,
    uploadedImageBytes: imageBytes.byteLength,
    responseStatus: hfResponse.status,
    responseStatusText: hfResponse.statusText,
    'response.status': hfResponse.status,
    'response.statusText': hfResponse.statusText,
    'response status': hfResponse.status,
    contentType,
    responseText: '',
    'response text': '',
    'response body text': ''
  };

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

  const responseText = await hfResponse.text();
  const data = parseJsonText(responseText);
  const imageUrl = findImageUrl(data);

  if (!hfResponse.ok || !imageUrl) {
    console.error('Hugging Face image generation failed', {
      ...logBase,
      provider,
      responseText: responseText.slice(0, 4000),
      'response text': responseText.slice(0, 4000),
      'response body text': responseText.slice(0, 4000)
    });
  }

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

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'POST only' });
    return;
  }

  const body = typeof request.body === 'string' ? parseJsonText(request.body) : request.body || {};
  const image = body.imageDataUrl || body.image || body.imageData;
  const prompt = body.prompt || DEFAULT_PROMPT;
  const negativePrompt = body.negativePrompt || DEFAULT_NEGATIVE_PROMPT;
  const size = body.size || DEFAULT_OUTPUT_SIZE;

  if (!image) {
    console.error('Bald Beam request missing required body fields', {
      hasImage: Boolean(image),
      bodyKeys: Object.keys(body)
    });
    response.status(400).json({ error: 'imageDataUrl is required' });
    return;
  }

  if (!process.env.HF_TOKEN) {
    const model = resolveHuggingFaceModel();
    console.error('Missing HF_TOKEN', {
      HF_IMAGE_MODEL: model
    });
    response.status(500).json({ error: 'Missing HF_TOKEN' });
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
      signal: controller.signal
    };
    const aiResult = await callHuggingFace(payload);

    if (!aiResult) {
      console.error('Bald Beam server is missing AI configuration', {
        hasHFToken: Boolean(process.env.HF_TOKEN),
        hasHFModel: Boolean(process.env.HF_IMAGE_MODEL)
      });
      response.status(501).json({
        error: 'Missing server-side HF_TOKEN.',
        prompt,
        size
      });
      return;
    }

    if (!aiResult.ok) {
      console.error('Bald Beam AI provider returned an error', {
        status: aiResult.status,
        payload: aiResult.payload
      });
      response.status(aiResult.status).json(aiResult.payload);
      return;
    }

    response.status(200).json(aiResult.payload);
  } catch (error) {
    console.error('Bald Beam API crashed', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    response.status(504).json({
      error: error.name === 'AbortError' ? 'AI generation timed out' : error.message
    });
  } finally {
    clearTimeout(timeout);
  }
}
