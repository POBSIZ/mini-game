# Senet WebSocket 서버 API 문서

## 개요

Senet WebSocket 서버는 고대 이집트 보드게임인 Senet을 위한 실시간 멀티플레이어 게임 서버입니다. WebSocket 프로토콜을 통해 클라이언트와 통신하며, 방 관리, 게임 진행, 채팅 등의 기능을 제공합니다.

**서버 주소**: `ws://localhost:8080/ws`

## 메시지 형식

모든 메시지는 JSON 형식으로 전송되며, 다음과 같은 구조를 가집니다:

```json
{
  "type": "메시지_타입",
  "data": {
    // 메시지별 데이터
  }
}
```

## 클라이언트 → 서버 요청

### 1. 방 목록 조회

**요청**:

```json
{
  "type": "GET_ROOM_LIST",
  "data": {
    "filters": {
      "status": "all|waiting|playing",
      "hasPassword": true|false,
      "maxPlayers": 2
    }
  }
}
```

**응답**:

```json
{
  "type": "ROOM_LIST",
  "timestamp": 1703123456789,
  "data": {
    "rooms": [
      {
        "id": "room-uuid",
        "name": "방 이름",
        "status": "waiting|playing|finished",
        "owner": "player-id",
        "currentPlayers": 1,
        "maxPlayers": 2,
        "hasPassword": false,
        "createdAt": 1703123456789
      }
    ],
    "totalCount": 5,
    "filters": {}
  }
}
```

### 2. 방 생성

**요청**:

```json
{
  "type": "CREATE_ROOM",
  "data": {
    "roomName": "방 이름",
    "password": "비밀번호(선택사항)",
    "maxPlayers": 2,
    "playerName": "플레이어 이름",
    "playerId": "플레이어-ID(선택사항)"
  }
}
```

**응답**:

```json
{
  "type": "ROOM_CREATED",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "roomName": "방 이름",
    "owner": "플레이어 이름",
    "maxPlayers": 2,
    "status": "waiting"
  }
}
```

### 3. 방 참가

**요청**:

```json
{
  "type": "JOIN_ROOM",
  "data": {
    "roomId": "room-uuid",
    "password": "비밀번호(선택사항)",
    "playerName": "플레이어 이름",
    "playerId": "플레이어-ID"
  }
}
```

**응답**:

```json
{
  "type": "ROOM_JOINED",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "roomName": "방 이름",
    "players": [
      {
        "playerId": "player-1-id",
        "playerName": "플레이어1",
        "isOwner": true,
        "isReady": true,
        "side": "W"
      },
      {
        "playerId": "player-2-id",
        "playerName": "플레이어2",
        "isOwner": false,
        "isReady": false,
        "side": "B"
      }
    ]
  }
}
```

### 4. 준비 상태 변경

**요청**:

```json
{
  "type": "READY_STATUS",
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id",
    "isReady": true|false
  }
}
```

**응답** (브로드캐스트):

```json
{
  "type": "PLAYER_READY",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id",
    "isReady": true,
    "allReady": true
  }
}
```

### 5. 게임 시작

**요청**:

```json
{
  "type": "START_GAME",
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id"
  }
}
```

**응답** (브로드캐스트):

```json
{
  "type": "GAME_STARTED",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "gameId": "game-uuid",
    "players": [
      {
        "playerId": "player-1-id",
        "playerName": "플레이어1",
        "isOwner": true,
        "isReady": true,
        "side": "W"
      },
      {
        "playerId": "player-2-id",
        "playerName": "플레이어2",
        "isOwner": false,
        "isReady": true,
        "side": "B"
      }
    ],
    "initialTurn": "W",
    "gameState": {
      "pieces": {
        "W": [1, 3, 5, 7, 9],
        "B": [2, 4, 6, 8, 10]
      },
      "turn": "W",
      "roll": null,
      "gameOver": false,
      "lastMove": null
    }
  }
}
```

### 6. 주사위 굴리기

**요청**:

```json
{
  "type": "ROLL_STICKS",
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id"
  }
}
```

**응답** (브로드캐스트):

```json
{
  "type": "STICKS_ROLLED",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "gameId": "game-uuid",
    "playerId": "player-id",
    "roll": 3,
    "faces": [1, 0, 1, 1],
    "turn": "W",
    "canMove": true
  }
}
```

### 7. 말 이동

**요청**:

```json
{
  "type": "MOVE_PIECE",
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id",
    "move": {
      "side": "W|B",
      "pieceIndex": 0,
      "from": 1,
      "to": 4,
      "roll": 3
    }
  }
}
```

**응답** (브로드캐스트):

