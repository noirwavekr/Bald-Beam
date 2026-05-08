import { useRef, useState } from 'react';
import {
  Camera,
  Download,
  Globe2,
  ImagePlus,
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react';

const AI_OUTPUT_SIZE = '1024x1316';
const AI_STYLE_PRESET = {
  scene: 'American teen-movie yearbook inspired ID portrait, blue mottled studio backdrop',
  wardrobe: 'clean high-teen yearbook styling, collared shirt, school tie or varsity cardigan',
  edit: 'realistic completely bald head, preserve the person identity, apparent age, face shape, skin tone, expression, and camera angle'
};

const translations = {
  ko: {
    subtitle: '셀카 한 장을 하이틴 대머리 증명사진으로',
    takePhoto: '사진 촬영',
    uploadPhoto: '갤러리 선택',
    transform: 'AI 대머리 증명사진 생성',
    processing: 'AI 증명사진 생성 중',
    complete: 'AI 대머리 합성 완료',
    download: '저장',
    retry: '다시',
    lang: 'EN',
    empty: '얼굴이 잘 보이는 사진을 넣어주세요',
    original: '원본',
    aiResult: 'AI 결과',
    failed: 'AI 생성에 실패했어요. 잠시 후 다시 시도해주세요.',
    styleNote: 'US YEARBOOK / 7:9'
  },
  en: {
    subtitle: 'Turn one selfie into a bald teen-style yearbook ID',
    takePhoto: 'Take Photo',
    uploadPhoto: 'Choose Photo',
    transform: 'Generate AI Bald ID',
    processing: 'Generating AI portrait',
    complete: 'AI bald portrait ready',
    download: 'Save',
    retry: 'Again',
    lang: '한글',
    empty: 'Add a clear face photo',
    original: 'Original',
    aiResult: 'AI Result',
    failed: 'AI generation failed. Please try again soon.',
    styleNote: 'US YEARBOOK / 7:9'
  }
};

const progressLabels = {
  ko: ['얼굴 보존', '대머리 합성', '하이틴 증명사진'],
  en: ['Keep identity', 'Bald synthesis', 'Yearbook ID']
};

function HandwrittenLogo() {
  return (
    <h1 className="bb-logo" aria-label="대머리빔">
      대머리빔
    </h1>
  );
}

function buildBaldBeamPrompt() {
  return [
    'Create a photorealistic AI-edited portrait from the uploaded person photo.',
    AI_STYLE_PRESET.edit,
    AI_STYLE_PRESET.scene,
    AI_STYLE_PRESET.wardrobe,
    'Portrait crop for ID photo, vertical 7:9 ratio, centered face and shoulders, direct camera gaze, realistic studio lighting.',
    'No cartoon overlay, no illustrated beam, no fake sticker, no text, no watermark, no extra people, no hat, no wig, no visible hair.'
  ].join(' ');
}

function resizeImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        resolve(null);
        return;
      }

      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  }).then((src) => {
    if (!src) {
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        const maxSide = 960;
        const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(src);
          return;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };

      img.onerror = () => resolve(src);
      img.src = src;
    });
  });
}

async function requestBaldPortrait(image) {
  const response = await fetch('/api/generate-bald-photo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image,
      imageData: image,
      prompt: buildBaldBeamPrompt(),
      negativePrompt:
        'cartoon, illustration, anime, yellow beam, head sticker, fake shine overlay, original hair, wig, hat, cap, extra person, text, watermark',
      size: AI_OUTPUT_SIZE,
      style: AI_STYLE_PRESET
    })
  });

  const responseText = await response.text();
  const data = responseText
    ? (() => {
        try {
          return JSON.parse(responseText);
        } catch (error) {
          console.error('Bald Beam API returned non-JSON response', {
            status: response.status,
            body: responseText
          });
          return {};
        }
      })()
    : {};

  if (!response.ok) {
    console.error('Bald Beam API failed', {
      status: response.status,
      body: responseText
    });
    throw new Error(data.error || 'AI generation failed');
  }

  if (!data.imageUrl && !data.imageDataUrl) {
    console.error('Bald Beam API returned no image', {
      status: response.status,
      body: responseText
    });
    throw new Error('AI response did not include an image');
  }

  return data.imageDataUrl || data.imageUrl;
}

