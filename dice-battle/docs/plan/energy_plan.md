## 🔋 에너지 시스템 개발 계획

### 범위

- 에너지 획득/소모/상한 보정, 이벤트 상호작용

### 작업

1. `gainEnergy(state, amount)`
2. `spendEnergy(state, amount)`
3. `applyEnergyEvent(state, kind)` (`charge`/`drain`)

### API

- `src/systems/energy.js`

### 완료 기준

- 구조 문서 일치: `../structure/energy_system.md`
- 규칙서 참조: `../game/dice_battle_rule.md#에너지-시스템`
