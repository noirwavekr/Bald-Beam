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

## AI 생성 API 연결

프론트엔드는 `/api/generate-bald-photo`로 원본 이미지를 보내고, 이 서버 함수가 실제 이미지 생성 API에 요청합니다.

`.env.example`을 참고해서 아래 값을 설정하세요.

```bash
BALD_BEAM_AI_ENDPOINT=https://your-image-edit-api.example.com/generate
BALD_BEAM_AI_TOKEN=replace-with-your-api-token
```

연결할 API는 다음 형태 중 하나를 반환하면 됩니다.

```json
{ "imageUrl": "https://..." }
```

또는

```json
{ "imageDataUrl": "data:image/png;base64,..." }
```
