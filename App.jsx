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
    aiRequired: 'AI 생성 API 연결이 필요해요',
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
    aiRequired: 'Connect an AI generation API',
    styleNote: 'US YEARBOOK / 7:9'
  }
};

const progressLabels = {
  ko: ['얼굴 보존', '대머리 합성', '하이틴 증명사진'],
  en: ['Keep identity', 'Bald synthesis', 'Yearbook ID']
};

function HandwrittenLogo() {
  return (
    <div className="hand-logo-wrap" aria-label="대머리빔">
      <div className="hand-logo" aria-hidden="true">
        {'대머리빔'.split('').map((letter) => (
          <span key={letter}>{letter}</span>
        ))}
      </div>
      <svg className="hand-logo-doodle" viewBox="0 0 170 34" aria-hidden="true">
        <path d="M9 22 C39 35, 92 27, 160 24" />
        <path d="M126 5 L135 15 L148 7" />
      </svg>
    </div>
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
        const maxSide = 1280;
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
        resolve(canvas.toDataURL('image/jpeg', 0.9));
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
      prompt: buildBaldBeamPrompt(),
      negativePrompt:
        'cartoon, illustration, anime, yellow beam, head sticker, fake shine overlay, original hair, wig, hat, cap, extra person, text, watermark',
      size: AI_OUTPUT_SIZE,
      style: AI_STYLE_PRESET
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'AI generation failed');
  }

  if (!data.imageUrl && !data.imageDataUrl) {
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
      setNotice(error.message.includes('API') ? t.aiRequired : error.message);
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
    <div className="min-h-[100dvh] bg-[#f3efe7] text-white sm:flex sm:items-center sm:justify-center">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-beam-black px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+18px)] shadow-2xl sm:min-h-[820px] sm:rounded-[28px] sm:border-4 sm:border-beam-black">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_78%_16%,rgba(255,107,168,0.34),transparent_28%),radial-gradient(circle_at_20%_18%,rgba(98,242,200,0.22),transparent_26%)]" />

        <header className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <HandwrittenLogo />
            <p className="mt-3 max-w-[220px] text-sm font-bold leading-snug text-white/[0.72]">
              {t.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLang((value) => (value === 'ko' ? 'en' : 'ko'))}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg border-2 border-white bg-white px-3 text-sm font-black text-beam-black shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Globe2 size={17} strokeWidth={3} />
            {t.lang}
          </button>
        </header>

        <main className="relative z-10 mt-7 flex flex-1 flex-col">
          <section className="relative aspect-[7/9] w-full overflow-hidden rounded-lg border-4 border-white bg-zinc-950 shadow-beam">
            {currentImage ? (
              <>
                <img
                  src={currentImage}
                  alt="Bald Beam preview"
                  className={`h-full w-full object-cover transition duration-500 ${loading ? 'scale-105 opacity-50 grayscale' : ''}`}
                />
                <div className="absolute left-3 top-3 rounded-lg border-2 border-beam-black bg-white px-3 py-2 text-xs font-black text-beam-black shadow-crisp">
                  {result ? t.aiResult : t.original}
                </div>
                <div className="absolute bottom-3 right-3 rounded-lg border-2 border-beam-black bg-beam-yellow px-3 py-2 text-[10px] font-black text-beam-black shadow-crisp">
                  {t.styleNote}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-5 bg-[linear-gradient(135deg,#181818_0%,#101010_55%,#242018_100%)] px-8 text-center">
                <div className="grid h-24 w-24 place-items-center rounded-lg border-4 border-beam-yellow bg-beam-yellow text-beam-black shadow-crisp">
                  <Camera size={42} strokeWidth={3} />
                </div>
                <p className="text-balance text-lg font-black leading-snug text-beam-cream">
                  {t.empty}
                </p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/[0.42] px-7 text-center backdrop-blur-[2px]">
                <RefreshCw className="animate-spin text-beam-yellow" size={48} strokeWidth={3} />
                <p className="mt-4 text-xl font-black text-white">{t.processing}</p>
                <div className="mt-5 h-3 w-full overflow-hidden rounded-full border-2 border-white bg-black">
                  <div
                    className="h-full rounded-full bg-beam-yellow transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-sm font-black text-beam-yellow">
                  {progressLabels[lang][activeStep]}
                </p>
              </div>
            )}

            {notice && !loading && (
              <div className="absolute bottom-3 left-3 max-w-[62%] rounded-lg border-2 border-beam-black bg-beam-mint px-3 py-2 text-xs font-black text-beam-black shadow-crisp">
                {notice}
              </div>
            )}
          </section>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {progressLabels[lang].map((label, index) => (
              <div
                key={label}
                className={`rounded-lg border-2 px-2 py-2 text-center text-[11px] font-black leading-tight ${
                  progress > index * 34
                    ? 'border-beam-yellow bg-beam-yellow text-beam-black'
                    : 'border-white/20 bg-white/[0.07] text-white/[0.45]'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="mt-auto pt-5">
            {!image ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex h-[60px] w-full items-center justify-center gap-3 rounded-lg border-2 border-white bg-white text-lg font-black text-beam-black shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <Camera size={22} strokeWidth={3} />
                  {t.takePhoto}
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex h-14 min-h-[56px] w-full items-center justify-center gap-3 rounded-lg border-2 border-white bg-beam-pink text-base font-black text-white shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <ImagePlus size={21} strokeWidth={3} />
                  {t.uploadPhoto}
                </button>
              </div>
            ) : result ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={retry}
                  className="flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-white bg-zinc-900 text-base font-black text-white shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <RefreshCw size={19} strokeWidth={3} />
                  {t.retry}
                </button>
                <button
                  type="button"
                  onClick={downloadResult}
                  className="flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-white bg-white text-base font-black text-beam-black shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <Download size={19} strokeWidth={3} />
                  {t.download}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={applyBaldBeam}
                disabled={loading}
                className="beam-button flex h-16 w-full items-center justify-center gap-3 rounded-lg border-2 border-white bg-beam-yellow text-lg font-black text-beam-black shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-70"
              >
                <Zap size={22} fill="currentColor" strokeWidth={3} />
                {t.transform}
                <Sparkles size={20} strokeWidth={3} />
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
