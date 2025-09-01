const { chromium } = require("playwright");
const http = require("http");

// 서버 상태 확인 함수들
async function checkHttpServer() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 8000,
        path: "/senet/",
        method: "GET",
        timeout: 5000,
      },
      (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("타임아웃"));
    });

    req.end();
  });
}

async function checkWebSocketServer() {
  return new Promise((resolve, reject) => {
    // Node.js에서 WebSocket을 사용하기 위해 ws 모듈이 필요하지만,
    // 간단한 TCP 연결로 WebSocket 포트가 열려있는지 확인
    const net = require("net");
    const client = net.createConnection(
      { port: 8080, host: "localhost" },
      () => {
        client.end();
        resolve();
      }
    );

    client.on("error", (err) => {
      reject(err);
    });

    client.setTimeout(5000, () => {
      client.destroy();
      reject(new Error("타임아웃"));
    });
  });
}

async function testMultiplayerSync() {
  console.log("🎮 정확한 HTML 구조를 파악한 멀티플레이어 테스트 시작");

  // 서버 상태 확인
  console.log("🔍 서버 상태 확인 중...");
  try {
    await checkHttpServer();
    console.log("✅ HTTP 서버 연결 확인됨");
  } catch (error) {
    console.error("❌ HTTP 서버 연결 실패:", error.message);
    console.log("💡 서버를 먼저 실행해주세요: python -m http.server 8000");
    return;
  }

  // Rust WebSocket 서버 확인
  console.log("🔍 WebSocket 서버 상태 확인 중...");
  try {
    await checkWebSocketServer();
    console.log("✅ WebSocket 서버 연결 확인됨");
  } catch (error) {
    console.error("❌ WebSocket 서버 연결 실패:", error.message);
    console.log("💡 Rust 서버를 먼저 실행해주세요: cargo run");
    return;
  }

  const browser1 = await chromium.launch({ headless: false });
  const browser2 = await chromium.launch({ headless: false });

  try {
    const context1 = await browser1.newContext();
    const page1 = await context1.newPage();
    const context2 = await browser2.newContext();
    const page2 = await context2.newPage();

    // 페이지 로드
    console.log("📄 페이지 로딩...");
    await Promise.all([
      page1.goto("http://localhost:8000/senet/"),
      page2.goto("http://localhost:8000/senet/"),
    ]);

    await page1.waitForLoadState("networkidle");
    await page2.waitForLoadState("networkidle");

    // WebSocket 로깅 설정
    await setupWebSocketLogging(page1, "플레이어1");
    await setupWebSocketLogging(page2, "플레이어2");

    // 브라우저 콘솔 로깅 활성화
    await page1.evaluate(() => {
      console.log("🔍 플레이어1 브라우저 콘솔 활성화");
      window.addEventListener('error', (e) => console.error('❌ 플레이어1 에러:', e));
      
      // WebSocket 메시지 전송/수신 로깅 강화
      const originalSend = WebSocket.prototype.send;
      WebSocket.prototype.send = function(data) {
        try {
          const message = JSON.parse(data);
          console.log("📤 플레이어1 → 서버:", message.type, message.data);
        } catch (e) {
          console.log("📤 플레이어1 → 서버 (raw):", data);
        }
        return originalSend.call(this, data);
      };
      
      // 콘솔 로그를 전역 변수에 저장
      window.player1Logs = [];
      const originalLog = console.log;
      console.log = function(...args) {
        window.player1Logs.push(args.join(' '));
        originalLog.apply(console, args);
      };
    });
    
    await page2.evaluate(() => {
      console.log("🔍 플레이어2 브라우저 콘솔 활성화");
      window.addEventListener('error', (e) => console.error('❌ 플레이어2 에러:', e));
      
      // WebSocket 메시지 전송/수신 로깅 강화
      const originalSend = WebSocket.prototype.send;
      WebSocket.prototype.send = function(data) {
        try {
          const message = JSON.parse(data);
          console.log("📤 플레이어2 → 서버:", message.type, message.data);
        } catch (e) {
          console.log("📤 플레이어2 → 서버 (raw):", data);
        }
        return originalSend.call(this, data);
      };
      
      // 콘솔 로그를 전역 변수에 저장
      window.player2Logs = [];
      const originalLog = console.log;
      console.log = function(...args) {
        window.player2Logs.push(args.join(' '));
        originalLog.apply(console, args);
      };
    });

    // JavaScript 객체 로드 대기
    await page1.waitForFunction(() => window.multiplayerUI !== undefined);
    await page2.waitForFunction(() => window.multiplayerUI !== undefined);

    // 게임 객체도 로드 대기
    await page1.waitForFunction(() => window.multiplayerGame !== undefined);
    await page2.waitForFunction(() => window.multiplayerGame !== undefined);

    console.log("✅ JavaScript 로드 완료");

    // 게임 객체 상태 확인
    const game1Status = await page1.evaluate(() => {
      const game = window.multiplayerGame;
      return {
        exists: !!game,
        turn: game?.turn,
        roll: game?.roll,
        pieces: game?.pieces
      };
    });
    const game2Status = await page2.evaluate(() => {
      const game = window.multiplayerGame;
      return {
        exists: !!game,
        turn: game?.turn,
        roll: game?.roll,
        pieces: game?.pieces
      };
    });

    console.log("📊 게임 객체 상태:");
    console.log("플레이어1:", game1Status);
    console.log("플레이어2:", game2Status);

    // 플레이어 이름 설정
    await page1.fill("#player-name", "플레이어1");
    await page2.fill("#player-name", "플레이어2");

    // 1단계: 플레이어1 방 생성
    console.log("🎯 1단계: 플레이어1 방 생성");
    await page1.click("#btn-connect");
    await page1.waitForTimeout(2000);

    // 방 패널 대기
    await page1.waitForSelector("#rooms-panel", { timeout: 10000 });

    // 방 생성 버튼 클릭
    await page1.click("#btn-create-room");
    await page1.waitForTimeout(1000);

    // 방 생성 다이얼로그 채우기
    await page1.fill("#room-name", "테스트방");
    await page1.click("#btn-confirm-create-room");
    await page1.waitForTimeout(3000);

    console.log("✅ 플레이어1 방 생성 성공");

    // 2단계: 플레이어2 방 목록 접속 및 참가
    console.log("🎯 2단계: 플레이어2 방 목록 접속");
    await page2.click("#btn-connect");
    await page2.waitForTimeout(2000);

    await page2.waitForSelector("#rooms-panel", { timeout: 10000 });

    // 방 목록 새로고침
    console.log("🔄 방 목록 새로고침");
    await page2.click("#btn-refresh-rooms");
    await page2.waitForTimeout(2000);

    // 방 목록이 로드될 때까지 대기
    await page2.waitForFunction(
      () => {
      const roomsList = document.getElementById("rooms-list");
      return roomsList && roomsList.children.length > 0;
      },
      { timeout: 10000 }
    );

    console.log("✅ 방 목록 로드됨");

    // 방 참가 버튼 찾기 (정확한 선택자 사용)
    let joinButtons = await page2.$$(".btn-join-room:not([disabled])");
    console.log(`📊 활성화된 참가 버튼 수: ${joinButtons.length}`);

    if (joinButtons.length === 0) {
      // 다시 시도
      console.log("🔄 참가 버튼 재탐색");
      await page2.click("#btn-refresh-rooms");
      await page2.waitForTimeout(2000);
      joinButtons = await page2.$$(".btn-join-room:not([disabled])");
      console.log(`📊 재시도 후 참가 버튼 수: ${joinButtons.length}`);
    }

    if (joinButtons.length > 0) {
      console.log("🚪 방 참가 시도");
      await joinButtons[0].click();
      await page2.waitForTimeout(2000);

      console.log("✅ 플레이어2 방 참가 성공");

      // 3단계: 대기 화면으로 전환
      console.log("🎯 3단계: 대기 화면 전환");
      await page1.waitForSelector("#waiting-screen", { timeout: 5000 });
      await page2.waitForSelector("#waiting-screen", { timeout: 5000 });

      console.log("✅ 양쪽 모두 대기 화면 진입");

      // 준비 상태 확인 (자동으로 준비될 수 있음)
      const readyBtn1 = await page1.$("#btn-ready");
      const readyBtn2 = await page2.$("#btn-ready");

      const readyText1 = await readyBtn1.textContent();
      const readyText2 = await readyBtn2.textContent();

      console.log(`플레이어1 준비 버튼: "${readyText1}"`);
      console.log(`플레이어2 준비 버튼: "${readyText2}"`);

      // 플레이어2만 준비 (방장은 이미 준비 상태일 수 있음)
      if (readyText2.includes("준비")) {
        console.log("플레이어2 준비 버튼 클릭 시도");
        await page2.click("#btn-ready");
        await page2.waitForTimeout(1000);
      }

      // 준비 상태 재확인
      const readyBtn1After = await page1.$("#btn-ready");
      const readyBtn2After = await page2.$("#btn-ready");
      const readyText1After = await readyBtn1After.textContent();
      const readyText2After = await readyBtn2After.textContent();
      console.log(`플레이어1 준비 후 버튼: "${readyText1After}"`);
      console.log(`플레이어2 준비 후 버튼: "${readyText2After}"`);

      await page1.waitForTimeout(1000);

      // 4단계: 게임 시작
      console.log("🎯 4단계: 게임 시작");

      // 방장이 게임 시작 버튼 클릭
      const startGameBtn = await page1.$("#btn-start-game");
      if (startGameBtn) {
        const isEnabled = await startGameBtn.isEnabled();
        console.log(`게임 시작 버튼 활성화 상태: ${isEnabled}`);

        if (isEnabled) {
          console.log("방장이 게임 시작 버튼 클릭");
          await page1.click("#btn-start-game");
          await page1.waitForTimeout(1000);
        } else {
          console.log(
            "게임 시작 버튼이 비활성화됨 - 모든 플레이어가 준비되지 않음"
          );
        }
      }

      await page1.waitForSelector("#game-screen", { timeout: 10000 });
      await page2.waitForSelector("#game-screen", { timeout: 10000 });

      console.log("✅ 게임 시작됨");

      // 게임 시작 후 상태 확인
      await page1.waitForTimeout(2000);
      const gameStarted1 = await page1.evaluate(() => {
        const game = window.multiplayerGame;
        return {
          gameState: game?.gameState,
          turn: game?.turn,
          pieces: game?.pieces,
          gameId: game?.gameId
        };
      });
      const gameStarted2 = await page2.evaluate(() => {
        const game = window.multiplayerGame;
        return {
          gameState: game?.gameState,
          turn: game?.turn,
          pieces: game?.pieces,
          gameId: game?.gameId
        };
      });

      console.log("📊 게임 시작 후 상태:");
      console.log("플레이어1:", gameStarted1);
      console.log("플레이어2:", gameStarted2);

      // 5단계: 주사위 굴림 테스트
      await testDiceRollingSync(page1, page2);

      // 6단계: 말 이동 동기화 테스트
      await testPieceMovementSync(page1, page2);
    } else {
      console.log("❌ 방 참가 버튼을 찾을 수 없음");

      // 디버깅 정보 출력
      const roomsListHtml = await page2.$eval(
        "#rooms-list",
        (el) => el.innerHTML
      );
      console.log("📄 방 목록 HTML:", roomsListHtml);

      const allButtons = await page2.$$(".btn-join-room");
      console.log(`📊 모든 참가 버튼 수: ${allButtons.length}`);

      for (let i = 0; i < allButtons.length; i++) {
        const isDisabled = await allButtons[i].getAttribute("disabled");
        const text = await allButtons[i].textContent();
        console.log(`버튼 ${i}: disabled=${isDisabled}, text="${text}"`);
      }
    }

    await page1.waitForTimeout(3000);
  } catch (error) {
    console.error("❌ 테스트 오류:", error);
  } finally {
    await browser1.close();
    await browser2.close();
    console.log("✅ 테스트 완료");
  }
}

