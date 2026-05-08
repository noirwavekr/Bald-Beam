import { InferenceClient } from '@huggingface/inference';

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_HF_MODEL = 'black-forest-labs/FLUX.2-dev';
const DEFAULT_OUTPUT_SIZE = '1024x1316';
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

function bufferToBlob(buffer, type = 'image/jpeg') {
  return new Blob([buffer], { type });
}

async function blobToDataUrl(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = blob.type || 'image/png';
  return `data:${mimeType};base64,${base64}`;
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
  const provider = process.env.HF_PROVIDER || 'fal-ai';

  if (!token) {
    console.error('Missing HF_TOKEN', {
      HF_IMAGE_MODEL: model
    });
    return null;
  }

  const imageBytes = dataUrlToBinary(image);
  const requestPayload = {
    inputs: '<jpeg bytes>',
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
  const logBase = {
    selectedModel: model,
    HF_IMAGE_MODEL: model,
    provider,
    requestPayloadSize: requestPayloadText.length,
    uploadedImageBytes: imageBytes.byteLength,
    responseStatus: '',
    responseStatusText: '',
    'response.status': '',
    'response.statusText': '',
    'response status': '',
    responseText: '',
    'response text': '',
    'response body text': ''
  };

  try {
    const client = new InferenceClient(token);
    const output = await client.imageToImage(
      {
        model,
        provider,
        inputs: bufferToBlob(imageBytes),
        parameters: {
          prompt,
          negative_prompt: negativePrompt,
          guidance_scale: 7,
          num_inference_steps: 30,
          target_size: {
            width: 1024,
            height: 1316
          }
        }
      },
      { signal }
    );

    return {
      ok: true,
      status: 200,
      payload: {
        imageDataUrl: await blobToDataUrl(output),
        provider: 'huggingface',
        model
      }
    };
  } catch (error) {
    const status = error.status || error.response?.status || '';
    const statusText = error.statusText || error.response?.statusText || '';
    const responseText =
      error.responseBody ||
      error.response?.body ||
      error.message ||
      String(error);
    console.error('Hugging Face image generation failed', {
      ...logBase,
      responseStatus: status,
      responseStatusText: statusText,
      'response.status': status,
      'response.statusText': statusText,
      'response status': status,
      responseText: String(responseText).slice(0, 4000),
      'response text': String(responseText).slice(0, 4000),
      'response body text': String(responseText).slice(0, 4000)
    });

    return {
      ok: false,
      status: status || 502,
      payload: {
        error: 'Hugging Face image-to-image request failed.',
        provider: 'huggingface',
        model
      }
    };
  }
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
      response.status(200).json({
        imageDataUrl: image,
        provider: 'demo-fallback',
        model: aiResult.payload?.model || resolveHuggingFaceModel(),
        demo: true
      });
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
