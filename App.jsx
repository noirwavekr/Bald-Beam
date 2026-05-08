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

const translations = {
  ko: {
    subtitle: '셀카 한 장이면 미래의 두상이 반짝',
    takePhoto: '사진 촬영',
    uploadPhoto: '갤러리 선택',
    transform: '대머리빔 발사',
    processing: '반짝 두상 생성 중',
    scan: '두상 스캔',
    shine: '광택 보정',
    finish: '빔 충전 완료',
    complete: '대머리빔 완료',
    download: '저장',
    retry: '다시',
    lang: 'EN',
    empty: '얼굴이 잘 보이는 사진을 넣어주세요'
  },
  en: {
    subtitle: 'One selfie, one shiny future',
    takePhoto: 'Take Photo',
    uploadPhoto: 'Choose Photo',
    transform: 'Shoot Bald Beam',
    processing: 'Making it shiny',
    scan: 'Head scan',
    shine: 'Shine polish',
    finish: 'Beam charged',
    complete: 'Bald Beam complete',
    download: 'Save',
    retry: 'Again',
    lang: '한글',
    empty: 'Add a clear face photo'
  }
};

const progressLabels = {
  ko: ['두상 스캔', '광택 보정', '빔 충전 완료'],
  en: ['Head scan', 'Shine polish', 'Beam charged']
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

function buildDemoResult(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const maxSide = 1400;
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

      const glow = ctx.createLinearGradient(0, 0, width, height);
      glow.addColorStop(0, 'rgba(255, 228, 94, 0.05)');
      glow.addColorStop(0.45, 'rgba(255, 228, 94, 0.24)');
      glow.addColorStop(1, 'rgba(98, 242, 200, 0.08)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#ffe45e';
      ctx.beginPath();
      ctx.ellipse(width * 0.5, height * 0.24, width * 0.25, height * 0.12, -0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#fff8df';
      ctx.lineWidth = Math.max(4, width * 0.012);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(width * 0.43, height * 0.18);
      ctx.quadraticCurveTo(width * 0.53, height * 0.11, width * 0.62, height * 0.18);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#ffe45e';
      ctx.lineWidth = Math.max(2, width * 0.004);
      for (let i = -2; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(width * (0.16 + i * 0.13), 0);
        ctx.lineTo(width * (0.45 + i * 0.13), height);
        ctx.stroke();
      }
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => resolve(src);
    img.src = src;
  });
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

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      setImage(reader.result);
      setResult(null);
      setNotice('');
      setProgress(0);
    };
    reader.readAsDataURL(file);
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

    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    const processed = await buildDemoResult(image);
    window.clearInterval(interval);
    setResult(processed);
    setProgress(100);
    setLoading(false);
    setNotice(t.complete);
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
          <section className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border-4 border-white bg-zinc-950 shadow-beam">
            {currentImage ? (
              <>
                <img
                  src={currentImage}
                  alt="Bald Beam preview"
                  className={`h-full w-full object-cover transition duration-500 ${loading ? 'scale-105 opacity-50 grayscale' : ''}`}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,228,94,0.18)_44%,transparent_64%)]" />
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
              <div className="absolute left-3 top-3 rounded-lg border-2 border-beam-black bg-beam-mint px-3 py-2 text-xs font-black text-beam-black shadow-crisp">
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
