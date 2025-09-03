use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

// ========================= 게임 상태(세넷 규칙) =========================

pub const BOARD_MAX: u8 = 30;
pub const SAFE_SQUARES: [u8; 2] = [15, 26];
pub const WATER_SQUARE: u8 = 27;
pub const EXIT_SQUARE: u8 = 30;
pub const PIECES: usize = 5;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSnapshot {
    pub pieces: HashMap<char, Vec<u8>>, // 'W'/'B' -> 각 말 위치(0=off, 30=exit는 별도 처리)
    pub turn: char,
    pub roll: Option<u8>,
    pub game_over: bool,
    pub last_move: Option<Value>,
}

#[derive(Clone)]
pub struct GameState {
    pub turn: char, // 'W' or 'B'
    pub last_roll: Option<u8>,
    // 0: off, 1..=30: board, 0: exited (JavaScript와 일치)
    pub w: [u8; PIECES],
    pub b: [u8; PIECES],
    pub game_over: bool,
}

impl GameState {
    pub fn new() -> Self {
        let mut g = Self {
            turn: 'W',
            last_roll: None,
            w: [0; PIECES],
            b: [0; PIECES],
            game_over: false,
        };
        // 초기 배치: W=1,3,5,7,9 / B=2,4,6,8,10
        for i in 0..PIECES {
            g.w[i] = 1 + (i as u8) * 2;
        }
        for i in 0..PIECES {
            g.b[i] = 2 + (i as u8) * 2;
        }
        g
    }

    pub fn snapshot(&self) -> GameSnapshot {
        let mut pieces = HashMap::new();
        pieces.insert('W', self.w.to_vec());
        pieces.insert('B', self.b.to_vec());
        GameSnapshot {
            pieces,
            turn: self.turn,
            roll: self.last_roll,
            game_over: self.game_over,
            last_move: None,
        }
    }

    pub fn board_occupant(&self, square: u8) -> Option<(char, usize)> {
        if square == 0 || square > BOARD_MAX {
            return None;
        }
        for i in 0..PIECES {
            if self.w[i] == square {
                return Some(('W', i));
            }
        }
        for i in 0..PIECES {
            if self.b[i] == square {
                return Some(('B', i));
            }
        }
        None
    }

    // JavaScript의 isAdjacentSameColor 함수와 동일한 로직
    pub fn is_adjacent_same_color(&self, idx: u8, side: char) -> bool {
        let left = if idx > 1 {
            self.board_occupant(idx - 1)
        } else {
            None
        };
        let right = if idx < BOARD_MAX {
            self.board_occupant(idx + 1)
        } else {
            None
        };
        (left.map(|(c, _)| c) == Some(side)) || (right.map(|(c, _)| c) == Some(side))
    }

    // JavaScript의 isBlockadeSquare 함수와 동일한 로직
    pub fn is_blockade_square(&self, idx: u8, side: char) -> bool {
        if let Some((c, _)) = self.board_occupant(idx) {
            if c == side {
                return self.is_adjacent_same_color(idx, side);
            }
        }
        false
    }

    // JavaScript의 pathBlockedByOpponent 함수와 동일한 로직
    pub fn has_path_block(&self, from: u8, to: u8, enemy: char) -> bool {
        for s in (from + 1)..=to {
            if self.is_blockade_square(s, enemy) {
                return true;
            }
        }
        false
    }

    pub fn legal_moves(&self, side: char, roll: u8) -> Vec<(usize, u8, u8)> {
        let arr = if side == 'W' { &self.w } else { &self.b };
        let enemy = if side == 'W' { 'B' } else { 'W' };
        let mut v = vec![];

        for (idx, &from) in arr.iter().enumerate() {
            if from == 0 {
                continue; // 이미 탈출한 말
            }

            let dest = from.saturating_add(roll);
            if dest > EXIT_SQUARE {
                continue; // 목적지가 보드를 벗어남
            }

            if self.has_path_block(from, dest, enemy) {
                continue; // 경로가 상대방에 의해 차단됨
            }

            if let Some((c, _)) = self.board_occupant(dest) {
                if c == side {
                    continue; // 같은 색 말이 있음
                }
                // 상대방 말이 있는 경우
                if SAFE_SQUARES.contains(&dest) || self.is_adjacent_same_color(dest, c) {
                    continue; // 안전한 칸이거나 인접한 같은 색 말이 있음
                }
            }

            // 물에 도착하는 경우
            if dest == WATER_SQUARE {
                let s15_free = self.board_occupant(15).is_none();
                let s26_free = self.board_occupant(26).is_none();
                if !(s15_free || s26_free) {
                    continue; // 안전한 칸이 모두 차있음
                }
            }

            v.push((idx, from, dest));
        }
        v
    }