```json
{
  "type": "PIECE_MOVED",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "gameId": "game-uuid",
    "move": {
      "playerId": "player-id",
      "side": "W",
      "pieceIndex": 0,
      "from": 1,
      "to": 4,
      "roll": 3,
      "captured": null,
      "extraTurn": false
    },
    "gameState": {
      "pieces": {
        "W": [4, 3, 5, 7, 9],
        "B": [2, 4, 6, 8, 10]
      },
      "turn": "B",
      "roll": 3,
      "gameOver": false,
      "lastMove": {...}
    }
  }
}
```

### 8. 턴 변경 알림

**응답** (브로드캐스트):

```json
{
  "type": "TURN_CHANGED",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "gameId": "game-uuid",
    "newTurn": "B",
    "reason": "normal_move|extra_turn"
  }
}
```

### 9. 게임 종료

**응답** (브로드캐스트):

```json
{
  "type": "GAME_ENDED",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "gameId": "game-uuid",
    "winner": "W",
    "winnerName": "플레이어1",
    "finalState": {
      "pieces": {
        "W": [0, 0, 0, 0, 0],
        "B": [15, 20, 25, 28, 29]
      },
      "turn": "W",
      "roll": 2,
      "gameOver": true,
      "lastMove": {...}
    },
    "gameDuration": 1800000
  }
}
```

### 10. 게임 리셋

**요청**:

```json
{
  "type": "RESET_GAME",
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id"
  }
}
```

**응답** (브로드캐스트):

```json
{
  "type": "GAME_RESET",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "gameId": "old-game-uuid",
    "resetBy": "player-id",
    "newGameId": "new-game-uuid"
  }
}
```

### 11. 방 나가기

**요청**:

```json
{
  "type": "LEAVE_ROOM",
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id"
  }
}
```

### 12. 방 삭제

**요청**:

```json
{
  "type": "DELETE_ROOM",
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id"
  }
}
```

### 13. 채팅 메시지

**요청**:

```json
{
  "type": "CHAT_MESSAGE",
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id",
    "message": "안녕하세요!",
    "messageType": "text"
  }
}
```

**응답** (브로드캐스트):

```json
{
  "type": "CHAT_RECEIVED",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id",
    "playerName": "플레이어 이름",
    "message": "안녕하세요!",
    "messageType": "text",
    "timestamp": 1703123456789
  }
}
```

### 14. 하트비트

**요청**:

```json
{
  "type": "HEARTBEAT",
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id"
  }
}
```

**응답** (브로드캐스트):

```json
{
  "type": "PLAYER_STATUS",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id",
    "status": "connected",
    "lastSeen": 1703123456789
  }
}
```

## 서버 → 클라이언트 알림

### 플레이어 상태 변경

```json
{
  "type": "PLAYER_STATUS",
  "timestamp": 1703123456789,
  "data": {
    "roomId": "room-uuid",
    "playerId": "player-id",
    "status": "connected|disconnected|left_room|new_owner|game_cancelled|room_deleted",
    "lastSeen": 1703123456789
  }
}
```

### 에러 메시지

```json
{
  "type": "ERROR",
  "timestamp": 1703123456789,
  "data": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": {}
  }
}
```

## 에러 코드

| 코드                   | 설명                          |
| ---------------------- | ----------------------------- |
| `INVALID_JSON`         | 잘못된 JSON 형식              |
| `UNKNOWN_MESSAGE_TYPE` | 알 수 없는 메시지 타입        |
| `ROOM_CREATION_FAILED` | 방 생성 실패                  |
| `JOIN_ROOM_FAILED`     | 방 참가 실패                  |
| `ROOM_NOT_FOUND`       | 방을 찾을 수 없음             |
| `INVALID_PASSWORD`     | 잘못된 비밀번호               |
| `ROOM_FULL`            | 방이 가득 참                  |
| `ALREADY_JOINED`       | 이미 참가한 플레이어          |
| `NO_AVAILABLE_SEATS`   | 사용 가능한 좌석 없음         |
| `NOT_ROOM_OWNER`       | 방장이 아님                   |
| `NEED_TWO_PLAYERS`     | 2명의 플레이어가 필요함       |
| `PLAYERS_NOT_READY`    | 모든 플레이어가 준비되지 않음 |
| `GAME_NOT_STARTED`     | 게임이 시작되지 않음          |
| `NOT_YOUR_TURN`        | 내 턴이 아님                  |
| `NOT_YOUR_SIDE`        | 해당 진영의 플레이어가 아님   |
| `INVALID_MOVE`         | 유효하지 않은 이동            |
| `START_GAME_FAILED`    | 게임 시작 실패                |
| `RESET_GAME_FAILED`    | 게임 리셋 실패                |
| `GAME_NOT_IN_PROGRESS` | 게임이 진행 중이 아님         |
| `DELETE_ROOM_FAILED`   | 방 삭제 실패                  |