async function testDiceRollingSync(page1, page2) {
  console.log("🎲 주사위 굴림 동기화 테스트 시작");

  try {
    // 현재 턴 확인
    const currentTurn1 = await page1.evaluate(() => {
      return window.multiplayerGame ? window.multiplayerGame.turn : null;
    });
    const currentTurn2 = await page2.evaluate(() => {
      return window.multiplayerGame ? window.multiplayerGame.turn : null;
    });

    console.log(
      `📊 현재 턴 - 플레이어1: ${currentTurn1}, 플레이어2: ${currentTurn2}`
    );

    // 턴 동기화 확인
    if (currentTurn1 !== currentTurn2) {
      console.log("❌ 턴 정보가 동기화되지 않음!");
      return;
    }

    // 현재 턴 플레이어 결정 (W: 플레이어1, B: 플레이어2)
    const currentPlayerPage = currentTurn1 === "W" ? page1 : page2;
    const otherPlayerPage = currentTurn1 === "W" ? page2 : page1;
    const currentPlayerName = currentTurn1 === "W" ? "플레이어1" : "플레이어2";
    const otherPlayerName = currentTurn1 === "W" ? "플레이어2" : "플레이어1";

    console.log(`🎯 ${currentPlayerName}의 턴 - 주사위 굴림 시도`);

    // 주사위 굴림 전 상태 확인
    const rollBtnBefore = await currentPlayerPage.$("#roll");
    const isRollEnabled = rollBtnBefore
      ? await rollBtnBefore.isEnabled()
      : false;
    console.log(`🎲 주사위 버튼 활성화 상태: ${isRollEnabled}`);

    if (!isRollEnabled) {
      console.log(
        "⚠️ 주사위 버튼이 비활성화됨 - 턴이 아니거나 이미 굴렸을 수 있음"
      );
      return;
    }

    // 주사위 굴림 버튼 클릭
    console.log(`🎲 ${currentPlayerName} 주사위 굴림`);
    
    // 클릭 전 브라우저 콘솔 로그 확인
    console.log("📱 클릭 전 브라우저 콘솔 로그:");
    const logsBefore = await currentPlayerPage.evaluate(() => {
      return {
        gameExists: !!window.multiplayerGame,
        gameState: window.multiplayerGame ? {
          turn: window.multiplayerGame.turn,
          roll: window.multiplayerGame.roll,
          isMultiplayer: window.multiplayerGame.isMultiplayer,
          playerId: window.multiplayerGame.playerId,
          roomId: window.multiplayerGame.roomId
        } : null
      };
    });
    console.log("📱 클릭 전 상태:", logsBefore);
    
    await currentPlayerPage.click("#roll");
    
    // 클릭 후 즉시 로그 확인
    console.log("📱 클릭 후 즉시 상태 확인:");
    const logsAfter = await currentPlayerPage.evaluate(() => {
      return {
        gameExists: !!window.multiplayerGame,
        gameState: window.multiplayerGame ? {
          turn: window.multiplayerGame.turn,
          roll: window.multiplayerGame.roll,
          isMultiplayer: window.multiplayerGame.isMultiplayer,
          playerId: window.multiplayerGame.playerId,
          roomId: window.multiplayerGame.roomId
        } : null
      };
    });
    console.log("📱 클릭 후 상태:", logsAfter);
    
    // 클릭 후 브라우저 콘솔 로그 확인
    console.log("📱 클릭 후 브라우저 콘솔 로그:");
    const browserLogs = await currentPlayerPage.evaluate(() => {
      const logs = window.player1Logs || window.player2Logs || [];
      return logs.slice(-10); // 최근 10개 로그
    });
    console.log("📱 브라우저 콘솔:", browserLogs);

    // 서버 응답 대기 (STICKS_ROLLED 메시지)
    console.log("⏳ 서버 응답 대기 중...");
    
    // 실시간 로그 모니터링 (5초간)
    console.log("📊 실시간 로그 모니터링 시작...");
    for (let i = 0; i < 10; i++) {
      await currentPlayerPage.waitForTimeout(500);
      
      // 현재 게임 상태 확인
      const currentState = await currentPlayerPage.evaluate(() => {
        const game = window.multiplayerGame;
        return {
          roll: game?.roll,
          turn: game?.turn,
          pieces: game?.pieces,
          websocketState: game?.websocket?.readyState
        };
      });
      
      console.log(`⏱️ ${(i + 1) * 0.5}초 후 상태:`, currentState);
      
      // 주사위 결과가 업데이트되면 즉시 중단
      if (currentState.roll !== null) {
        console.log("✅ 주사위 결과 업데이트 감지!");
        break;
      }
    }

    // 주사위 결과가 업데이트될 때까지 대기
    console.log("⏳ 주사위 결과 업데이트 대기 중...");
    try {
      await currentPlayerPage.waitForFunction(() => {
        const game = window.multiplayerGame;
        return game && game.roll !== null;
      }, { timeout: 10000 });
      console.log("✅ 주사위 결과 업데이트 완료");
    } catch (error) {
      console.log("⚠️ 주사위 결과 업데이트 타임아웃");
    }

    // 양쪽 플레이어의 WebSocket 상태 확인
    const wsStatus1 = await page1.evaluate(() => {
      const game = window.multiplayerGame;
      return {
        connected: game?.websocket?.readyState === 1,
        readyState: game?.websocket?.readyState,
        url: game?.websocket?.url
      };
    });
    const wsStatus2 = await page2.evaluate(() => {
      const game = window.multiplayerGame;
      return {
        connected: game?.websocket?.readyState === 1,
        readyState: game?.websocket?.readyState,
        url: game?.websocket?.url
      };
    });

    console.log("📡 WebSocket 상태:");
    console.log("플레이어1:", wsStatus1);
    console.log("플레이어2:", wsStatus2);

    // 양쪽 플레이어의 주사위 결과 확인
    const diceResult1 = await page1.evaluate(() => {
      return window.multiplayerGame
        ? {
            roll: window.multiplayerGame.roll,
            faces: window.multiplayerGame.sticksEls?.map(el => el?.textContent || '0') || [],
            turn: window.multiplayerGame.turn,
            canMove: window.multiplayerGame.roll !== null,
          }
        : null;
    });

    const diceResult2 = await page2.evaluate(() => {
      return window.multiplayerGame
        ? {
            roll: window.multiplayerGame.roll,
            faces: window.multiplayerGame.sticksEls?.map(el => el?.textContent || '0') || [],
            turn: window.multiplayerGame.turn,
            canMove: window.multiplayerGame.roll !== null,
          }
        : null;
    });

    console.log(`📊 ${currentPlayerName} 주사위 결과:`, diceResult1);
    console.log(`📊 ${otherPlayerName} 주사위 결과:`, diceResult2);

    // 동기화 확인
    const diceSynced =
      JSON.stringify(diceResult1) === JSON.stringify(diceResult2);

    if (diceSynced) {
      console.log("✅ 성공! 주사위 결과 동기화 완료");
      console.log(
        `🎲 굴림 결과: ${diceResult1.roll} (faces: [${diceResult1.faces}])`
      );
      console.log(`🎯 이동 가능: ${diceResult1.canMove}`);
    } else {
      console.log("❌ 실패! 주사위 결과가 동기화되지 않음");
      console.log("차이점:");
      console.log("플레이어1:", diceResult1);
      console.log("플레이어2:", diceResult2);
    }

    // 턴 변경 확인 (4나 5가 나오면 추가 턴)
    if (diceResult1.roll === 4 || diceResult1.roll === 5) {
      console.log("🎯 추가 턴! (4 또는 5가 나옴)");
      if (diceResult1.turn === currentTurn1) {
        console.log("✅ 추가 턴 유지 확인");
      } else {
        console.log("❌ 추가 턴이 제대로 유지되지 않음");
      }
    } else {
      console.log("🔄 일반 턴 - 다음 플레이어로 넘어감");
    }
  } catch (error) {
    console.error("❌ 주사위 굴림 테스트 오류:", error);
  }
}

