# Senet 멀티플레이어 게임 프로토콜 문서

## 📋 개요

이 문서는 Senet 멀티플레이어 게임에서 클라이언트와 서버 간 통신에 사용되는 데이터 형식을 정의합니다.

## 🔌 기본 통신 형식

### WebSocket 연결

- **URL**: `ws://game.pobisz.com/ws`
- **프로토콜**: WebSocket
- **인코딩**: UTF-8 JSON

### 메시지 형식

```json
{
  "type": "메시지_타입",
  "timestamp": 1234567890,
  "data": { ... }
}
```

## 📤 클라이언트 → 서버 (송신)

### 1. 방 생성 (CREATE_ROOM)

방 생성 시 자동으로 플레이어 등록이 처리됩니다. 별도의 플레이어 등록 절차가 필요하지 않습니다.

```json
{
  "type": "CREATE_ROOM",
  "timestamp": 1234567890,
  "data": {
    "roomName": "초보자 방",
    "password": "1234", // 선택사항, 없으면 null
    "maxPlayers": 2,
    "playerName": "플레이어1",
    "playerId": "uuid-1234-5678" // 클라이언트에서 생성한 고유 ID
  }
}
```

### 2. 방 참가 (JOIN_ROOM)

방 참가 시 자동으로 플레이어 등록이 처리됩니다. 별도의 플레이어 등록 절차가 필요하지 않습니다.

```json
{
  "type": "JOIN_ROOM",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "password": "1234", // 비밀번호가 있는 방의 경우 (선택사항)
    "playerName": "플레이어2",
    "playerId": "uuid-5678-9012" // 클라이언트에서 생성한 고유 ID
  }
}
```

### 3. 방 나가기 (LEAVE_ROOM)

```json
{
  "type": "LEAVE_ROOM",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-1234-5678"
  }
}
```

### 4. 방 삭제 (DELETE_ROOM)

```json
{
  "type": "DELETE_ROOM",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-1234-5678" // 방장만 가능
  }
}
```

### 5. 준비 상태 변경 (READY_STATUS)

```json
{
  "type": "READY_STATUS",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-1234-5678",
    "isReady": true
  }
}
```

### 6. 게임 시작 요청 (START_GAME)

```json
{
  "type": "START_GAME",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-1234-5678" // 방장만 가능
  }
}
```

### 7. 막대기 던지기 (ROLL_STICKS)

```json
{
  "type": "ROLL_STICKS",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-1234-5678",
    "gameId": "game-5678",
    "turn": "W" // 현재 턴
  }
}
```

### 8. 말 이동 (MOVE_PIECE)

```json
{
  "type": "MOVE_PIECE",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-1234-5678",
    "gameId": "game-5678",
    "move": {
      "side": "W", // 말 색상 (W/B)
      "pieceIndex": 0, // 말 인덱스 (0-4)
      "from": 1, // 시작 위치
      "to": 5, // 도착 위치
      "roll": 4 // 사용된 막대기 값
    }
  }
}
```

### 9. 게임 리셋 요청 (RESET_GAME)

```json
{
  "type": "RESET_GAME",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-1234-5678", // 방장만 가능
    "gameId": "game-5678"
  }
}
```

### 10. 채팅 메시지 (CHAT_MESSAGE)

```json
{
  "type": "CHAT_MESSAGE",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-1234-5678",
    "message": "안녕하세요!",
    "messageType": "text" // text, emoji, system
  }
}
```

### 11. 하트비트 (HEARTBEAT)

```json
{
  "type": "HEARTBEAT",
  "timestamp": 1234567890,
  "data": {
    "playerId": "uuid-1234-5678",
    "status": "active"
  }
}
```

### 12. 방 목록 요청 (GET_ROOM_LIST)

```json
{
  "type": "GET_ROOM_LIST",
  "timestamp": 1234567890,
  "data": {
    "filters": {
      "status": "waiting", // "waiting", "playing", "all"
      "hasPassword": null, // true, false, null (모든 방)
      "maxPlayers": null // 2, null (모든 방)
    }
  }
}
```

## 📥 서버 → 클라이언트 (수신)

### 1. 방 목록 응답 (ROOM_LIST)

```json
{
  "type": "ROOM_LIST",
  "timestamp": 1234567890,
  "data": {
    "rooms": [
      {
        "id": "room-1234",
        "name": "초보자 방",
        "status": "waiting",
        "owner": "플레이어1",
        "currentPlayers": 1,
        "maxPlayers": 2,
        "hasPassword": false,
        "createdAt": 1234567890
      },
      {
        "id": "room-5678",
        "name": "고수 방",
        "status": "waiting",
        "owner": "플레이어2",
        "currentPlayers": 1,
        "maxPlayers": 2,
        "hasPassword": true,
        "createdAt": 1234567890
      }
    ],
    "totalCount": 2,
    "filters": {
      "status": "waiting",
      "hasPassword": null,
      "maxPlayers": null
    }
  }
}
```

