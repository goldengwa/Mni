
# MyNameis – GitHub 배포 세트

## 포함 파일
- `index.html` – 앱 본체 (슬러그 게시·조회, 계정 저장/불러오기, 로딩 오버레이)
- `assets/app.css` – 스타일
- `assets/app.js` – 모든 로직
- `404.html` – GitHub Pages에서 `/@slug` → `?s=slug` 리다이렉트
- `supabase.sql` – Supabase 테이블 + RLS 정책
- `.nojekyll` – GH Pages 파이프라인 단순화

## GitHub Pages
1. 이 폴더를 레포 루트에 푸시
2. Settings ▸ Pages ▸ Source: `main` / root
3. 페이지 열기: `https://계정.github.io/레포/`  
   - 예쁜 경로: `https://계정.github.io/레포/@slug` (404.html이 `?s=slug`로 넘겨줌)

## Render(Static Site)
- Build Command: (비움)
- Publish Directory: `/`
- Redirects/Rewrites (순서대로)
  1) Rewrite: `/assets/*` → `/assets/:splat`
  2) Rewrite: `/*` → `/index.html`

## Supabase
- SQL Editor에서 `supabase.sql` 실행
- `index.html` 상단의 `window.__SUPABASE_URL__`, `window.__SUPABASE_ANON_KEY__` 교체
- (선택) Auth → URL Configuration → Redirect URLs에 배포 URL 추가

## 사용
- 패널에서 편집 → 저장
- "공개 슬러그" 입력 → **슬러그 게시** → `https://도메인/@슬러그`로 공유