    pub fn roll(&mut self) -> (u8, [u8; 4], bool, bool) {
        // returns: roll, faces, grants_extra_turn_default, can_move
        let mut faces = 0u8;
        let mut vec = [0u8; 4];
        for i in 0..4 {
            let face = rand::thread_rng().gen_bool(0.5) as u8;
            vec[i] = face;
            faces += face;
        }
        let roll = if faces == 0 { 5 } else { faces };
        self.last_roll = Some(roll);
        let legal = self.legal_moves(self.turn, roll);
        let grants = roll == 4 || roll == 5;
        (roll, vec, grants, !legal.is_empty())
    }

    pub fn apply_move(
        &mut self,
        side: char,
        idx: usize,
        from: u8,
        to: u8,
        roll: u8,
    ) -> (bool, bool, bool, Option<(char, usize)>) {
        // 1) 불변 검증
        if self.turn != side {
            return (false, false, false, None);
        }
        if self.last_roll != Some(roll) {
            return (false, false, false, None);
        }
        let cur_from = if side == 'W' {
            self.w.get(idx).copied()
        } else {
            self.b.get(idx).copied()
        };
        if cur_from != Some(from) {
            return (false, false, false, None);
        }
        if to > EXIT_SQUARE {
            return (false, false, false, None);
        }
        let enemy = if side == 'W' { 'B' } else { 'W' };
        if self.has_path_block(from, to, enemy) {
            return (false, false, false, None);
        }

        // 물을 통과했는지 확인 (JavaScript와 동일한 로직)
        let passes_water = ((from + 1)..=to).any(|s| s == WATER_SQUARE);

        // 기본 추가턴 여부 (4 또는 5일 때)
        let mut extra = roll == 4 || roll == 5;

        // 목적지 규칙 사전 계산
        enum Act {
            Exit,
            Water,
            Swap(char, usize),
            Move,
        }

        let action = if to == EXIT_SQUARE {
            // 탈출하는 경우 - 물을 통과했으면 추가턴 취소
            if passes_water {
                extra = false;
            }
            Act::Exit
        } else if to == WATER_SQUARE {
            // 물에 도착하는 경우
            let s15_free = self.board_occupant(15).is_none();
            let s26_free = self.board_occupant(26).is_none();
            if !(s15_free || s26_free) {
                return (false, false, false, None);
            }
            extra = false; // 물에 도착하면 추가턴 취소
            Act::Water
        } else {
            if let Some((c, eidx)) = self.board_occupant(to) {
                if c == side {
                    return (false, false, false, None);
                }
                if SAFE_SQUARES.contains(&to) || self.is_adjacent_same_color(to, c) {
                    return (false, false, false, None);
                }
                // 상대방 말을 잡는 경우 - 물을 통과했으면 추가턴 취소
                if passes_water {
                    extra = false;
                }
                Act::Swap(c, eidx)
            } else {
                // 빈 칸으로 이동하는 경우 - 물을 통과했으면 추가턴 취소
                if passes_water {
                    extra = false;
                }
                Act::Move
            }
        };

        // 2) 가변 갱신
        let mut captured = None;
        match (side, action) {
            ('W', Act::Exit) => {
                self.w[idx] = 0; // JavaScript와 동일하게 0으로 설정
            }
            ('B', Act::Exit) => {
                self.b[idx] = 0; // JavaScript와 동일하게 0으로 설정
            }
            ('W', Act::Water) => {
                let target = if self.board_occupant(15).is_none() {
                    15
                } else {
                    26
                };
                self.w[idx] = target;
            }
            ('B', Act::Water) => {
                let target = if self.board_occupant(15).is_none() {
                    15
                } else {
                    26
                };
                self.b[idx] = target;
            }
            ('W', Act::Move) => {
                self.w[idx] = to;
            }
            ('B', Act::Move) => {
                self.b[idx] = to;
            }
            ('W', Act::Swap(c, eidx)) => {
                self.w[idx] = to;
                if c == 'W' {
                    self.w[eidx] = from;
                } else {
                    self.b[eidx] = from;
                }
                captured = Some((c, eidx));
            }
            ('B', Act::Swap(c, eidx)) => {
                self.b[idx] = to;
                if c == 'W' {
                    self.w[eidx] = from;
                } else {
                    self.b[eidx] = from;
                }
                captured = Some((c, eidx));
            }
            _ => return (false, false, false, None),
        }

        // 승리 판정 (JavaScript와 동일하게 모든 말이 0이면 승리)
        if (0..PIECES).all(|i| self.w[i] == 0) {
            self.game_over = true;
        }
        if (0..PIECES).all(|i| self.b[i] == 0) {
            self.game_over = true;
        }

        (true, extra && !self.game_over, passes_water, captured)
    }
}