async function testPieceMovementSync(page1, page2) {
  console.log("🐘 말 이동 동기화 테스트 시작");

  try {
    // 현재 턴 확인
    const currentTurn1 = await page1.evaluate(() => {
      return window.multiplayerGame ? window.multiplayerGame.turn : null;
    });
    const currentTurn2 = await page2.evaluate(() => {
      return window.multiplayerGame ? window.multiplayerGame.turn : null;
    });

    console.log(
      `📊 현재 턴 - 플레이어1: ${currentTurn1}, 플레이어2: ${currentTurn2}`
    );

    // 턴 동기화 확인
    if (currentTurn1 !== currentTurn2) {
      console.log("❌ 턴 정보가 동기화되지 않음!");
      return;
    }

    // 현재 턴 플레이어 결정 (W: 플레이어1, B: 플레이어2)
    const currentPlayerPage = currentTurn1 === "W" ? page1 : page2;
    const otherPlayerPage = currentTurn1 === "W" ? page2 : page1;
    const currentPlayerName = currentTurn1 === "W" ? "플레이어1" : "플레이어2";
    const otherPlayerName = currentTurn1 === "W" ? "플레이어2" : "플레이어1";

    console.log(`🎯 ${currentPlayerName}의 턴 - 말 이동 시도`);

    // 이동 가능한 말 찾기
    const movablePieces = await currentPlayerPage.$$(".piece.can-move");
    console.log(
      `📍 ${currentPlayerName} 이동 가능한 말: ${movablePieces.length}개`
    );

    if (movablePieces.length > 0) {
      console.log(`🎯 ${currentPlayerName} 말 이동 시도`);

      // 이동 전 보드 상태
      const before1 = await getBoardState(page1);
      const before2 = await getBoardState(page2);

      console.log("📊 이동 전:");
      console.log("플레이어1:", before1);
      console.log("플레이어2:", before2);

      // 말 클릭
      console.log("🎯 말 클릭 시도");
      await movablePieces[0].click();
      
      // 서버 응답 대기
      console.log("⏳ 말 이동 응답 대기 중...");
      await currentPlayerPage.waitForTimeout(3000);

      // 말 이동이 완료될 때까지 대기
      await currentPlayerPage.waitForFunction(() => {
        const game = window.multiplayerGame;
        return game && game.pieces && game.pieces.W && game.pieces.B;
      }, { timeout: 10000 });

      // 이동 후 보드 상태
      const after1 = await getBoardState(page1);
      const after2 = await getBoardState(page2);

      console.log("📊 이동 후:");
      console.log("플레이어1:", after1);
      console.log("플레이어2:", after2);

      // 동기화 확인
      const synced = JSON.stringify(after1) === JSON.stringify(after2);

      if (synced) {
        console.log("✅ 성공! 말 이동 동기화 완료");

        // 턴 변경 확인
        const turnAfter1 = await page1.evaluate(() =>
          window.multiplayerGame ? window.multiplayerGame.turn : null
        );
        const turnAfter2 = await page2.evaluate(() =>
          window.multiplayerGame ? window.multiplayerGame.turn : null
        );

        console.log(
          `🔄 턴 변경 후 - 플레이어1: ${turnAfter1}, 플레이어2: ${turnAfter2}`
        );

        if (turnAfter1 === turnAfter2) {
          if (turnAfter1 !== currentTurn1) {
            console.log("✅ 턴이 정상적으로 다음 플레이어로 변경됨");
          } else {
            console.log("✅ 같은 플레이어의 추가 턴 유지됨");
          }
        } else {
          console.log("❌ 턴 정보가 동기화되지 않음");
        }
      } else {
        console.log("❌ 실패! 보드 상태가 동기화되지 않음");
        console.log("차이점 분석:");
        console.log(
          "플레이어1 고유:",
          after1.filter(
            (p1) =>
              !after2.some((p2) => p2.idx === p1.idx && p2.side === p1.side)
          )
        );
        console.log(
          "플레이어2 고유:",
          after2.filter(
            (p2) =>
              !after1.some((p1) => p1.idx === p2.idx && p1.side === p2.side)
          )
        );
      }
    } else {
      console.log("⚠️ 이동 가능한 말이 없음 - 주사위를 먼저 굴려야 할 수 있음");

      // 주사위 굴림 시도
      console.log(`🎲 ${currentPlayerName} 주사위 자동 굴림`);
      const rollBtn = await currentPlayerPage.$("#roll");
      if (rollBtn && (await rollBtn.isEnabled())) {
        await currentPlayerPage.click("#roll");
        await currentPlayerPage.waitForTimeout(2000);

        // 다시 이동 가능한 말 확인
        const movablePiecesAfterRoll = await currentPlayerPage.$$(
          ".piece.can-move"
        );
        console.log(
          `📍 주사위 굴린 후 이동 가능한 말: ${movablePiecesAfterRoll.length}개`
        );

        if (movablePiecesAfterRoll.length > 0) {
          console.log(`🎯 ${currentPlayerName} 말 이동 재시도`);
          await movablePiecesAfterRoll[0].click();
          await currentPlayerPage.waitForTimeout(3000);

          // 최종 보드 상태 확인
          const final1 = await getBoardState(page1);
          const final2 = await getBoardState(page2);
          const finalSynced = JSON.stringify(final1) === JSON.stringify(final2);

          console.log(`📊 최종 상태 동기화: ${finalSynced ? "✅" : "❌"}`);
        }
      } else {
        console.log("⚠️ 주사위도 굴릴 수 없음");
      }
    }
  } catch (error) {
    console.error("❌ 말 이동 테스트 오류:", error);
  }
}

