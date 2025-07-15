# Competition Context 구현 가이드

## 개요
Competition Context는 Play ID Dashboard 애플리케이션 전체에서 대회(competition) 정보를 중앙에서 관리하기 위한 React Context입니다. 이전에 각 페이지에서 개별적으로 대회 정보를 불러오던 방식을 개선하여, 전역 상태 관리를 통해 일관성 있고 효율적인 데이터 관리를 구현합니다.

## 구조

### Context Interface
```typescript
interface CompetitionContextType {
  competitions: Competition[];           // 모든 대회 목록
  selectedCompetition: Competition | null; // 현재 선택된 대회
  changeCompetition: (competition: Competition) => void; // 대회 변경 함수
}
```

## 구현 세부사항

### 1. Competition Context Provider (`/src/contexts/CompetitionContext.tsx`)
- **자동 초기화**: 대회 목록을 불러온 후 첫 번째 대회를 자동으로 선택
- **에러 처리**: API 호출 실패 시 토스트 메시지로 사용자에게 알림
- **상태 관리**: React hooks를 사용하여 선택된 대회 상태 관리

### 2. MainLayout 통합 (`/src/layout/MainLayout.tsx`)
- CompetitionProvider를 최상위 레이아웃에 배치
- 모든 하위 라우트에서 Competition Context 접근 가능

### 3. 페이지별 리팩토링

#### Bracket 페이지 (`/src/pages/Bracket/index.tsx`)
변경 사항:
- `getCompetitionsMy()` 직접 호출 제거
- `useSelectedCompetitionStore` zustand store 제거
- `useCompetition()` hook을 통해 context 데이터 사용
- 첫 번째 대회 자동 선택 로직 제거 (Context에서 처리)

#### Result 페이지 (`/src/pages/Result/index.tsx`)
변경 사항:
- `getCompetitionsMy()` 직접 호출 제거
- `useCompetition()` hook을 통해 context 데이터 사용
- 에러 처리 로직 제거 (Context에서 중앙 처리)
- 대회 관련 breadcrumb 업데이트

## 사용 방법

### Context 사용하기
```typescript
import { useCompetition } from '@/contexts/CompetitionContext';

const MyComponent = () => {
  const { competitions, selectedCompetition, changeCompetition } = useCompetition();
  
  // 대회 목록 표시
  competitions.map(comp => <div key={comp.id}>{comp.title}</div>);
  
  // 현재 선택된 대회 정보 사용
  console.log(selectedCompetition?.title);
  
  // 대회 변경
  changeCompetition(competitions[1]);
};
```

### 주의사항
- `useCompetition` hook은 반드시 `CompetitionProvider` 내부에서만 사용 가능
- Provider 외부에서 사용 시 에러 발생

## 마이그레이션 가이드

### 기존 코드에서 Context로 전환하기

#### Before (Zustand Store 사용):
```typescript
const { data: competitions = [], isError } = getCompetitionsMy();
const { setSelectedCompetition } = useSelectedCompetitionStore();

useEffect(() => {
  if (competitions && competitions[0]) {
    setSelectedCompetition(competitions[0]);
  }
}, [competitions]);
```

#### After (Competition Context 사용):
```typescript
const { competitions, selectedCompetition } = useCompetition();
// 첫 번째 대회 자동 선택은 Context에서 처리됨
```

## 장점
1. **중앙화된 데이터 관리**: 대회 정보를 한 곳에서 관리
2. **중복 API 호출 방지**: 각 페이지에서 개별적으로 API를 호출하지 않음
3. **일관성**: 모든 컴포넌트에서 동일한 대회 정보 사용
4. **간편한 상태 공유**: props drilling 없이 대회 정보 접근 가능
5. **유지보수성 향상**: 대회 관련 로직이 한 곳에 집중됨

## 향후 고려사항
- 대회 변경 시 관련 데이터(게임 타입, 스테이지 등) 초기화 로직 추가 필요
- 대회 목록 새로고침 기능 추가 고려
- 대회 선택 상태 localStorage 저장으로 영속성 확보 가능