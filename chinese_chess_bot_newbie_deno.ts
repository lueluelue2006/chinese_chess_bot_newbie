import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>中国象棋 - Deno版</title>
    <style>
        :root {
            --cell-size: 50px;
            --piece-size: calc(var(--cell-size) * 0.90);
            --margin: calc(var(--cell-size) / 2);
            --board-width: calc(var(--cell-size) * 9);
            --board-height: calc(var(--cell-size) * 10);
            --body-bg: #daccb4;
            --board-bg: #e6c895;
            --board-line-color: #6a4b3a;
            --river-bg: rgba(106, 75, 58, 0.08);
            --river-color: #a07e64;
            --piece-bg: #fdfcf5;
            --red-color: #d53f3f;
            --black-color: #2c2c2c;
            --select-color: rgba(70, 130, 180, 1);
            --capture-color: rgba(255, 100, 0, 1);
            --dot-color: rgba(40, 160, 80, 0.9);
            --last-move-color: rgba(60, 60, 200, 0.7);
            --info-check-color: #FF4500;
            --info-ai-color: #4682B4;
            --piece-font: 'Kaiti', 'STKaiti', 'Kai', 'SimSun', serif;
            --board-border: 4px;
            --panel-width: 190px;
            --layout-breakpoint: 860px;
            --layout-gap: 20px;
        }

        html, body {
            height: 100%;
            margin: 0;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 0;
        }

        body {
            font-family: 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--body-bg);
            user-select: none;
            box-sizing: border-box;
            width: 100%;
            min-height: 100%;
            padding-top: 15px;
            padding-bottom: 15px;
        }

        #game-wrapper {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: var(--layout-gap);
            padding: 10px;
            box-sizing: border-box;
            flex-wrap: nowrap;
        }

        #info-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: var(--panel-width);
            padding: 10px;
            flex-shrink: 0;
            box-sizing: border-box;
            background-color: rgba(255,255,255, 0.15);
            border-radius: 8px;
            border: 1px solid rgba(0,0,0,0.1);
            min-height: 200px;
        }

        .button-row {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 15px;
            width: 90%;
        }

        h1 {
            margin-top: 5px;
            margin-bottom: 10px;
            text-align: center;
            color: #444;
            font-size: 1.3em;
        }

        #info {
            font-size: 0.95em;
            font-weight: bold;
            min-height: 50px;
            color: #333;
            width: 100%;
            text-align: center;
            padding: 6px 8px;
            background-color: rgba(255, 255, 255, 0.4);
            border-radius: 4px;
            margin-bottom: 0;
            transition: color 0.3s, background-color 0.3s;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .info-check {
            background-color: rgba(255, 69, 0, 0.25) !important;
            color: var(--info-check-color) !important;
        }

        .info-ai {
            background-color: rgba(70, 130, 180, 0.25) !important;
            color: var(--info-ai-color) !important;
        }

        .game-button {
            padding: 8px 12px;
            font-size: 0.9em;
            cursor: pointer;
            background-color: var(--board-line-color);
            color: white;
            border: none;
            border-radius: 4px;
            box-shadow: 1px 2px 4px rgba(0, 0, 0, 0.3);
            transition: background-color 0.2s, transform 0.2s;
            width: 100%;
            text-align: center;
        }

        .game-button:hover {
            background-color: #8a6b5a;
        }

        .game-button:active {
            transform: scale(0.98);
        }

        #board-container {
            position: relative;
            width: var(--board-width);
            height: var(--board-height);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            border: var(--board-border) solid var(--board-line-color);
            box-sizing: content-box;
            touch-action: none;
            background-color: var(--board-line-color);
            flex-shrink: 0;
        }

        #board-canvas {
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
            pointer-events: none;
            display: block;
            background-color: transparent;
        }

        #pieces-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 2;
        }

        .piece, .highlight-dot, .last-move-indicator {
            position: absolute;
            transform: translate(-50%, -50%);
            box-sizing: border-box;
        }

        .piece {
            width: var(--piece-size);
            height: var(--piece-size);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: calc(var(--piece-size) * 0.68);
            font-weight: bold;
            font-family: var(--piece-font);
            line-height: 1;
            cursor: pointer;
            background-color: var(--piece-bg);
            background-image: radial-gradient(circle at 35% 35%, #ffffff, var(--piece-bg) 70%);
            border: calc(var(--cell-size) * 0.02) solid;
            box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.35),
                inset 0 0 0 calc(var(--cell-size) * 0.04) var(--piece-bg),
                inset 0 0 0 calc(var(--cell-size) * 0.065) var(--current-color);
            z-index: 10;
            transition: box-shadow 0.15s ease-out, transform 0.15s ease-out;
            --current-color: grey;
        }

        .piece.red {
            color: var(--red-color);
            border-color: var(--red-color);
            --current-color: var(--red-color);
        }

        .piece.black {
            color: var(--black-color);
            border-color: var(--black-color);
            --current-color: var(--black-color);
        }

        .piece.selected {
            box-shadow: 0 0 calc(var(--cell-size) * 0.18) calc(var(--cell-size) * 0.07) var(--select-color),
                1px 2px 4px rgba(0, 0, 0, 0.2),
                inset 0 0 0 calc(var(--cell-size) * 0.04) var(--piece-bg),
                inset 0 0 0 calc(var(--cell-size) * 0.065) var(--current-color);
            transform: translate(-50%, -50%) scale(1.03);
            z-index: 12;
        }

        .highlight-dot {
            width: calc(var(--piece-size) * 0.25);
            height: calc(var(--piece-size) * 0.25);
            background-color: var(--dot-color);
            border-radius: 50%;
            border: none;
            cursor: pointer;
            z-index: 5;
            box-shadow: 0 0 calc(var(--cell-size) * 0.07) calc(var(--cell-size) * 0.01) var(--dot-color);
        }

        .piece.possible-capture {
            box-shadow: 0 0 calc(var(--cell-size) * 0.18) calc(var(--cell-size) * 0.07) var(--capture-color),
                1px 2px 3px rgba(0, 0, 0, 0.2),
                inset 0 0 0 calc(var(--cell-size) * 0.04) var(--piece-bg),
                inset 0 0 0 calc(var(--cell-size) * 0.065) var(--current-color);
            transform: translate(-50%, -50%) scale(1.01);
            z-index: 11;
        }

        .last-move-indicator {
            width: calc(var(--piece-size) * 1.05);
            height: calc(var(--piece-size) * 1.05);
            border: calc(var(--cell-size) * 0.03) dashed var(--last-move-color);
            border-radius: 50%;
            z-index: 4;
            pointer-events: none;
            opacity: 0.9;
            box-shadow: 0 0 3px var(--last-move-color);
        }

        .last-move-indicator.to-indicator {
            border-style: solid;
            z-index: 11;
            opacity: 0.7;
        }

        @media (max-width: 860px) {
            #game-wrapper {
                flex-direction: column;
                align-items: center;
                padding-top: 30px;
            }

            #info-panel {
                width: auto;
                max-width: 500px;
                min-height: auto;
                padding: 5px 15px;
                order: 1;
            }

            #board-container {
                order: 2;
                margin-bottom: 15px;
            }

            .button-row {
                flex-direction: row;
                gap: 15px;
                margin-top: 8px;
                width: auto;
            }

            .game-button {
                width: auto;
                padding: 6px 15px;
                font-size: 0.85em;
            }

            h1 {
                font-size: 1.2em;
                margin-bottom: 5px;
            }

            #info {
                margin-bottom: 0;
                padding: 4px 10px;
                min-height: 1.8em;
            }
        }
    </style>