async function getBoardState(page) {
  return await page.evaluate(() => {
    const pieces = document.querySelectorAll(".piece");
    return Array.from(pieces)
      .map((piece) => ({
      idx: parseInt(piece.parentElement.dataset.idx),
      side: piece.classList.contains("W") ? "W" : "B",
      }))
      .sort((a, b) => a.idx - b.idx);
  });
}

async function setupWebSocketLogging(page, name) {
  await page.evaluate((playerName) => {
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function (url) {
      const ws = new OriginalWebSocket(url);

      const originalOnMessage = ws.onmessage;
      ws.onmessage = function (event) {
        try {
          const data = JSON.parse(event.data);
          console.log(`📥 ${playerName}: ${data.type}`);

          // 서버 메시지별 상세 로깅
          switch (data.type) {
            case "STICKS_ROLLED":
              console.log(`🎲 ${playerName} STICKS_ROLLED:`, {
                roll: data.data.roll,
                faces: data.data.faces,
                canMove: data.data.canMove,
                turn: data.data.turn,
              });
              break;
            case "PIECE_MOVED":
              console.log(`🎯 ${playerName} PIECE_MOVED:`, {
                move: data.data.move,
                gameState: data.data.gameState ? "포함됨" : "없음",
              });
              break;
            case "TURN_CHANGED":
              console.log(`🔄 ${playerName} TURN_CHANGED:`, {
                newTurn: data.data.newTurn,
                reason: data.data.reason,
              });
              break;
            case "GAME_STARTED":
              console.log(`🎮 ${playerName} GAME_STARTED:`, {
                gameId: data.data.gameId,
                initialTurn: data.data.initialTurn,
              });
              break;
            case "PLAYER_READY":
              console.log(`✅ ${playerName} PLAYER_READY:`, {
                playerId: data.data.playerId,
                isReady: data.data.isReady,
                allReady: data.data.allReady,
              });
              break;
            case "ROOM_JOINED":
              console.log(`🚪 ${playerName} ROOM_JOINED:`, {
                roomId: data.data.roomId,
                players: data.data.players?.length || 0,
              });
              break;
          }
        } catch (e) {
          console.log(`📥 ${playerName} (raw):`, event.data);
        }
        if (originalOnMessage) originalOnMessage.call(this, event);
      };

      const originalSend = ws.send;
      ws.send = function (data) {
        try {
          const message = JSON.parse(data);
          console.log(`📤 ${playerName}: ${message.type}`);

          // 클라이언트 메시지별 상세 로깅
          switch (message.type) {
            case "ROLL_STICKS":
              console.log(`🎲 ${playerName} ROLL_STICKS 전송`);
              break;
            case "MOVE_PIECE":
              console.log(`🐘 ${playerName} MOVE_PIECE:`, {
                move: message.data.move,
              });
              break;
            case "READY_STATUS":
              console.log(`✅ ${playerName} READY_STATUS:`, {
                isReady: message.data.isReady,
              });
              break;
            case "START_GAME":
              console.log(`🎮 ${playerName} START_GAME 전송`);
              break;
          }
        } catch (e) {
          console.log(`📤 ${playerName} (raw):`, data);
        }
        return originalSend.call(this, data);
      };

      return ws;
    };
  }, name);
}

