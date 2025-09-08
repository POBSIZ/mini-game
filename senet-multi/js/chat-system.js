// 채팅 시스템 모듈
import { gameStateManager } from './game-state.js';
import { wsManager } from './websocket.js';

export class ChatSystem {
  constructor() {
    this.initializeEventListeners();
  }

  // 이벤트 리스너 초기화
  initializeEventListeners() {
    // 채팅 입력 이벤트
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.sendChatMessage();
        }
      });
    }

    // 채팅 전송 버튼
    const sendChatBtn = document.getElementById("send-chat-btn");
    if (sendChatBtn) {
      sendChatBtn.addEventListener("click", () => this.sendChatMessage());
    }
  }

  // 채팅 메시지 전송
  sendChatMessage() {
    const chatInput = document.getElementById("chat-input");
    if (!chatInput || !chatInput.value.trim()) return;
    
    const message = chatInput.value.trim();
    
    wsManager.send("CHAT_MESSAGE", {
      roomId: gameStateManager.currentRoom.id,
      playerId: gameStateManager.currentPlayer.id,
      message: message,
      messageType: "text"
    });
    
    chatInput.value = "";
  }

  // 시스템 메시지 추가
  addSystemMessage(message) {
    this.addChatMessage("system", message);
  }

  // 플레이어 메시지 추가
  addPlayerMessage(message, playerName, isSelf = false) {
    this.addChatMessage("player", message, playerName, isSelf);
  }

  // 채팅 메시지 추가
  addChatMessage(type, message, playerName = null, isSelf = false) {
    const chatArea = document.getElementById("chat-area");
    if (!chatArea) return;
    
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${type} ${isSelf ? 'self' : ''}`;
    
    const timestamp = new Date().toLocaleTimeString();
    
    if (type === "system") {
      messageDiv.innerHTML = `<span class="timestamp">${timestamp}</span> <span class="system-message">${message}</span>`;
    } else {
      messageDiv.innerHTML = `<span class="timestamp">${timestamp}</span> <span class="player-name">${playerName}:</span> <span class="message-text">${message}</span>`;
    }
    
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // 채팅 영역 초기화
  clearChat() {
    const chatArea = document.getElementById("chat-area");
    if (chatArea) {
      chatArea.innerHTML = "";
    }
  }
}

// 싱글톤 인스턴스 생성
export const chatSystem = new ChatSystem();
