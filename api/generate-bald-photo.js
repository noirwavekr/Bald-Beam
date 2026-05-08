const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_HF_MODEL = 'black-forest-labs/FLUX.1-Kontext-dev';
const DEFAULT_OUTPUT_SIZE = '1024x1316';
const HF_IMAGE_TO_IMAGE_BASE_URL = 'https://api-inference.huggingface.co/models';
const DEFAULT_PROMPT = [
  'Create a photorealistic AI-edited portrait from the uploaded person photo.',
  'Realistic completely bald head, preserve the person identity, apparent age, face shape, skin tone, expression, and camera angle.',
  'American teen-movie yearbook inspired ID portrait, blue mottled studio backdrop.',
  'Clean high-teen yearbook styling, collared shirt, school tie or varsity cardigan.',
  'Portrait crop for ID photo, vertical 7:9 ratio, centered face and shoulders, direct camera gaze, realistic studio lighting.',
  'No cartoon overlay, no illustrated beam, no fake sticker, no text, no watermark, no extra people, no hat, no wig, no visible hair.'
].join(' ');
const DEFAULT_NEGATIVE_PROMPT =
  'cartoon, illustration, anime, yellow beam, head sticker, fake shine overlay, original hair, wig, hat, cap, extra person, text, watermark';

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
  const value = String(dataUrl || '');
  return value.includes(',') ? value.split(',')[1] : value;
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
  const token = process.env.HF_TOKEN;
  const model = process.env.HF_IMAGE_MODEL || DEFAULT_HF_MODEL;
  const provider = process.env.HF_PROVIDER;

  if (!token) {
    console.error('Missing HF_TOKEN', {
      HF_IMAGE_MODEL: model
    });
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
  const logBase = {
    HF_IMAGE_MODEL: model,
    'response.status': hfResponse.status,
    'response.statusText': hfResponse.statusText,
    contentType,
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
    const model = process.env.HF_IMAGE_MODEL || DEFAULT_HF_MODEL;
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
