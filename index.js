const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 64;
const player = {
    x: 100,
    y: 100,
    angle: 0,
    speed: 2,
    rotationSpeed: 0.05
};

let map = [];

const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

async function loadMap() {
    try {
        const response = await fetch('map.json');
        const data = await response.json();
        map = data.map;
        startGame();
    } catch (error) {
        console.error('Error loading the map:', error);
    }
}

function startGame() {
    gameLoop();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePlayer();
    castRays();
    requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    let newX = player.x;
    let newY = player.y;

    if (keys.forward) {
        newX += Math.cos(player.angle) * player.speed;
        newY += Math.sin(player.angle) * player.speed;
    }
    if (keys.backward) {
        newX -= Math.cos(player.angle) * player.speed;
        newY -= Math.sin(player.angle) * player.speed;
    }

    if (!isCollidingWithWall(newX, newY)) {
        player.x = newX;
        player.y = newY;
    }

    if (keys.left) {
        player.angle -= player.rotationSpeed;
    }
    if (keys.right) {
        player.angle += player.rotationSpeed;
    }

    player.angle = (player.angle + 2 * Math.PI) % (2 * Math.PI);
}

function isCollidingWithWall(x, y) {
    const mapX = Math.floor(x / TILE_SIZE);
    const mapY = Math.floor(y / TILE_SIZE);

    if (mapX < 0 || mapY < 0 || mapX >= map[0].length || mapY >= map.length) {
        return true;
    }

    return map[mapY][mapX] === 1;
}

function castRays() {
    draw2DMap();
    ctx.fillStyle = 'red';
    ctx.fillRect(player.x - 5, player.y - 5, 10, 10);
    drawPlayerView();
}

function draw2DMap() {
    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
            const tile = map[row][col];
            if (tile === 1) {
                ctx.fillStyle = 'gray';
                ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

function drawPlayerView() {
    const viewLength = 50;
    const endX = player.x + Math.cos(player.angle) * viewLength;
    const endY = player.y + Math.sin(player.angle) * viewLength;

    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'w':
        case 'ArrowUp':
            keys.forward = true;
            break;
        case 's':
        case 'ArrowDown':
            keys.backward = true;
            break;
        case 'a':
        case 'ArrowLeft':
            keys.left = true;
            break;
        case 'd':
        case 'ArrowRight':
            keys.right = true;
            break;
    }
});

window.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'w':
        case 'ArrowUp':
            keys.forward = false;
            break;
        case 's':
        case 'ArrowDown':
            keys.backward = false;
            break;
        case 'a':
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'd':
        case 'ArrowRight':
            keys.right = false;
            break;
    }
});

loadMap();
