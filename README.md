# Hopae Tournament Platform

## 소개

**Hopae**는 e스포츠 및 토너먼트 대회 운영을 위한 웹 기반 관리 플랫폼입니다.  
React, TypeScript, Vite, TanStack Query, Zustand, Radix UI 등 최신 프론트엔드 기술을 활용하여  
대진표 생성, 경기 결과 입력, 참가자 관리 등 다양한 대회 운영 기능을 제공합니다.

---

## 주요 기능

- **대진표(Bracket) 생성 및 편집**: 싱글 엘리미네이션, FFA 등 다양한 토너먼트 방식 지원
- **경기 결과 입력 및 관리**: 세트별 결과, 스크린샷 업로드, 특이사항 기록
- **스테이지/라운드/매치 관리**: 스테이지별 그룹, 라운드, 매치 구조화
- **참가자(로스터) 관리**: 팀/개인 참가자 등록 및 정보 관리
- **심판/운영진 관리**: 심판 배정, 경기별 심판 정보 관리
- **실시간 데이터 패칭 및 캐싱**: TanStack Query 기반의 효율적 데이터 관리

---

## 폴더 구조

```
src/
  ├── api/           # API 서비스 및 데이터 모델 정의 (orval 기반 자동 생성)
  ├── assets/        # 정적 리소스
  ├── components/    # UI 컴포넌트 및 공통 컴포넌트
  │   ├── Bracket/   # 대진표 관련 컴포넌트
  │   ├── auth/      # 인증 관련 컴포넌트
  │   └── ui/        # 버튼, 다이얼로그 등 UI 요소
  ├── hooks/         # 커스텀 훅
  ├── layout/        # 레이아웃 컴포넌트
  ├── lib/           # axios 등 라이브러리 래퍼
  ├── pages/         # 주요 페이지(대시보드, 대진표, 결과 등)
  │   └── Bracket/   # 대진표 생성/편집/조회/결과 입력 페이지
  ├── providers/     # 테마, 쿼리 등 글로벌 프로바이더
  ├── queries/       # react-query 기반 API 쿼리 훅
  ├── stores/        # Zustand 기반 글로벌 상태 관리
  ├── utils/         # 유틸리티 함수
  ├── App.tsx        # 라우팅 및 앱 진입점
  ├── main.tsx       # React DOM 진입점
  └── index.css      # 글로벌 스타일
```

---

## 주요 기술 스택

- **React 19** + **TypeScript**
- **Vite**: 빠른 개발 환경 및 번들러
- **@tanstack/react-query**: 서버 상태 관리 및 데이터 패칭
- **Zustand**: 전역 상태 관리
- **Radix UI**: 접근성 높은 UI 컴포넌트
- **Tailwind CSS**: 유틸리티 기반 CSS
- **Lucide-react**: 아이콘
- **React Router**: 라우팅
- **Sonner**: 토스트 알림
- **Orval**: OpenAPI 기반 API 타입/서비스 자동 생성

---

## 주요 페이지 및 라우팅

- `/dashboard` : 대시보드
- `/bracket` : 대진표 관리(생성, 편집, 결과 입력 등)
- `/result` : 경기 결과 조회
- `/bracket/create` : 대진표 생성
- `/stage/:id/bracket/create` : 특정 스테이지의 대진표 생성
- `/stage/:stageId/bracket/:bracketId/edit` : 대진표 편집
- `/auth`, `/sign-in`, `/sign-up` : 인증/회원가입

---

## 개발 및 실행

### 설치

```bash
yarn install
```

### 개발 서버 실행

```bash
yarn dev
```

### 빌드

```bash
yarn build
```

### 린트

```bash
yarn lint
```

---

## API 및 데이터 모델

- `src/api/model/` : 각종 DTO, 응답 타입, 데이터 모델 정의
- `src/queries/` : react-query 기반 API 쿼리 훅 (ex. getBracket, patchMatchParticipantsBulk 등)
- **API 자동 생성**: orval을 사용하여 OpenAPI 스펙에서 타입과 서비스 코드를 자동 생성할 수 있습니다. (API 스펙 변경 시 orval로 쉽게 동기화)
  - 터미널에서 아래와 같이 실행하면 됩니다:
    ```bash
    orval
    ```
    - 참고: orval 설정 파일로 `orval.config.js`가 프로젝트에 포함되어 있습니다.

---

## 커스텀/확장 포인트

- **컴포넌트 재사용**: src/components/ui/ 내 공통 UI 컴포넌트 활용
- **상태 관리**: src/stores/ 내 zustand 스토어로 글로벌 상태 관리
- **API 확장**: src/api/ 및 src/queries/ 내 API 서비스/쿼리 추가

---

## 기타

- **환경설정**: Vite, ESLint, TypeScript, Tailwind 등 최신 프론트엔드 환경
- **테마/다크모드**: ThemeProvider로 손쉽게 테마 전환 가능

---

추가적인 사용법, 구조, 확장 방법이 필요하다면 언제든 문의해 주세요!
