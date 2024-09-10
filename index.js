const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 64;
const FOV = Math.PI / 4;
const MAX_DEPTH = 500;
const MINI_MAP_SCALE = 0.2; // Scale for the mini-map

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

// Fullscreen the canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

async function loadMap() {
    try {
        const response = await fetch('map.json');
        const data = await response.json();
        map = data.map;
        resizeCanvas();
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
    drawMiniMap();
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
    const halfFOV = FOV / 2;
    const startAngle = player.angle - halfFOV;
    const numRays = canvas.width; // Adjust number of rays to canvas width

    for (let i = 0; i < numRays; i++) {
        const rayAngle = startAngle + (i / numRays) * FOV;
        const distance = castSingleRay(rayAngle);
        const sliceHeight = (TILE_SIZE / distance) * 300;

        ctx.fillStyle = `rgb(${255 - distance}, ${255 - distance}, ${255 - distance})`;
        ctx.fillRect(i, (canvas.height - sliceHeight) / 2, 1, sliceHeight);
    }
}

function castSingleRay(angle) {
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);

    for (let depth = 0; depth < MAX_DEPTH; depth++) {
        let x = player.x + cos * depth;
        let y = player.y + sin * depth;

        if (isCollidingWithWall(x, y)) {
            return depth;
        }
    }

    return MAX_DEPTH;
}

function drawMiniMap() {
    const mapWidth = map[0].length * TILE_SIZE * MINI_MAP_SCALE;
    const mapHeight = map.length * TILE_SIZE * MINI_MAP_SCALE;
    const offsetX = canvas.width - mapWidth - 20; // 20 pixels padding from the right edge
    const offsetY = 20; // 20 pixels padding from the top edge

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(offsetX, offsetY, mapWidth, mapHeight);

    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
            const tile = map[row][col];
            if (tile === 1) {
                ctx.fillStyle = 'gray';
                ctx.fillRect(
                    offsetX + col * TILE_SIZE * MINI_MAP_SCALE,
                    offsetY + row * TILE_SIZE * MINI_MAP_SCALE,
                    TILE_SIZE * MINI_MAP_SCALE,
                    TILE_SIZE * MINI_MAP_SCALE
                );
            }
        }
    }

    ctx.fillStyle = 'red';
    ctx.fillRect(
        offsetX + player.x * MINI_MAP_SCALE - 2,
        offsetY + player.y * MINI_MAP_SCALE - 2,
        4,
        4
    );

    const viewLength = 30;
    const endX = offsetX + (player.x + Math.cos(player.angle) * viewLength) * MINI_MAP_SCALE;
    const endY = offsetY + (player.y + Math.sin(player.angle) * viewLength) * MINI_MAP_SCALE;

    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(offsetX + player.x * MINI_MAP_SCALE, offsetY + player.y * MINI_MAP_SCALE);
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

window.addEventListener('resize', resizeCanvas);
loadMap();