</head>
<body>
    <div id="game-wrapper">
        <div id="info-panel">
            <h1>中国象棋</h1>
            <div id="info">红方先行</div>
            <div class="button-row">
                <button id="reset-button" class="game-button">新开局</button>
                <button id="undo-button" class="game-button">悔棋</button>
            </div>
        </div>

        <div id="board-container">
            <canvas id="board-canvas"></canvas>
            <div id="pieces-layer"></div>
        </div>
    </div>

    <script>
        // 游戏配置
        const SEARCH_DEPTH = 4;
        const QUIESCENCE_DEPTH = 4;
        const AI_DELAY = 150;
        
        // 开局阶段棋子价值（前10回合）
        const OPENING_VALUES = {
            'G': 20000,
            'R': 1000,
            'C': 600,
            'H': 500,
            'E': 100,
            'A': 100,
            'S': 100,
        };
        
        // 中局阶段棋子价值（原始值）
        const MIDGAME_VALUES = {
            'G': 20000,
            'R': 900,
            'C': 450,
            'H': 400,
            'E': 150,
            'A': 150,
            'S': 100,
        };
        
        // 残局阶段棋子价值（双方大子都少于3个）
        const ENDGAME_VALUES = {
            'G': 20000,
            'R': 1500,
            'C': 550,
            'H': 700,
            'E': 250,
            'A': 250,
            'S': 150,
        };
        
        const SOLDIER_CROSS_RIVER_BONUS = 80;
        
        // 位置价值表
        const POSITION_VALUES = {
            'R': [ // 车
                [14, 14, 12, 18, 16, 18, 12, 14, 14],
                [16, 20, 18, 24, 26, 24, 18, 20, 16],
                [12, 12, 12, 18, 18, 18, 12, 12, 12],
                [12, 18, 16, 22, 22, 22, 16, 18, 12],
                [12, 14, 12, 18, 18, 18, 12, 14, 12],
                [12, 16, 14, 20, 20, 20, 14, 16, 12],
                [6, 10, 8, 14, 14, 14, 8, 10, 6],
                [4, 8, 6, 14, 12, 14, 6, 8, 4],
                [8, 4, 8, 16, 8, 16, 8, 4, 8],
                [-2, 10, 6, 14, 12, 14, 6, 10, -2]
            ],
            'H': [ // 马
                [4, 8, 16, 12, 4, 12, 16, 8, 4],
                [4, 10, 28, 16, 8, 16, 28, 10, 4],
                [12, 14, 16, 20, 18, 20, 16, 14, 12],
                [8, 24, 18, 24, 20, 24, 18, 24, 8],
                [6, 16, 14, 18, 16, 18, 14, 16, 6],
                [4, 12, 16, 14, 12, 14, 16, 12, 4],
                [2, 6, 8, 6, 10, 6, 8, 6, 2],
                [4, 2, 8, 8, 4, 8, 8, 2, 4],
                [0, 2, 4, 4, -2, 4, 4, 2, 0],
                [0, -4, 0, 0, 0, 0, 0, -4, 0]
            ],
            'C': [ // 炮
                [6, 4, 0, -10, -12, -10, 0, 4, 6],
                [2, 2, 0, -4, -14, -4, 0, 2, 2],
                [2, 2, 0, -10, -8, -10, 0, 2, 2],
                [0, 0, -2, 4, 10, 4, -2, 0, 0],
                [0, 0, 0, 2, 8, 2, 0, 0, 0],
                [-2, 0, 4, 2, 6, 2, 4, 0, -2],
                [0, 0, 0, 2, 4, 2, 0, 0, 0],
                [4, 0, 8, 6, 10, 6, 8, 0, 4],
                [0, 2, 4, 6, 6, 6, 4, 2, 0],
                [0, 0, 2, 6, 6, 6, 2, 0, 0]
            ],
            'S': [ // 兵/卒
                [0, 3, 6, 9, 12, 9, 6, 3, 0],
                [18, 36, 56, 80, 120, 80, 56, 36, 18],
                [14, 26, 42, 60, 80, 60, 42, 26, 14],
                [10, 20, 30, 34, 40, 34, 30, 20, 10],
                [6, 12, 18, 18, 20, 18, 18, 12, 6],
                [2, 0, 8, 0, 8, 0, 8, 0, 2],
                [0, 0, -2, 0, 4, 0, -2, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0]
            ],
            'E': [ // 相/象
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 20, 0, 0, 0, 20, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [18, 0, 0, 0, 23, 0, 0, 0, 18],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 20, 0, 0, 0, 20, 0, 0]
            ],
            'A': [ // 仕/士
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 20, 0, 20, 0, 0, 0],
                [0, 0, 0, 0, 23, 0, 0, 0, 0],
                [0, 0, 0, 20, 0, 20, 0, 0, 0]
            ],
            'G': [ // 将/帅
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 8, 8, 8, 0, 0, 0],
                [0, 0, 0, 8, 8, 8, 0, 0, 0],
                [0, 0, 0, 15, 20, 15, 0, 0, 0]
            ]
        };

        // 游戏状态
        const COLS = 9;
        const ROWS = 10;
        const INITIAL_BOARD = [
            ['bR', 'bH', 'bE', 'bA', 'bG', 'bA', 'bE', 'bH', 'bR'],
            [null, null, null, null, null, null, null, null, null],
            [null, 'bC', null, null, null, null, null, 'bC', null],
            ['bS', null, 'bS', null, 'bS', null, 'bS', null, 'bS'],
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            ['rS', null, 'rS', null, 'rS', null, 'rS', null, 'rS'],
            [null, 'rC', null, null, null, null, null, 'rC', null],
            [null, null, null, null, null, null, null, null, null],
            ['rR', 'rH', 'rE', 'rA', 'rG', 'rA', 'rE', 'rH', 'rR']
        ];

        const PIECE_MAP = {
            'rG': '帅', 'rA': '仕', 'rE': '相', 'rH': '马', 'rR': '车', 'rC': '炮', 'rS': '兵',
            'bG': '将', 'bA': '士', 'bE': '象', 'bH': '马', 'bR': '车', 'bC': '砲', 'bS': '卒'
        };

        const COLOR_MAP = { 'r': 'red', 'b': 'black' };
        const COLOR_NAME = { 'red': '红方', 'black': '黑方' };

        // 全局变量
        let boardData = [];
        let currentPlayer = 'red';
        let selectedPiece = null;
        let possibleMoves = [];
        let isGameOver = false;
        let redGeneralPos = { x: 4, y: 9 };
        let blackGeneralPos = { x: 4, y: 0 };
        let lastMove = null;
        let isAiThinking = false;
        let gameStateHistory = [];
        let aiColor = 'black';
        let moveHistory = [];
        let killerMoves = Array(10).fill(null).map(() => [null, null]);
        let historyTable = {};

        // DOM元素
        const boardContainer = document.getElementById('board-container');
        const canvas = document.getElementById('board-canvas');
        const ctx = canvas.getContext('2d');
        const piecesLayer = document.getElementById('pieces-layer');
        const infoDiv = document.getElementById('info');
        const resetButton = document.getElementById('reset-button');
        const undoButton = document.getElementById('undo-button');

        let cellSize, margin, canvasWidth, canvasHeight;
        const dpr = window.devicePixelRatio || 1;

        // 工具函数
        const getPiece = (x, y, board = boardData) => (isValidCoord(x, y) ? board[y]?.[x] : null);
        const isEmpty = (x, y, board = boardData) => (isValidCoord(x, y) && board[y]?.[x] === null);
        const isEnemy = (x, y, color, board = boardData) => {
            const piece = getPiece(x, y, board);
            return piece && piece[0] !== color[0];
        };
        const isAlly = (x, y, color, board = boardData) => {
            const piece = getPiece(x, y, board);
            return piece && piece[0] === color[0];
        };
        const isValidCoord = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
        const isRedPalace = (x, y) => x >= 3 && x <= 5 && y >= 7 && y <= 9;
        const isBlackPalace = (x, y) => x >= 3 && x <= 5 && y >= 0 && y <= 2;
        const isRedSide = (y) => y >= 5;
        const isBlackSide = (y) => y <= 4;
        const copyBoard = (board) => board.map(row => [...row]);

        // 棋盘设置
        function setupBoardDimensions() {
            const gameWrapper = document.getElementById('game-wrapper');
            const infoPanel = document.getElementById('info-panel');
            const wrapperStyle = window.getComputedStyle(gameWrapper);
            const panelRect = infoPanel.getBoundingClientRect();
            const currentWidth = window.innerWidth;
            const currentHeight = window.innerHeight;
            const paddingWindowHorizontal = 20;
            const paddingWindowVertical = 40;
            const LAYOUT_GAP = 20;
            const BOARD_BORDER_WIDTH = 4;

            let availableWidth, availableHeight;

            if (wrapperStyle.flexDirection === 'column') {
                const headerHeight = panelRect.height;
                availableWidth = currentWidth - paddingWindowHorizontal;
                availableHeight = currentHeight - headerHeight - LAYOUT_GAP - paddingWindowVertical;
            } else {
                const panelWidth = panelRect.width;
                availableWidth = currentWidth - panelWidth - LAYOUT_GAP - paddingWindowHorizontal;
                availableHeight = currentHeight - paddingWindowVertical;
            }

            availableWidth = Math.max(150, availableWidth - BOARD_BORDER_WIDTH * 2);
            availableHeight = Math.max(150, availableHeight - BOARD_BORDER_WIDTH * 2);

            const cellW = availableWidth / COLS;
            const cellH = availableHeight / ROWS;
            const MAX_CELL_SIZE = 80;
            const MIN_CELL_SIZE = 25;
            let calculatedCellSize = Math.min(cellW, cellH, MAX_CELL_SIZE);
            cellSize = Math.floor(Math.max(MIN_CELL_SIZE, calculatedCellSize));

            margin = cellSize / 2;
            canvasWidth = cellSize * COLS;
            canvasHeight = cellSize * ROWS;

            const root = document.documentElement;
            root.style.setProperty('--cell-size', \`\${cellSize}px\`);
            root.style.setProperty('--board-width', \`\${canvasWidth}px\`);
            root.style.setProperty('--board-height', \`\${canvasHeight}px\`);

            canvas.width = Math.round(canvasWidth * dpr);
            canvas.height = Math.round(canvasHeight * dpr);
            canvas.style.width = \`\${canvasWidth}px\`;
            canvas.style.height = \`\${canvasHeight}px\`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // 绘制棋盘
        function drawBoard() {
            const BOARD_BG_COLOR = '#e6c895';
            const BOARD_LINE_COLOR = '#6a4b3a';
            const RIVER_BG = 'rgba(106, 75, 58, 0.08)';
            const RIVER_COLOR = '#a07e64';

            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.fillStyle = BOARD_BG_COLOR;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // 河界
            ctx.fillStyle = RIVER_BG;
            ctx.fillRect(margin, margin + 4 * cellSize, cellSize * (COLS - 1), cellSize);

            ctx.strokeStyle = BOARD_LINE_COLOR;
            ctx.lineWidth = Math.max(1, Math.round(cellSize * 0.025 * dpr) / dpr);
            
            // 河界文字
            ctx.save();
            ctx.font = \`bold \${Math.max(12, cellSize * 0.5)}px serif\`;
            ctx.fillStyle = RIVER_COLOR;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const riverText = (cellSize < 35) ? "楚 河 漢 界" : "楚  河         漢  界";
            ctx.fillText(riverText, margin + (cellSize * (COLS - 1)) / 2, margin + 4.5 * cellSize);
            ctx.restore();

            // 画网格线
            for (let i = 1; i < ROWS - 1; i++) {
                if (i === 4 || i === 5) continue;
                ctx.beginPath();
                ctx.moveTo(margin, Math.round(margin + i * cellSize));
                ctx.lineTo(margin + (cellSize * (COLS - 1)), Math.round(margin + i * cellSize));
                ctx.stroke();
            }

            // 河界线
            ctx.beginPath();
            ctx.moveTo(margin, Math.round(margin + 4 * cellSize));
            ctx.lineTo(margin + (cellSize * (COLS - 1)), Math.round(margin + 4 * cellSize));
            ctx.moveTo(margin, Math.round(margin + 5 * cellSize));
            ctx.lineTo(margin + (cellSize * (COLS - 1)), Math.round(margin + 5 * cellSize));
            ctx.stroke();

            // 竖线
            for (let i = 1; i < COLS - 1; i++) {
                const xPos = Math.round(margin + i * cellSize);
                ctx.beginPath();
                ctx.moveTo(xPos, margin);
                ctx.lineTo(xPos, Math.round(margin + 4 * cellSize));
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(xPos, Math.round(margin + 5 * cellSize));
                ctx.lineTo(xPos, margin + (cellSize * (ROWS - 1)));
                ctx.stroke();
            }

            // 外框
            ctx.save();
            ctx.lineWidth = Math.max(1.5, Math.round(cellSize * 0.035 * dpr) / dpr);
            ctx.strokeRect(margin - ctx.lineWidth / 2, margin - ctx.lineWidth / 2, 
                          (cellSize * (COLS - 1)) + ctx.lineWidth, (cellSize * (ROWS - 1)) + ctx.lineWidth);
            ctx.restore();

            // 九宫格
            drawCross(3, 0, 5, 2); // 黑方
            drawCross(3, 7, 5, 9); // 红方

            // 炮位和兵位标记
            ctx.lineWidth = Math.max(0.8, Math.round(cellSize * 0.018 * dpr) / dpr);
            drawMarker(1, 2);
            drawMarker(7, 2);
            drawMarker(1, 7);
            drawMarker(7, 7);

            for (let i = 0; i <= 8; i += 2) {
                drawMarker(i, 3, i > 0, i < COLS - 1);
                drawMarker(i, 6, i > 0, i < COLS - 1);
            }
        }

        function drawCross(x1, y1, x2, y2) {
            ctx.beginPath();
            ctx.moveTo(margin + x1 * cellSize, margin + y1 * cellSize);
            ctx.lineTo(margin + x2 * cellSize, margin + y2 * cellSize);
            ctx.moveTo(margin + x2 * cellSize, margin + y1 * cellSize);
            ctx.lineTo(margin + x1 * cellSize, margin + y2 * cellSize);
            ctx.stroke();
        }

        function drawMarker(x, y, drawLeft = true, drawRight = true) {
            const len = cellSize / 5.5;
            const gap = cellSize / 8;
            const cx = margin + x * cellSize;
            const cy = margin + y * cellSize;
            
            if (drawLeft && x > 0 && y > 0) drawCorner(cx, cy, -1, -1, gap, len);
            if (drawRight && x < COLS - 1 && y > 0) drawCorner(cx, cy, 1, -1, gap, len);
            if (drawLeft && x > 0 && y < ROWS - 1) drawCorner(cx, cy, -1, 1, gap, len);
            if (drawRight && x < COLS - 1 && y < ROWS - 1) drawCorner(cx, cy, 1, 1, gap, len);
        }

        function drawCorner(cx, cy, dx, dy, gap, len) {
            ctx.beginPath();
            ctx.moveTo(cx + dx * gap, cy + dy * gap);
            ctx.lineTo(cx + dx * (gap + len), cy + dy * gap);
            ctx.moveTo(cx + dx * gap, cy + dy * gap);
            ctx.lineTo(cx + dx * gap, cy + dy * (gap + len));
            ctx.stroke();
        }

        // 刷新棋盘
        function refreshBoard() {
            setupBoardDimensions();
            drawBoard();
            render();
        }

        // 渲染棋子和UI
        function render() {
            piecesLayer.innerHTML = '';

            // 上一步移动标记
            if (lastMove) {
                const indicator = document.createElement('div');
                indicator.className = 'last-move-indicator';
                indicator.style.left = \`\${margin + lastMove.fromX * cellSize}px\`;
                indicator.style.top = \`\${margin + lastMove.fromY * cellSize}px\`;
                piecesLayer.appendChild(indicator);

                const toIndicator = document.createElement('div');
                toIndicator.className = 'last-move-indicator to-indicator';
                toIndicator.style.left = \`\${margin + lastMove.toX * cellSize}px\`;
                toIndicator.style.top = \`\${margin + lastMove.toY * cellSize}px\`;
                piecesLayer.appendChild(toIndicator);
            }

            // 可能的移动点
            if (!isAiThinking) {
                possibleMoves.forEach(move => {
                    if (isEmpty(move.x, move.y)) {
                        const dot = document.createElement('div');
                        dot.classList.add('highlight-dot');
                        dot.style.left = \`\${margin + move.x * cellSize}px\`;
                        dot.style.top = \`\${margin + move.y * cellSize}px\`;
                        dot.onclick = (event) => {
                            event.stopPropagation();
                            handleClick(move.x, move.y);
                        };
                        piecesLayer.appendChild(dot);
                    }
                });
            }

            // 渲染棋子
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const pieceCode = boardData[y][x];
                    if (pieceCode) {
                        const pieceDiv = document.createElement('div');
                        pieceDiv.className = \`piece \${COLOR_MAP[pieceCode[0]]}\`;
                        pieceDiv.textContent = PIECE_MAP[pieceCode];
                        pieceDiv.style.left = \`\${margin + x * cellSize}px\`;
                        pieceDiv.style.top = \`\${margin + y * cellSize}px\`;

                        if (!isAiThinking) {
                            if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
                                pieceDiv.classList.add('selected');
                            }
                            if (possibleMoves.some(move => move.x === x && move.y === y)) {
                                pieceDiv.classList.add('possible-capture');
                            }
                        }

                        pieceDiv.onclick = (event) => {
                            event.stopPropagation();
                            handleClick(x, y);
                        };
                        piecesLayer.appendChild(pieceDiv);
                    }
                }
            }
            updateInfo();
        }

        // 更新信息显示
        function updateInfo() {
            infoDiv.classList.remove('info-check', 'info-ai');
            if (isGameOver) return;

            if (isAiThinking) {
                infoDiv.innerHTML = \`⏳ AI (\${COLOR_NAME[aiColor]})<br>思考中...\`;
                infoDiv.classList.add('info-ai');
                return;
            }

            let checkMsg = "";
            infoDiv.style.color = currentPlayer === 'red' ? '#d53f3f' : '#2c2c2c';

            if (isGeneralInCheck(currentPlayer, boardData)) {
                checkMsg = " - 将军!";
                infoDiv.classList.add('info-check');
                const allMoves = getAllPossibleMoves(currentPlayer, boardData, redGeneralPos, blackGeneralPos);
                if (allMoves.length === 0) {
                    isGameOver = true;
                    const winner = currentPlayer === 'red' ? 'black' : 'red';
                    infoDiv.textContent = \`\${COLOR_NAME[winner]} 获胜 (将死)! 🎉\`;
                    infoDiv.style.color = winner === 'red' ? '#d53f3f' : '#2c2c2c';
                    return;
                }
            }

            let playerType = currentPlayer === aiColor ? " (AI)" : "";
            infoDiv.textContent = \`当前: \${COLOR_NAME[currentPlayer]}\${playerType}\${checkMsg}\`;
        }

        // 游戏初始化
        function initGame() {
            boardData = copyBoard(INITIAL_BOARD);
            currentPlayer = 'red';
            selectedPiece = null;
            possibleMoves = [];
            isGameOver = false;
            lastMove = null;
            isAiThinking = false;
            redGeneralPos = { x: 4, y: 9 };
            blackGeneralPos = { x: 4, y: 0 };
            gameStateHistory = [];
            moveHistory = []; // Reset move history
            killerMoves = Array(10).fill(null).map(() => [null, null]); // Reset killer moves
            historyTable = {}; // Reset history table
            
            infoDiv.style.color = '#d53f3f';
            infoDiv.classList.remove('info-check');
            infoDiv.textContent = '红方先行';
            
            saveGameState();
            refreshBoard();
            
            // 如果AI执红先行
            if (aiColor === 'red') {
                setTimeout(() => triggerAIMove(), 500);
            }
        }

        // 点击处理
        function handleClick(x, y) {
            if (isGameOver || isAiThinking || currentPlayer === aiColor) return;

            const clickedPieceCode = getPiece(x, y);
            const clickedColor = clickedPieceCode ? COLOR_MAP[clickedPieceCode[0]] : null;

            if (selectedPiece) {
                if (possibleMoves.some(move => move.x === x && move.y === y)) {
                    movePiece(selectedPiece.x, selectedPiece.y, x, y);
                } else if (clickedColor === currentPlayer) {
                    if (selectedPiece.x === x && selectedPiece.y === y) {
                        selectedPiece = null;
                        possibleMoves = [];
                    } else {
                        selectPiece(x, y, clickedPieceCode);
                    }
                } else {
                    selectedPiece = null;
                    possibleMoves = [];
                }
            } else {
                if (clickedColor === currentPlayer) {
                    selectPiece(x, y, clickedPieceCode);
                }
            }
            
            render();
            
            if (!isGameOver && currentPlayer === aiColor && !isAiThinking) {
                setTimeout(() => triggerAIMove(), AI_DELAY);
            }
        }

        // 选择棋子
        function selectPiece(x, y, pieceCode) {
            selectedPiece = { x, y, piece: pieceCode };
            const rawMoves = getRawMoves(x, y, pieceCode, boardData);
            possibleMoves = rawMoves.filter(move => 
                isMoveLegal(x, y, move.x, move.y, copyBoard(boardData), currentPlayer, redGeneralPos, blackGeneralPos)
            );
        }

        // 保存游戏状态
        function saveGameState() {
            const state = {
                boardData: copyBoard(boardData),
                currentPlayer: currentPlayer,
                redGeneralPos: { ...redGeneralPos },
                blackGeneralPos: { ...blackGeneralPos },
                lastMove: lastMove ? { ...lastMove } : null,
                moveHistory: [...moveHistory],
                isGameOver: isGameOver
            };
            gameStateHistory.push(state);
            
            if (gameStateHistory.length > 100) {
                gameStateHistory.shift();
            }
        }

        // 悔棋
        function undoMove() {
            if (isAiThinking || gameStateHistory.length === 0) return;
            
            let undoSteps = 1;
            if (gameStateHistory.length > 1) {
                const lastState = gameStateHistory[gameStateHistory.length - 1];
                if (lastState.currentPlayer !== aiColor) {
                    undoSteps = 2;
                }
            }
            
            for (let i = 0; i < undoSteps && gameStateHistory.length > 0; i++) {
                gameStateHistory.pop();
            }
            
            if (gameStateHistory.length > 0) {
                const previousState = gameStateHistory[gameStateHistory.length - 1];
                boardData = copyBoard(previousState.boardData);
                currentPlayer = previousState.currentPlayer;
                redGeneralPos = { ...previousState.redGeneralPos };
                blackGeneralPos = { ...previousState.blackGeneralPos };
                lastMove = previousState.lastMove ? { ...previousState.lastMove } : null;
                moveHistory = [...previousState.moveHistory];
                isGameOver = previousState.isGameOver;
                
                selectedPiece = null;
                possibleMoves = [];
                render();
            } else {
                initGame();
            }
        }

        // 移动棋子
        function movePiece(fromX, fromY, toX, toY) {
            saveGameState();
            
            const movingPiece = boardData[fromY][fromX];
            const targetPiece = boardData[toY][toX];
            lastMove = { fromX, fromY, toX, toY };
            boardData[toY][toX] = movingPiece;
            boardData[fromY][fromX] = null;
            
            // Track move history
            moveHistory.push({ fromX, fromY, toX, toY });

            if (movingPiece && movingPiece[1] === 'G') {
                const color = movingPiece[0] === 'r' ? 'red' : 'black';
                if (color === 'red') redGeneralPos = { x: toX, y: toY };
                else blackGeneralPos = { x: toX, y: toY };
            }

            if (targetPiece && targetPiece[1] === 'G') {
                isGameOver = true;
                const winnerColor = movingPiece[0] === 'r' ? 'red' : 'black';
                infoDiv.textContent = \`\${COLOR_NAME[winnerColor]} 获胜! 🎉\`;
                infoDiv.style.color = winnerColor === 'red' ? '#d53f3f' : '#2c2c2c';
                infoDiv.classList.remove('info-check');
            }

            selectedPiece = null;
            possibleMoves = [];
            
            if (!isGameOver) {
                currentPlayer = (currentPlayer === 'red' ? 'black' : 'red');
            }
        }

        // 检查合法性
        function isMoveLegal(fromX, fromY, toX, toY, currentBoard, color, rG, bG) {
            const movingPiece = currentBoard[fromY][fromX];
            if (!movingPiece) return false;
            
            const originalTarget = currentBoard[toY][toX];
            let tempRedG = { ...rG };
            let tempBlackG = { ...bG };
            
            currentBoard[toY][toX] = movingPiece;
            currentBoard[fromY][fromX] = null;
            
            if (movingPiece === 'rG') tempRedG = { x: toX, y: toY };
            if (movingPiece === 'bG') tempBlackG = { x: toX, y: toY };
            
            const isInCheck = isGeneralInCheck(color, currentBoard, tempRedG, tempBlackG);
            return !isInCheck;
        }

        // 检查将军
        function isGeneralInCheck(color, board, rG = redGeneralPos, bG = blackGeneralPos) {
            const myGeneralPos = color === 'red' ? rG : bG;
            const opponentColorChar = color === 'red' ? 'b' : 'r';
            const opponentGeneralPos = color === 'red' ? bG : rG;
            
            if (!myGeneralPos || !opponentGeneralPos || 
                !getPiece(myGeneralPos.x, myGeneralPos.y, board) || 
                !getPiece(opponentGeneralPos.x, opponentGeneralPos.y, board)) return false;

            // 将帅对面检查
            if (myGeneralPos.x === opponentGeneralPos.x) {
                let clearPath = true;
                const minY = Math.min(myGeneralPos.y, opponentGeneralPos.y);
                const maxY = Math.max(myGeneralPos.y, opponentGeneralPos.y);
                for (let y = minY + 1; y < maxY; y++) {
                    if (board[y][myGeneralPos.x] !== null) {
                        clearPath = false;
                        break;
                    }
                }
                if (clearPath) return true;
            }

            // 检查其他棋子是否攻击将军
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const piece = board[y][x];
                    if (piece && piece[0] === opponentColorChar && piece[1] !== 'G') {
                        const opponentMoves = getRawMoves(x, y, piece, board);
                        if (opponentMoves.some(move => move.x === myGeneralPos.x && move.y === myGeneralPos.y)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        // 获取棋子可能的移动
        function getRawMoves(x, y, pieceCode, board) {
            let moves = [];
            if (!pieceCode) return moves;
            
            const color = pieceCode[0];
            const type = pieceCode[1];
            const targetColor = COLOR_MAP[color];
            
            const addMove = (nx, ny) => {
                if (!isValidCoord(nx, ny)) return false;
                const target = getPiece(nx, ny, board);
                if (!target) {
                    moves.push({ x: nx, y: ny });
                    return true;
                } else if (target[0] !== color) {
                    moves.push({ x: nx, y: ny });
                    return false;
                }
                return false;
            };

            const checkAndAdd = (nx, ny) => {
                if (isValidCoord(nx, ny) && !isAlly(nx, ny, targetColor, board)) {
                    moves.push({ x: nx, y: ny });
                }
            };

            switch (type) {
                case 'R': // 车
                    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                    directions.forEach(([dx, dy]) => {
                        for (let i = 1; i < Math.max(ROWS, COLS); i++) {
                            const nx = x + i * dx;
                            const ny = y + i * dy;
                            if (!isValidCoord(nx, ny) || !addMove(nx, ny)) break;
                        }
                    });
                    break;

                case 'C': // 炮
                    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                    dirs.forEach(([dx, dy]) => {
                        let hasMount = false;
                        for (let i = 1; i < Math.max(ROWS, COLS); i++) {
                            const nx = x + i * dx;
                            const ny = y + i * dy;
                            if (!isValidCoord(nx, ny)) break;
                            const target = getPiece(nx, ny, board);
                            if (!hasMount) {
                                if (!target) moves.push({ x: nx, y: ny });
                                else hasMount = true;
                            } else {
                                if (target) {
                                    if (target[0] !== color) moves.push({ x: nx, y: ny });
                                    break;
                                }
                            }
                        }
                    });
                    break;

                case 'H': // 马
                    const horseSteps = [
                        { move: [1, 2], leg: [0, 1] },
                        { move: [1, -2], leg: [0, -1] },
                        { move: [-1, 2], leg: [0, 1] },
                        { move: [-1, -2], leg: [0, -1] },
                        { move: [2, 1], leg: [1, 0] },
                        { move: [2, -1], leg: [1, 0] },
                        { move: [-2, 1], leg: [-1, 0] },
                        { move: [-2, -1], leg: [-1, 0] }
                    ];
                    horseSteps.forEach(({ move, leg }) => {
                        const legX = x + leg[0];
                        const legY = y + leg[1];
                        if (isValidCoord(legX, legY) && isEmpty(legX, legY, board)) {
                            checkAndAdd(x + move[0], y + move[1]);
                        }
                    });
                    break;

                case 'E': // 相/象
                    const eleSteps = [
                        { move: [2, 2], eye: [1, 1] },
                        { move: [2, -2], eye: [1, -1] },
                        { move: [-2, 2], eye: [-1, 1] },
                        { move: [-2, -2], eye: [-1, -1] }
                    ];
                    eleSteps.forEach(({ move, eye }) => {
                        const nx = x + move[0];
                        const ny = y + move[1];
                        if ((color === 'r' && !isRedSide(ny)) || (color === 'b' && !isBlackSide(ny))) return;
                        if (!isValidCoord(nx, ny)) return;
                        const eyeX = x + eye[0];
                        const eyeY = y + eye[1];
                        if (isValidCoord(eyeX, eyeY) && isEmpty(eyeX, eyeY, board)) {
                            checkAndAdd(nx, ny);
                        }
                    });
                    break;

                case 'A': // 仕/士
                    const advMoves = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
                    advMoves.forEach(([dx, dy]) => {
                        const nx = x + dx;
                        const ny = y + dy;
                        const inPalace = (color === 'r' && isRedPalace(nx, ny)) || (color === 'b' && isBlackPalace(nx, ny));
                        if (inPalace) checkAndAdd(nx, ny);
                    });
                    break;

                case 'G': // 将/帅
                    const genMoves = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                    genMoves.forEach(([dx, dy]) => {
                        const nx = x + dx;
                        const ny = y + dy;
                        const inPalace = (color === 'r' && isRedPalace(nx, ny)) || (color === 'b' && isBlackPalace(nx, ny));
                        if (inPalace) checkAndAdd(nx, ny);
                    });
                    break;

                case 'S': // 兵/卒
                    if (color === 'r') {
                        checkAndAdd(x, y - 1);
                        if (!isRedSide(y)) {
                            checkAndAdd(x - 1, y);
                            checkAndAdd(x + 1, y);
                        }
                    } else {
                        checkAndAdd(x, y + 1);
                        if (!isBlackSide(y)) {
                            checkAndAdd(x - 1, y);
                            checkAndAdd(x + 1, y);
                        }
                    }
                    break;
            }
            return moves;
        }

        // AI相关函数
        
        // 判断游戏阶段
        function getGamePhase(board) {
            // 计算回合数
            const totalMoves = moveHistory.length;
            if (totalMoves < 20) { // 前10个回合（每方10步）
                return 'opening';
            }
            
            // 计算双方大子数量
            let redMajorPieces = 0;
            let blackMajorPieces = 0;
            
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const piece = board[y][x];
                    if (!piece) continue;
                    const type = piece[1];
                    if (type === 'R' || type === 'H' || type === 'C') {
                        if (piece[0] === 'r') {
                            redMajorPieces++;
                        } else {
                            blackMajorPieces++;
                        }
                    }
                }
            }
            
            // 如果双方大子都少于3个，进入残局
            if (redMajorPieces < 3 && blackMajorPieces < 3) {
                return 'endgame';
            }
            
            return 'midgame';
        }
        
        // 获取棋子价值
        function getPieceValue(type, x, y, colorChar, gamePhase) {
            let baseValue = 0;
            
            // 根据游戏阶段选择基础价值
            switch (gamePhase) {
                case 'opening':
                    baseValue = OPENING_VALUES[type] || 0;
                    // 开局阶段兵的特殊价值
                    if (type === 'S') {
                        if (x === 0 || x === 8) {
                            baseValue = 100; // 边兵
                        } else if (x === 2 || x === 6) {
                            baseValue = 130; // 3路和7路兵
                        } else if (x === 4) {
                            baseValue = 160; // 中兵
                        }
                    }
                    break;
                case 'midgame':
                    baseValue = MIDGAME_VALUES[type] || 0;
                    break;
                case 'endgame':
                    baseValue = ENDGAME_VALUES[type] || 0;
                    break;
            }
            
            return baseValue;
        }
        
        // 计算士象完整奖励
        function getAdvisorElephantBonus(board, colorChar, gamePhase) {
            let advisorCount = 0;
            let elephantCount = 0;
            
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const piece = board[y][x];
                    if (piece && piece[0] === colorChar) {
                        if (piece[1] === 'A') advisorCount++;
                        if (piece[1] === 'E') elephantCount++;
                    }
                }
            }
            
            // 中局阶段：士象都完整有100分奖励
            if (gamePhase === 'midgame' && advisorCount === 2 && elephantCount === 2) {
                return 100;
            }
            
            return 0;
        }

        function getAllPossibleMoves(color, board, rG, bG) {
            const moves = [];
            const colorChar = color[0];
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const piece = board[y][x];
                    if (piece && piece[0] === colorChar) {
                        const rawMoves = getRawMoves(x, y, piece, board);
                        rawMoves.forEach(move => {
                            if (isMoveLegal(x, y, move.x, move.y, copyBoard(board), color, rG, bG)) {
                                moves.push({ fromX: x, fromY: y, toX: move.x, toY: move.y });
                            }
                        });
                    }
                }
            }
            return moves;
        }

        function performVirtualMove(board, move, rG, bG) {
            const newBoard = copyBoard(board);
            const newRG = { ...rG };
            const newBG = { ...bG };
            const piece = newBoard[move.fromY][move.fromX];
            
            if (!piece) return { board: newBoard, rG: newRG, bG: newBG };
            
            newBoard[move.toY][move.toX] = piece;
            newBoard[move.fromY][move.fromX] = null;
            
            if (piece === 'rG') {
                newRG.x = move.toX;
                newRG.y = move.toY;
            } else if (piece === 'bG') {
                newBG.x = move.toX;
                newBG.y = move.toY;
            }
            
            return { board: newBoard, rG: newRG, bG: newBG };
        }

        function evaluateBoard(board, rG, bG) {
            let score = 0;
            if (!getPiece(rG.x, rG.y, board)) return -50000;
            if (!getPiece(bG.x, bG.y, board)) return 50000;
            
            // 获取当前游戏阶段
            const gamePhase = getGamePhase(board);
            
            // Material and position evaluation
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const piece = board[y][x];
                    if (!piece) continue;
                    const colorChar = piece[0];
                    const type = piece[1];
                    
                    // 获取基于游戏阶段的棋子价值
                    let pieceValue = getPieceValue(type, x, y, colorChar, gamePhase);
                    
                    // Add position value
                    if (POSITION_VALUES[type]) {
                        const posY = colorChar === 'r' ? y : (9 - y);
                        const posValue = POSITION_VALUES[type][posY][x];
                        pieceValue += posValue;
                    }
                    
                    // Special bonuses for soldiers
                    if (type === 'S') {
                        if (colorChar === 'r' && !isRedSide(y)) {
                            pieceValue += SOLDIER_CROSS_RIVER_BONUS + (4 - y) * 5;
                            if (x >= 3 && x <= 5) pieceValue += 15; // Center file bonus
                        }
                        if (colorChar === 'b' && !isBlackSide(y)) {
                            pieceValue += SOLDIER_CROSS_RIVER_BONUS + (y - 5) * 5;
                            if (x >= 3 && x <= 5) pieceValue += 15;
                        }
                    }
                    
                    // Mobility bonus (simple version)
                    if (type === 'R' || type === 'H' || type === 'C') {
                        const moves = getRawMoves(x, y, piece, board);
                        pieceValue += moves.length * 2; // 2 points per legal move
                    }
                    
                    // King safety penalty if exposed
                    if (type === 'G') {
                        const enemyChar = colorChar === 'r' ? 'b' : 'r';
                        let threats = 0;
                        for (let ty = 0; ty < ROWS; ty++) {
                            for (let tx = 0; tx < COLS; tx++) {
                                const enemyPiece = board[ty][tx];
                                if (enemyPiece && enemyPiece[0] === enemyChar) {
                                    const enemyMoves = getRawMoves(tx, ty, enemyPiece, board);
                                    if (enemyMoves.some(m => m.x === x && m.y === y)) {
                                        threats++;
                                    }
                                }
                            }
                        }
                        pieceValue -= threats * 50;
                    }
                    
                    if (colorChar === 'r') {
                        score += pieceValue;
                    } else {
                        score -= pieceValue;
                    }
                }
            }
            
            // 添加士象完整奖励
            score += getAdvisorElephantBonus(board, 'r', gamePhase);
            score -= getAdvisorElephantBonus(board, 'b', gamePhase);
            
            // Endgame adjustments
            const pieceCount = board.flat().filter(p => p !== null).length;
            if (pieceCount < 16) { // Endgame
                // Centralize king in endgame
                const rKingCenterDist = Math.abs(rG.x - 4) + Math.abs(rG.y - 8);
                const bKingCenterDist = Math.abs(bG.x - 4) + Math.abs(bG.y - 1);
                score += (bKingCenterDist - rKingCenterDist) * 10;
            }
            
            return score;
        }

        function getAllCaptureMoves(color, board, rG, bG) {
            const moves = [];
            const colorChar = color[0];
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const piece = board[y][x];
                    if (piece && piece[0] === colorChar) {
                        const rawMoves = getRawMoves(x, y, piece, board);
                        rawMoves.forEach(move => {
                            const targetPiece = getPiece(move.x, move.y, board);
                            if (targetPiece && targetPiece[0] !== colorChar) {
                                if (isMoveLegal(x, y, move.x, move.y, copyBoard(board), color, rG, bG)) {
                                    // 使用当前阶段的棋子价值
                                    const gamePhase = getGamePhase(board);
                                    const captureValue = getPieceValue(targetPiece[1], move.x, move.y, targetPiece[0], gamePhase);
                                    moves.push({
                                        fromX: x, fromY: y, toX: move.x, toY: move.y,
                                        captureValue: captureValue
                                    });
                                }
                            }
                        });
                    }
                }
            }
            // Sort by capture value (highest first)
            moves.sort((a, b) => b.captureValue - a.captureValue);
            return moves;
        }

        function quiescenceSearch(board, depth, alpha, beta, isMaximizing, rG, bG) {
            // Terminal node evaluation
            if (!getPiece(rG.x, rG.y, board)) return -50000;
            if (!getPiece(bG.x, bG.y, board)) return 50000;
            
            const standPat = evaluateBoard(board, rG, bG);
            
            if (depth <= 0) {
                return standPat;
            }
            
            if (isMaximizing) {
                if (standPat >= beta) return beta;
                if (alpha < standPat) alpha = standPat;
                
                // Only search capture moves
                const currentColor = 'red';
                const captureMoves = getAllCaptureMoves(currentColor, board, rG, bG);
                
                for (const move of captureMoves) {
                    const state = performVirtualMove(board, move, rG, bG);
                    const score = quiescenceSearch(state.board, depth - 1, alpha, beta, false, state.rG, state.bG);
                    if (score >= beta) return beta;
                    if (score > alpha) alpha = score;
                }
                return alpha;
            } else {
                if (standPat <= alpha) return alpha;
                if (beta > standPat) beta = standPat;
                
                // Only search capture moves
                const currentColor = 'black';
                const captureMoves = getAllCaptureMoves(currentColor, board, rG, bG);
                
                for (const move of captureMoves) {
                    const state = performVirtualMove(board, move, rG, bG);
                    const score = quiescenceSearch(state.board, depth - 1, alpha, beta, true, state.rG, state.bG);
                    if (score <= alpha) return alpha;
                    if (score < beta) beta = score;
                }
                return beta;
            }
        }

        function alphaBetaSearch(board, depth, alpha, beta, isMaximizing, rG, bG) {
            // Check generals first, avoid calculating moves if one is missing
            if (!getPiece(rG.x, rG.y, board)) return -50000 - (SEARCH_DEPTH - depth) * 10;
            if (!getPiece(bG.x, bG.y, board)) return 50000 + (SEARCH_DEPTH - depth) * 10;

            if (depth === 0) {
                // Use quiescence search to avoid horizon effect
                return quiescenceSearch(board, QUIESCENCE_DEPTH, alpha, beta, isMaximizing, rG, bG);
            }
            
            const currentColor = isMaximizing ? 'red' : 'black';
            const possibleMoves = getAllPossibleMoves(currentColor, board, rG, bG);
            
            if (possibleMoves.length === 0) {
                // Checkmate or Stalemate (treat as loss)
                return isMaximizing ? -40000 - (SEARCH_DEPTH - depth) * 10 : 40000 + (SEARCH_DEPTH - depth) * 10;
            }
            
            // Improved move ordering
            possibleMoves.sort((a, b) => {
                // Check killer moves
                for (let i = 0; i < 2; i++) {
                    const killer = killerMoves[depth][i];
                    if (killer) {
                        if (a.fromX === killer.fromX && a.fromY === killer.fromY &&
                            a.toX === killer.toX && a.toY === killer.toY) return -1;
                        if (b.fromX === killer.fromX && b.fromY === killer.fromY &&
                            b.toX === killer.toX && b.toY === killer.toY) return 1;
                    }
                }
                
                // History heuristic
                const keyA = \`\${a.fromX},\${a.fromY},\${a.toX},\${a.toY}\`;
                const keyB = \`\${b.fromX},\${b.fromY},\${b.toX},\${b.toY}\`;
                const histA = historyTable[keyA] || 0;
                const histB = historyTable[keyB] || 0;
                if (histA !== histB) return histB - histA;
                
                // Capture ordering
                const targetA = getPiece(a.toX, a.toY, board);
                const targetB = getPiece(b.toX, b.toY, board);
                const gamePhase = getGamePhase(board);
                const valueA = targetA ? getPieceValue(targetA[1], a.toX, a.toY, targetA[0], gamePhase) : 0;
                const valueB = targetB ? getPieceValue(targetB[1], b.toX, b.toY, targetB[0], gamePhase) : 0;
                return valueB - valueA;
            });

            if (isMaximizing) {
                let maxEval = -Infinity;
                for (const move of possibleMoves) {
                    const state = performVirtualMove(board, move, rG, bG);
                    const evaluation = alphaBetaSearch(state.board, depth - 1, alpha, beta, false, state.rG, state.bG);
                    if (evaluation > maxEval) {
                        maxEval = evaluation;
                        if (evaluation >= beta) {
                            // Update killer moves
                            if (!killerMoves[depth][0] ||
                                killerMoves[depth][0].fromX !== move.fromX ||
                                killerMoves[depth][0].fromY !== move.fromY ||
                                killerMoves[depth][0].toX !== move.toX ||
                                killerMoves[depth][0].toY !== move.toY) {
                                killerMoves[depth][1] = killerMoves[depth][0];
                                killerMoves[depth][0] = move;
                            }
                            // Update history
                            const key = \`\${move.fromX},\${move.fromY},\${move.toX},\${move.toY}\`;
                            historyTable[key] = (historyTable[key] || 0) + depth * depth;
                        }
                    }
                    alpha = Math.max(alpha, evaluation);
                    if (beta <= alpha) break;
                }
                return maxEval;
            } else {
                let minEval = Infinity;
                for (const move of possibleMoves) {
                    const state = performVirtualMove(board, move, rG, bG);
                    const evaluation = alphaBetaSearch(state.board, depth - 1, alpha, beta, true, state.rG, state.bG);
                    if (evaluation < minEval) {
                        minEval = evaluation;
                        if (evaluation <= alpha) {
                            // Update killer moves
                            if (!killerMoves[depth][0] ||
                                killerMoves[depth][0].fromX !== move.fromX ||
                                killerMoves[depth][0].fromY !== move.fromY ||
                                killerMoves[depth][0].toX !== move.toX ||
                                killerMoves[depth][0].toY !== move.toY) {
                                killerMoves[depth][1] = killerMoves[depth][0];
                                killerMoves[depth][0] = move;
                            }
                            // Update history
                            const key = \`\${move.fromX},\${move.fromY},\${move.toX},\${move.toY}\`;
                            historyTable[key] = (historyTable[key] || 0) + depth * depth;
                        }
                    }
                    beta = Math.min(beta, evaluation);
                    if (beta <= alpha) break;
                }
                return minEval;
            }
        }

        function findBestMove(board, color, rG, bG, depth) {
            console.time(\`AI Thinking Depth \${depth}\`);
            
            const possibleMoves = getAllPossibleMoves(color, board, rG, bG);
            if (possibleMoves.length === 0) {
                console.timeEnd(\`AI Thinking Depth \${depth}\`);
                return null;
            }
            
            let bestMove = null;
            let bestValue = color === 'red' ? -Infinity : Infinity;
            let bestMovesPool = [];
            const isMaximizing = (color === 'red');
            
            for (const move of possibleMoves) {
                const state = performVirtualMove(board, move, rG, bG);
                const moveValue = alphaBetaSearch(state.board, depth - 1, -Infinity, Infinity, !isMaximizing, state.rG, state.bG);
                
                if (isMaximizing) {
                    if (moveValue > bestValue) {
                        bestValue = moveValue;
                        bestMovesPool = [move];
                    } else if (moveValue > -Infinity && moveValue === bestValue) {
                        bestMovesPool.push(move);
                    }
                } else {
                    if (moveValue < bestValue) {
                        bestValue = moveValue;
                        bestMovesPool = [move];
                    } else if (moveValue < Infinity && moveValue === bestValue) {
                        bestMovesPool.push(move);
                    }
                }
            }
            
            // Default to first move if pool is empty somehow or all values are +/-Infinity
            if (bestMovesPool.length === 0 && possibleMoves.length > 0) {
                bestMovesPool.push(possibleMoves[0]);
            }

            if (bestMovesPool.length > 0) {
                const randomIndex = Math.floor(Math.random() * bestMovesPool.length);
                bestMove = bestMovesPool[randomIndex];
            }
            
            console.log(\`AI (\${color}) Best value:\`, bestValue, "Move:", bestMove, "Pool size:", bestMovesPool.length);
            console.timeEnd(\`AI Thinking Depth \${depth}\`);
            return bestMove;
        }

        function triggerAIMove() {
            if (isGameOver || currentPlayer !== aiColor) return;
            
            isAiThinking = true;
            selectedPiece = null;
            possibleMoves = [];
            render();

            setTimeout(() => {
                const bestMove = findBestMove(boardData, aiColor, redGeneralPos, blackGeneralPos, SEARCH_DEPTH);
                isAiThinking = false;
                
                if (bestMove && !isGameOver) {
                    movePiece(bestMove.fromX, bestMove.fromY, bestMove.toX, bestMove.toY);
                } else {
                    if (!isGameOver) {
                        isGameOver = true;
                        const winner = aiColor === 'red' ? 'black' : 'red';
                        infoDiv.textContent = \`\${COLOR_NAME[winner]} 获胜 (AI认输)! 🎉\`;
                        infoDiv.style.color = winner === 'red' ? '#d53f3f' : '#2c2c2c';
                        infoDiv.classList.remove('info-check', 'info-ai');
                    }
                }
                render();
            }, AI_DELAY);
        }

        // 事件监听
        piecesLayer.addEventListener('click', (event) => {
            if (event.target === piecesLayer && selectedPiece && !isAiThinking) {
                selectedPiece = null;
                possibleMoves = [];
                render();
            }
        });

        resetButton.addEventListener('click', () => {
            if (isAiThinking) return;
            initGame();
        });

        undoButton.addEventListener('click', () => {
            undoMove();
        });

        window.addEventListener('resize', () => {
            setTimeout(refreshBoard, 150);
        });

        // 初始化游戏
        document.addEventListener('DOMContentLoaded', () => {
            initGame();
        });

        window.addEventListener('load', () => {
            refreshBoard();
        });
    </script>
</body>
</html>
`;

const handler = (req: Request): Response => {
  const url = new URL(req.url);
  
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(HTML_TEMPLATE, {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }
  
  return new Response("Not Found", { status: 404 });
};

console.log("中国象棋服务器启动在 http://localhost:8000");
serve(handler, { port: 8000 });