### 2. 방 생성 응답 (ROOM_CREATED)

```json
{
  "type": "ROOM_CREATED",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "roomName": "초보자 방",
    "owner": "플레이어1",
    "maxPlayers": 2,
    "status": "waiting"
  }
}
```

### 3. 방 참가 응답 (ROOM_JOINED)

```json
{
  "type": "ROOM_JOINED",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "roomName": "초보자 방",
    "players": [
      {
        "playerId": "uuid-1234-5678",
        "playerName": "플레이어1",
        "isOwner": true,
        "isReady": true,
        "side": "W"
      },
      {
        "playerId": "uuid-5678-9012",
        "playerName": "플레이어2",
        "isOwner": false,
        "isReady": false,
        "side": "B"
      }
    ]
  }
}
```

### 4. 플레이어 준비 상태 업데이트 (PLAYER_READY)

```json
{
  "type": "PLAYER_READY",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-5678-9012",
    "isReady": true,
    "allReady": false // 모든 플레이어가 준비되었는지
  }
}
```

### 5. 게임 시작 알림 (GAME_STARTED)

```json
{
  "type": "GAME_STARTED",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "gameId": "game-5678",
    "players": [
      {
        "playerId": "uuid-1234-5678",
        "playerName": "플레이어1",
        "side": "W"
      },
      {
        "playerId": "uuid-5678-9012",
        "playerName": "플레이어2",
        "side": "B"
      }
    ],
    "initialTurn": "W",
    "gameState": {
      "pieces": {
        "W": [1, 3, 5, 7, 9],
        "B": [2, 4, 6, 8, 10]
      }
    }
  }
}
```

### 6. 막대기 던지기 결과 (STICKS_ROLLED)

```json
{
  "type": "STICKS_ROLLED",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "gameId": "game-5678",
    "playerId": "uuid-1234-5678",
    "roll": 4,
    "faces": [1, 1, 0, 0], // 각 막대기 상태
    "turn": "W",
    "canMove": true // 이동 가능한 말이 있는지
  }
}
```

### 7. 말 이동 결과 (PIECE_MOVED)

```json
{
  "type": "PIECE_MOVED",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "gameId": "game-5678",
    "move": {
      "side": "W",
      "pieceIndex": 0,
      "from": 1,
      "to": 5,
      "roll": 4,
      "captured": null, // 상대 말을 잡았는지
      "extraTurn": false // 추가 턴인지
    },
    "gameState": {
      "pieces": {
        "W": [5, 3, 5, 7, 9],
        "B": [2, 4, 6, 8, 10]
      },
      "turn": "B",
      "gameOver": false
    }
  }
}
```

### 8. 턴 변경 알림 (TURN_CHANGED)

```json
{
  "type": "TURN_CHANGED",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "gameId": "game-5678",
    "newTurn": "B",
    "reason": "normal_move" // normal_move, extra_turn, no_moves
  }
}
```

### 9. 게임 종료 알림 (GAME_ENDED)

```json
{
  "type": "GAME_ENDED",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "gameId": "game-5678",
    "winner": "W",
    "winnerName": "플레이어1",
    "finalState": {
      "pieces": {
        "W": [0, 0, 0, 0, 0],
        "B": [2, 4, 6, 8, 10]
      }
    },
    "gameDuration": 1800 // 게임 진행 시간 (초)
  }
}
```

### 10. 게임 리셋 알림 (GAME_RESET)

```json
{
  "type": "GAME_RESET",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "gameId": "game-5678",
    "resetBy": "uuid-1234-5678",
    "newGameId": "game-9012"
  }
}
```

### 11. 플레이어 연결 상태 (PLAYER_STATUS)

```json
{
  "type": "PLAYER_STATUS",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-5678-9012",
    "status": "disconnected", // connected, disconnected, afk
    "lastSeen": 1234567890
  }
}
```

### 12. 에러 메시지 (ERROR)

```json
{
  "type": "ERROR",
  "timestamp": 1234567890,
  "data": {
    "code": "INVALID_MOVE",
    "message": "유효하지 않은 이동입니다.",
    "details": {
      "reason": "경로가 막혀있습니다",
      "suggestion": "다른 말을 선택하세요"
    }
  }
}
```

### 13. 채팅 메시지 수신 (CHAT_RECEIVED)

```json
{
  "type": "CHAT_RECEIVED",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "playerId": "uuid-1234-5678",
    "playerName": "플레이어1",
    "message": "안녕하세요!",
    "messageType": "text",
    "timestamp": 1234567890
  }
}
```

## 🔄 실시간 업데이트

### 게임 상태 동기화

서버는 주기적으로(1초마다) 모든 클라이언트에게 현재 게임 상태를 전송합니다:

```json
{
  "type": "GAME_STATE_SYNC",
  "timestamp": 1234567890,
  "data": {
    "roomId": "room-1234",
    "gameId": "game-5678",
    "gameState": {
      "pieces": { ... },
      "turn": "W",
      "roll": 4,
      "gameOver": false,
      "lastMove": { ... }
    },
    "players": [ ... ],
    "gameTime": 1800
  }
}
```

## 🚨 에러 코드

| 코드               | 설명                     | 해결 방법       |
| ------------------ | ------------------------ | --------------- |
| `ROOM_NOT_FOUND`   | 방을 찾을 수 없음        | 방 ID 확인      |
| `ROOM_FULL`        | 방이 가득 참             | 다른 방 선택    |
| `INVALID_PASSWORD` | 잘못된 비밀번호          | 비밀번호 재입력 |
| `NOT_ROOM_OWNER`   | 방장 권한 없음           | 방장에게 요청   |
| `INVALID_MOVE`     | 유효하지 않은 이동       | 다른 이동 선택  |
| `NOT_YOUR_TURN`    | 내 턴이 아님             | 턴 대기         |
| `GAME_NOT_STARTED` | 게임이 시작되지 않음     | 게임 시작 대기  |
| `PLAYER_NOT_READY` | 플레이어가 준비되지 않음 | 준비 상태 확인  |

## 📊 데이터 형식 규칙

### 필수 필드

- `type`: 메시지 타입 (항상 포함)
- `timestamp`: Unix 타임스탬프 (밀리초)
- `data`: 실제 데이터 (null이 아닌 경우)

### 선택 필드

- `roomId`: 방 관련 메시지에서만
- `gameId`: 게임 진행 중인 메시지에서만
- `playerId`: 플레이어 관련 메시지에서만

### 타임스탬프

- 모든 메시지에 포함
- Unix 타임스탬프 (밀리초 단위)
- 클라이언트와 서버 간 시간 동기화에 사용

## 🔐 보안 고려사항

1. **플레이어 인증**: 각 요청에 유효한 `playerId` 포함
2. **권한 검증**: 방장 전용 기능은 서버에서 검증
3. **입력 검증**: 모든 클라이언트 입력은 서버에서 검증
4. **속도 제한**: 과도한 요청 방지
5. **연결 상태**: 주기적인 하트비트로 연결 상태 확인

## 📝 구현 예시

### 클라이언트 측 전송

#### 방 목록 요청

```javascript
function requestRoomList(filters = {}) {
  const message = {
    type: "GET_ROOM_LIST",
    timestamp: Date.now(),
    data: {
      filters: {
        status: filters.status || "all",
        hasPassword: filters.hasPassword || null,
        maxPlayers: filters.maxPlayers || null,
      },
    },
  };

  websocket.send(JSON.stringify(message));
}

// 사용 예시
requestRoomList({ status: "waiting", hasPassword: false });
```

#### 말 이동

```javascript
function sendMove(roomId, gameId, side, pieceIndex, from, to, roll) {
  const message = {
    type: "MOVE_PIECE",
    timestamp: Date.now(),
    data: {
      roomId: roomId,
      playerId: getCurrentPlayerId(),
      gameId: gameId,
      move: { side, pieceIndex, from, to, roll },
    },
  };

  websocket.send(JSON.stringify(message));
}
```

### 서버 측 수신 처리

```javascript
websocket.on("message", (data) => {
  const message = JSON.parse(data);

  switch (message.type) {
    case "GET_ROOM_LIST":
      handleRoomListRequest(message.data);
      break;
    case "CREATE_ROOM":
      handleCreateRoom(message.data);
      break;
    case "JOIN_ROOM":
      handleJoinRoom(message.data);
      break;
    case "LEAVE_ROOM":
      handleLeaveRoom(message.data);
      break;
    case "READY_STATUS":
      handleReadyStatus(message.data);
      break;
    case "START_GAME":
      handleStartGame(message.data);
      break;
    case "ROLL_STICKS":
      handleRollSticks(message.data);
      break;
    case "MOVE_PIECE":
      handleMovePiece(message.data);
      break;
    case "RESET_GAME":
      handleResetGame(message.data);
      break;
    case "CHAT_MESSAGE":
      handleChatMessage(message.data);
      break;
    case "HEARTBEAT":
      handleHeartbeat(message.data);
      break;
    // ... 기타 메시지 타입 처리
  }
});

function handleRoomListRequest(data) {
  const { filters } = data;
  const rooms = getFilteredRooms(filters);

  const response = {
    type: "ROOM_LIST",
    timestamp: Date.now(),
    data: {
      rooms: rooms,
      totalCount: rooms.length,
      filters: filters,
    },
  };

  websocket.send(JSON.stringify(response));
}

이 프로토콜을 따르면 안정적이고 확장 가능한 멀티플레이어 Senet 게임을 구현할 수 있습니다.
```