## 게임 규칙

### 보드 구성

- 30개의 칸으로 구성된 보드
- 안전한 칸: 15번, 26번
- 물 칸: 27번
- 출구: 30번

### 초기 배치

- 흰색(W): 1, 3, 5, 7, 9번 칸
- 검은색(B): 2, 4, 6, 8, 10번 칸

### 주사위 규칙

- 4개의 막대를 던져서 앞면이 나온 개수만큼 이동
- 모든 막대가 뒷면이면 5칸 이동
- 4 또는 5가 나오면 추가 턴

### 이동 규칙

1. 상대방 말을 잡을 수 있음 (안전한 칸 제외)
2. 물에 도착하면 안전한 칸으로 이동
3. 물을 통과하면 추가 턴 취소
4. 모든 말이 출구에 도달하면 승리

## 연결 관리

### 자동 재연결

서버는 클라이언트의 연결이 끊어졌다가 다시 연결될 때 자동으로 방 상태를 복구합니다.

### 하트비트

클라이언트는 주기적으로 하트비트를 보내서 연결 상태를 유지해야 합니다.

## 예제 클라이언트 코드

### JavaScript (WebSocket)

```javascript
const ws = new WebSocket("ws://localhost:8080/ws");

ws.onopen = function () {
  console.log("연결됨");

  // 방 생성
  ws.send(
    JSON.stringify({
      type: "CREATE_ROOM",
      data: {
        roomName: "테스트 방",
        playerName: "플레이어1",
      },
    })
  );
};

ws.onmessage = function (event) {
  const message = JSON.parse(event.data);
  console.log("수신:", message);

  switch (message.type) {
    case "ROOM_CREATED":
      console.log("방 생성됨:", message.data.roomId);
      break;
    case "GAME_STARTED":
      console.log("게임 시작됨");
      break;
    case "STICKS_ROLLED":
      console.log("주사위 결과:", message.data.roll);
      break;
  }
};
```

### Python (websockets)

```python
import asyncio
import websockets
import json

async def client():
    uri = "ws://localhost:8080/ws"
    async with websockets.connect(uri) as websocket:
        # 방 생성
        await websocket.send(json.dumps({
            "type": "CREATE_ROOM",
            "data": {
                "roomName": "테스트 방",
                "playerName": "플레이어1"
            }
        }))

        # 메시지 수신
        async for message in websocket:
            data = json.loads(message)
            print(f"수신: {data}")

asyncio.run(client())
```

## 주의사항

1. **메시지 순서**: 서버는 메시지를 순서대로 처리하지만, 네트워크 지연으로 인해 순서가 바뀔 수 있습니다.
2. **연결 관리**: 클라이언트는 연결이 끊어졌을 때 적절한 재연결 로직을 구현해야 합니다.
3. **에러 처리**: 모든 요청에 대해 에러 응답이 올 수 있으므로 적절한 에러 처리가 필요합니다.
4. **동시성**: 여러 클라이언트가 동시에 같은 방에 접근할 수 있으므로 동시성 처리가 필요합니다.

## 구현 세부사항

### 서버 아키텍처

- **프레임워크**: Axum (Rust)
- **WebSocket**: tokio-tungstenite
- **동시성**: tokio async/await
- **상태 관리**: DashMap (동시성 안전 해시맵)
- **메시지 브로드캐스트**: tokio broadcast 채널

### 데이터 구조

- **방 상태**: `RoomInner` - 방의 모든 상태 정보
- **게임 상태**: `GameState` - Senet 게임 로직
- **플레이어**: `Player` - 플레이어 정보 및 메시지 채널
- **메시지**: `ServerMsg` enum - 모든 서버 메시지 타입

### 성능 고려사항

- **메시지 버퍼링**: 1024개 메시지 버퍼로 메시지 손실 방지
- **브로드캐스트 채널**: 256개 메시지 버퍼로 방 내 통신
- **자동 정리**: 빈 방 자동 삭제
- **연결 복구**: 재연결 시 자동 상태 복구

## 테스트 방법

### 서버 실행

```bash
cargo run
```

### WebSocket 테스트 도구

- **wscat**: `npm install -g wscat`
- **websocat**: `cargo install websocat`

### 기본 테스트 시나리오

1. 방 생성 → `CREATE_ROOM`
2. 방 참가 → `JOIN_ROOM`
3. 준비 상태 변경 → `READY_STATUS`
4. 게임 시작 → `START_GAME`
5. 주사위 굴리기 → `ROLL_STICKS`
6. 말 이동 → `MOVE_PIECE`

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.