// 🎮 멀티플레이어 동기화 테스트
//
// 이 테스트는 세넷 게임의 멀티플레이어 기능을 종합적으로 검증합니다:
//
// ✅ 테스트하는 기능들:
//   1. 방 생성 및 참가
//   2. 플레이어 준비 상태 동기화
//   3. 게임 시작
//   4. 주사위 굴림 (서버 로직 검증)
//   5. 말 이동 (서버 로직 검증)
//   6. 턴 변경 및 동기화
//   7. WebSocket 메시지 흐름 추적
//
// 🔍 서버 검증 포인트:
//   - HTTP 서버 (포트 8000): 정적 파일 서빙
//   - WebSocket 서버 (포트 8080): 게임 로직 처리
//   - 서버에서 주사위 결과 생성 및 전송
//   - 서버에서 말 이동 유효성 검증 및 상태 업데이트
//   - 양쪽 클라이언트에 동일한 게임 상태 유지
//
// 🚀 실행 방법:
//   1. HTTP 서버 실행: python -m http.server 8000
//   2. Rust WebSocket 서버 실행: cd server/rust/senet-socket-server && cargo run
//   3. 테스트 실행: node test-multiplayer-sync-fixed.js
//      또는: npm run test:multiplayer

console.log("🚀 멀티플레이어 동기화 테스트 시작");
console.log("📋 실행 전 확인사항:");
console.log("   - HTTP 서버 (포트 8000): python -m http.server 8000");
console.log("   - WebSocket 서버 (포트 8080): cargo run");
console.log("   - Playwright 설치: npm install playwright");
console.log("");

testMultiplayerSync().catch(console.error);
