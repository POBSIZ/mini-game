## 📚 주사위 배틀 프로젝트 구조 문서

이 디렉토리는 `docs/game/`의 공식 규칙과 AI 가이드를 기반으로, 개발과 유지보수를 위한 구조적 문서를 제공합니다.

### 🗂️ 문서 목록

- [아키텍처 개요](architecture_overview.md)
- [도메인 모델](domain_model.md)
- [게임 플로우](game_flow.md)
- [AI 시스템](ai_system.md)
- [주사위 시스템](dice_system.md)
- [에너지 시스템](energy_system.md)
- [전략 카드 시스템](card_system.md)
- [방어막 시스템](shield_system.md)
- [이벤트 시스템](event_system.md)
- [점수/계산 시스템](scoring_system.md)
- [코딩 컨벤션 (순수 JS)](coding_conventions.md)
\- [공통 상태/공유 모듈](common_state_and_shared_modules.md)

### 🔗 참조

- 규칙서: `../game/dice_battle_rule.md`
- AI 가이드: `../game/ai_strategy_guide.md`

### ✍️ 사용 방법

- 기능을 구현하거나 변경할 때, 해당 시스템 문서를 먼저 확인하세요.
- 시스템 간 상호작용이 필요한 경우, 각 문서의 "상호작용" 섹션을 함께 검토하세요.
