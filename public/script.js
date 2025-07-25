const cells = document.querySelectorAll('.cell');
const modeSelector = document.getElementById('mode');
const status = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const connectBtn = document.getElementById('connectBtn');

let board = Array(9).fill('');
let myTurn = true;
let mySymbol = 'X';
let gameOver = false;
let mode = modeSelector.value;
let socket = io();
let room;

const wins = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function render() {
  board.forEach((val, i) => {
    cells[i].textContent = val;
  });
}

function checkWin(symbol) {
  return wins.some(line => line.every(i => board[i] === symbol));
}

function getWinningLine(symbol) {
  for (const line of wins) {
    if (line.every(i => board[i] === symbol)) return line;
  }
  return null;
}

function highlightWinningCells(line) {
  line.forEach(i => {
    cells[i].textContent = board[i];
    cells[i].style.backgroundColor = '#ff6961';
    cells[i].style.fontWeight = 'bold';
    cells[i].style.color = 'white';
  });
}

function makeMove(i) {
  if (board[i] || gameOver || (!myTurn && mode === 'multi')) return;

  board[i] = mySymbol;
  render();

  const winLine = getWinningLine(mySymbol);
  if (winLine) {
    status.textContent = 'You Win!';
    highlightWinningCells(winLine);
    gameOver = true;
    return;
  }

  if (!board.includes('')) {
    status.textContent = 'Draw!';
    gameOver = true;
    return;
  }

  if (mode === 'multi') {
    myTurn = false;
    socket.emit('move', { index: i, room });
  } else {
    setTimeout(aiMove, 300);
  }
}

function aiMove() {
  const empty = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  const move = empty[Math.floor(Math.random() * empty.length)];
  board[move] = 'O';
  render();

  const winLine = getWinningLine('O');
  if (winLine) {
    status.textContent = 'AI Wins!';
    highlightWinningCells(winLine);
    gameOver = true;
  } else if (!board.includes('')) {
    status.textContent = 'Draw!';
    gameOver = true;
  }
}

cells.forEach((cell, i) => {
  cell.addEventListener('click', () => makeMove(i));
});

resetBtn.onclick = () => {
  board.fill('');
  gameOver = false;
  myTurn = (mode === 'single' || mySymbol === 'X');
  status.textContent = '';

  cells.forEach(cell => {
    cell.style.backgroundColor = '#ffffff';
    cell.style.color = '#000000';
    cell.style.fontWeight = 'normal';
  });

  if (mode === 'multi') {
    connectBtn.disabled = false;
  }

  render();
};

modeSelector.onchange = () => {
  mode = modeSelector.value;
  board.fill('');
  render();
  gameOver = false;
  status.textContent = '';

  if (mode === 'multi') {
    connectBtn.style.display = 'inline-block';
    connectBtn.disabled = false;
  } else {
    connectBtn.style.display = 'none';
  }
};

connectBtn.onclick = () => {
  connectBtn.disabled = true;
  status.textContent = '🔄 Waiting for opponent...';
  socket.emit('ready');

  setTimeout(() => {
    if (!room && !gameOver) {
      status.textContent = '❌ No opponent found.';
      connectBtn.disabled = false;
    }
  }, 10000);
};

function registerMultiplayerEvents() {
  socket.on('gameStart', ({ symbol }) => {
    mySymbol = symbol;
    myTurn = (symbol === 'X');
    status.textContent = `🎮 Connected! You are ${symbol}`;
  });

  socket.on('room', r => {
    room = r;
    console.log('Joined room:', room);
  });

  socket.on('opponentMove', index => {
    const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
    board[index] = opponentSymbol;

    render();

    const winLine = getWinningLine(opponentSymbol);

    if (winLine) {
      setTimeout(() => {
        highlightWinningCells(winLine);
        status.textContent = 'You Lost!';
        gameOver = true;
      }, 50);
    } else if (!board.includes('')) {
      status.textContent = 'Draw!';
      gameOver = true;
    } else {
      myTurn = true;
    }
  });

  socket.on('opponentDisconnected', () => {
    status.textContent = 'Opponent disconnected!';
    gameOver = true;
  });
}

registerMultiplayerEvents();

if (mode === 'multi') {
  connectBtn.style.display = 'inline-block';
} else {
  connectBtn.style.display = 'none';
}