export default function App() {
  const [lang, setLang] = useState('ko');
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState('');
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const t = translations[lang];
  const currentImage = result || image;

  const resetInput = (input) => {
    if (input.current) {
      input.current.value = '';
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    resizeImageFile(file).then((dataUrl) => {
      if (!dataUrl) {
        return;
      }

      setImage(dataUrl);
      setResult(null);
      setNotice('');
      setProgress(0);
    });
  };

  const applyBaldBeam = async () => {
    if (!image || loading) {
      return;
    }

    setLoading(true);
    setProgress(12);
    setNotice('');

    const interval = window.setInterval(() => {
      setProgress((value) => Math.min(value + 9, 92));
    }, 180);

    try {
      const processed = await requestBaldPortrait(image);
      setResult(processed);
      setProgress(100);
      setNotice(t.complete);
    } catch (error) {
      console.error('AI generation request failed', error);
      setNotice(t.failed);
      setProgress(0);
    } finally {
      window.clearInterval(interval);
      setLoading(false);
    }
  };

  const retry = () => {
    setImage(null);
    setResult(null);
    setNotice('');
    setProgress(0);
    resetInput(cameraInputRef);
    resetInput(galleryInputRef);
  };

  const downloadResult = () => {
    const output = result || image;

    if (!output) {
      return;
    }

    const link = document.createElement('a');
    link.href = output;
    link.download = 'bald-beam-result.png';
    link.click();
  };

  const activeStep = Math.min(Math.floor(progress / 34), 2);

  return (
    <div className="bb-page">
      <div className="bb-phone">
        <div className="bb-bg bb-bg-a" />
        <div className="bb-bg bb-bg-b" />

        <header className="bb-header">
          <div className="bb-title-block">
            <HandwrittenLogo />
            <p className="bb-subtitle">{t.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => setLang((value) => (value === 'ko' ? 'en' : 'ko'))}
            className="bb-lang"
          >
            <Globe2 size={17} strokeWidth={3} />
            {t.lang}
          </button>
        </header>

        <main className="bb-main">
          <section className="bb-preview">
            {currentImage ? (
              <>
                <img
                  src={currentImage}
                  alt="Bald Beam preview"
                  className={`bb-photo ${loading ? 'is-loading' : ''}`}
                />
                <div className="bb-badge bb-badge-top">
                  {result ? t.aiResult : t.original}
                </div>
                <div className="bb-badge bb-badge-style">
                  {t.styleNote}
                </div>
              </>
            ) : (
              <div className="bb-empty">
                <div className="bb-camera-mark">
                  <Camera size={30} strokeWidth={3} />
                </div>
                <p>{t.empty}</p>
              </div>
            )}

            {loading && (
              <div className="bb-loading">
                <RefreshCw className="animate-spin" size={34} strokeWidth={3} />
                <p>{t.processing}</p>
                <div className="bb-progress">
                  <div
                    className="bb-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span>
                  {progressLabels[lang][activeStep]}
                </span>
              </div>
            )}

            {notice && !loading && (
              <div className="bb-notice">
                {notice}
              </div>
            )}
          </section>

          <div className="bb-steps">
            {progressLabels[lang].map((label, index) => (
              <div
                key={label}
                className={`bb-step ${progress > index * 34 ? 'is-active' : ''}`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="bb-actions">
            {!image ? (
              <div className="bb-upload-actions">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="bb-button bb-button-white"
                >
                  <Camera size={18} strokeWidth={3} />
                  {t.takePhoto}
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="bb-button bb-button-sky"
                >
                  <ImagePlus size={18} strokeWidth={3} />
                  {t.uploadPhoto}
                </button>
              </div>
            ) : result ? (
              <div className="bb-upload-actions">
                <button
                  type="button"
                  onClick={retry}
                  className="bb-button bb-button-white"
                >
                  <RefreshCw size={17} strokeWidth={3} />
                  {t.retry}
                </button>
                <button
                  type="button"
                  onClick={downloadResult}
                  className="bb-button bb-button-leaf"
                >
                  <Download size={17} strokeWidth={3} />
                  {t.download}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={applyBaldBeam}
                disabled={loading}
                className="bb-button bb-button-primary beam-button"
              >
                <Zap size={19} fill="currentColor" strokeWidth={3} />
                {t.transform}
                <Sparkles size={18} strokeWidth={3} />
              </button>
            )}
          </div>
        </main>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleImageUpload}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
}
