# 대머리빔 모바일 웹앱 프로토타입

React, Vite, Tailwind CSS, lucide-react 기반의 모바일 우선 프로토타입입니다.

## 실행

```bash
npm install
npm run dev
```

## 구현 내용

- 430px 이하 모바일 앱 화면에 맞춘 단일 화면 UX
- 카메라 촬영용 파일 입력과 갤러리 업로드 분리
- 한국어/영어 전환
- 손글씨 느낌의 한글 로고
- 실제 AI 생성 API로 원본 얼굴을 보존한 대머리 증명사진 생성 요청
- 미국 하이틴 졸업사진 느낌의 배경과 의상 프롬프트
- 7:9 세로 증명사진형 결과 화면과 저장 버튼

## 무료 티어 API 연결

프론트엔드는 `/api/generate-bald-photo`로 원본 이미지를 보내고, 서버 함수가 Hugging Face Inference Providers로 이미지 편집 요청을 보냅니다. 무료 계정은 월 무료 크레딧이 있어 프로토타입 테스트에 사용할 수 있습니다.

`.env.example`을 참고해서 아래 값을 설정하세요. 토큰은 브라우저에 넣지 말고 Vercel 환경변수나 로컬 `.env`에만 넣어야 합니다.

```bash
HF_TOKEN=hf_replace_with_your_token
HF_IMAGE_MODEL=black-forest-labs/FLUX.1-Kontext-dev
```

Hugging Face 모델이 결과를 잘 못 만들면 `HF_IMAGE_MODEL`을 다른 image-to-image/edit 모델로 바꿔 테스트할 수 있습니다.

커스텀 API를 쓰고 싶다면 기존처럼 다음 환경변수를 추가하면 됩니다.

```bash
BALD_BEAM_AI_ENDPOINT=https://your-image-edit-api.example.com/generate
BALD_BEAM_AI_TOKEN=replace-with-your-api-token
```

커스텀 API는 다음 형태 중 하나를 반환하면 됩니다.

```json
{ "imageUrl": "https://..." }
```

또는

```json
{ "imageDataUrl": "data:image/png;base64,..." }
```
