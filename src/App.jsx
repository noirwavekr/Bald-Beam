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
    <div className="hand-logo-wrap" aria-label="대머리빔">
      <div className="hand-logo" aria-hidden="true">
        <span>대머리빔</span>
      </div>
      <svg className="hand-logo-doodle" viewBox="0 0 170 34" aria-hidden="true">
        <path d="M9 20 C43 31, 96 27, 161 18" />
        <path d="M134 10 C141 2, 153 4, 158 13 C149 17, 140 17, 134 10" />
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
    <div className="min-h-[100dvh] bg-[#f6efd9] text-beam-ink sm:flex sm:items-center sm:justify-center">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-beam-paper px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-[calc(env(safe-area-inset-top)+12px)] shadow-2xl sm:min-h-[760px] sm:rounded-[28px] sm:border-[3px] sm:border-beam-ink">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_82%_18%,rgba(255,182,163,0.42),transparent_28%),radial-gradient(circle_at_16%_4%,rgba(155,220,248,0.55),transparent_28%),linear-gradient(180deg,#e4f7c8_0%,#fffdf2_84%)]" />
        <div className="pointer-events-none absolute -left-14 top-28 h-28 w-28 rounded-full bg-beam-meadow/55" />
        <div className="pointer-events-none absolute -right-14 bottom-28 h-32 w-32 rounded-full bg-beam-sky/30" />

        <header className="relative z-10 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <HandwrittenLogo />
            <p className="mt-1 max-w-[230px] text-[12px] font-black leading-snug text-beam-ink/65">
              {t.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLang((value) => (value === 'ko' ? 'en' : 'ko'))}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border-2 border-beam-ink bg-white px-3 text-sm font-black text-beam-ink shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Globe2 size={17} strokeWidth={3} />
            {t.lang}
          </button>
        </header>

        <main className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col">
          <section className="relative mx-auto aspect-[7/9] h-[min(46dvh,390px)] min-h-[292px] max-h-[390px] w-auto max-w-full overflow-hidden rounded-lg border-[3px] border-beam-ink bg-beam-cream shadow-beam">
            {currentImage ? (
              <>
                <img
                  src={currentImage}
                  alt="Bald Beam preview"
                  className={`h-full w-full object-cover transition duration-500 ${loading ? 'scale-105 opacity-50 grayscale' : ''}`}
                />
                <div className="absolute left-2 top-2 rounded-md border-2 border-beam-ink bg-white px-2.5 py-1.5 text-[11px] font-black text-beam-ink shadow-crisp">
                  {result ? t.aiResult : t.original}
                </div>
                <div className="absolute bottom-2 right-2 rounded-md border-2 border-beam-ink bg-beam-butter px-2.5 py-1.5 text-[9px] font-black text-beam-ink shadow-crisp">
                  {t.styleNote}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#dff5c6_0%,#fff8dc_50%,#d7f0ff_100%)] px-7 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-lg border-[3px] border-beam-ink bg-beam-butter text-beam-ink shadow-crisp">
                  <Camera size={30} strokeWidth={3} />
                </div>
                <p className="text-balance text-sm font-black leading-snug text-beam-ink">
                  {t.empty}
                </p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-beam-cream/[0.78] px-7 text-center backdrop-blur-[3px]">
                <RefreshCw className="animate-spin text-beam-leaf" size={38} strokeWidth={3} />
                <p className="mt-3 text-base font-black text-beam-ink">{t.processing}</p>
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full border-2 border-beam-ink bg-white">
                  <div
                    className="h-full rounded-full bg-beam-leaf transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-black text-beam-ink">
                  {progressLabels[lang][activeStep]}
                </p>
              </div>
            )}

            {notice && !loading && (
              <div className="absolute bottom-2 left-2 max-w-[62%] rounded-md border-2 border-beam-ink bg-beam-mint px-2.5 py-1.5 text-[11px] font-black leading-snug text-beam-ink shadow-crisp">
                {notice}
              </div>
            )}
          </section>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {progressLabels[lang].map((label, index) => (
              <div
                key={label}
                className={`rounded-md border-2 px-1.5 py-1.5 text-center text-[10px] font-black leading-tight ${
                  progress > index * 34
                    ? 'border-beam-ink bg-beam-meadow text-beam-ink shadow-soft'
                    : 'border-beam-ink/25 bg-white/70 text-beam-ink/45'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="mt-auto pt-3">
            {!image ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-beam-ink bg-white text-sm font-black text-beam-ink shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <Camera size={18} strokeWidth={3} />
                  {t.takePhoto}
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-beam-ink bg-beam-sky text-sm font-black text-beam-ink shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <ImagePlus size={18} strokeWidth={3} />
                  {t.uploadPhoto}
                </button>
              </div>
            ) : result ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={retry}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-beam-ink bg-white text-sm font-black text-beam-ink shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <RefreshCw size={17} strokeWidth={3} />
                  {t.retry}
                </button>
                <button
                  type="button"
                  onClick={downloadResult}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-beam-ink bg-beam-leaf text-sm font-black text-beam-ink shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none"
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
                className="beam-button flex h-[54px] w-full items-center justify-center gap-2 rounded-lg border-2 border-beam-ink bg-beam-butter text-base font-black text-beam-ink shadow-crisp transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-70"
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
