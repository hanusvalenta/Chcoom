const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 64;
const FOV = Math.PI / 4;
const MAX_DEPTH = 500;
const MINI_MAP_SCALE = 0.2;

const textures = {};
const enemies = [];
const player = {
    x: 100,
    y: 100,
    angle: 0,
    speed: 2,
    rotationSpeed: 0.05
};

let map = [];
let currentMapIndex = 0;
const maps = ['map1.json', 'map2.json']; // List of map files

const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

async function loadTextures() {
    const textureSources = {
        wall: 'wall.png',
        enemy: 'enemy.png',
        hand: 'hand.png'
    };

    const promises = Object.entries(textureSources).map(([key, src]) =>
        new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                textures[key] = img;
                resolve();
            };
        })
    );

    await Promise.all(promises);
}

async function loadMap() {
    // Clear previous map's resources
    enemies.length = 0;
    map = [];
    
    try {
        const response = await fetch(maps[currentMapIndex]);
        const data = await response.json();
        map = data.map;
        await loadTextures();
        spawnEntities();
        resizeCanvas();
        startGame();
    } catch (error) {
        console.error('Error loading the map or textures:', error);
    }
}

function spawnEntities() {
    let spawnFound = false;

    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
            const tile = map[row][col];

            if (tile === 3) { // Enemy tile
                enemies.push({
                    x: col * TILE_SIZE + TILE_SIZE / 2,
                    y: row * TILE_SIZE + TILE_SIZE / 2,
                    sprite: 'enemy'
                });
                map[row][col] = 0; // Clear the enemy position on the map
            } else if (tile === 4 && !spawnFound) { // Player spawn point
                player.x = col * TILE_SIZE + TILE_SIZE / 2;
                player.y = row * TILE_SIZE + TILE_SIZE / 2;
                spawnFound = true; // Ensure only one spawn point is used
            }
        }
    }
}

function startGame() {
    gameLoop();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePlayer();
    castRays();
    renderEnemies();
    drawHand();
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

    checkMapTransition();
}

function isCollidingWithWall(x, y) {
    const mapX = Math.floor(x / TILE_SIZE);
    const mapY = Math.floor(y / TILE_SIZE);

    if (mapX < 0 || mapY < 0 || mapX >= map[0].length || mapY >= map.length) {
        return true;
    }

    return map[mapY][mapX] === 1;
}

function checkMapTransition() {
    const mapX = Math.floor(player.x / TILE_SIZE);
    const mapY = Math.floor(player.y / TILE_SIZE);

    if (mapX >= 0 && mapY >= 0 && mapX < map[0].length && mapY < map.length) {
        if (map[mapY][mapX] === 5) { // Map transition point
            currentMapIndex = (currentMapIndex + 1) % maps.length;
            loadMap(); // Load the next map
        }
    }
}

function castRays() {
    const halfFOV = FOV / 2;
    const startAngle = player.angle - halfFOV;
    const numRays = canvas.width;

    for (let i = 0; i < numRays; i++) {
        const rayAngle = startAngle + (i / numRays) * FOV;
        const { distance, textureOffset } = castSingleRay(rayAngle);
        const sliceHeight = (TILE_SIZE / distance) * 300;

        ctx.drawImage(
            textures.wall,
            textureOffset, 0, 1, TILE_SIZE,
            i, (canvas.height - sliceHeight) / 2, 1, sliceHeight
        );
    }
}

function castSingleRay(angle) {
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);

    for (let depth = 0; depth < MAX_DEPTH; depth++) {
        let x = player.x + cos * depth;
        let y = player.y + sin * depth;

        if (isCollidingWithWall(x, y)) {
            const textureOffset = Math.floor((x % TILE_SIZE) / TILE_SIZE * textures.wall.width);
            return { distance: depth, textureOffset: textureOffset };
        }
    }

    return { distance: MAX_DEPTH, textureOffset: 0 };
}

function renderEnemies() {
    enemies.forEach(enemy => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const angleToEnemy = Math.atan2(dy, dx);
        let relativeAngle = angleToEnemy - player.angle;

        if (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
        if (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

        const screenX = (relativeAngle / FOV + 0.5) * canvas.width;

        if (distance > 0 && screenX >= 0 && screenX <= canvas.width) {
            const rayHit = castSingleRay(angleToEnemy);
            if (rayHit.distance > distance) {
                const spriteSize = (TILE_SIZE / distance) * 300;
                ctx.drawImage(
                    textures[enemy.sprite],
                    screenX - spriteSize / 2,
                    canvas.height / 2 - spriteSize / 2,
                    spriteSize,
                    spriteSize
                );
            }
        }
    });
}

function drawHand() {
    const handScale = 1.5; // Scale factor for the hand sprite
    const handWidth = textures.hand.width * handScale;
    const handHeight = textures.hand.height * handScale;

    const xPos = (canvas.width / 2) - (handWidth / 2);
    const yPos = canvas.height - handHeight - 30;

    ctx.drawImage(textures.hand, xPos, yPos, handWidth, handHeight);
}

function drawMiniMap() {
    const mapWidth = map[0].length * TILE_SIZE * MINI_MAP_SCALE;
    const mapHeight = map.length * TILE_SIZE * MINI_MAP_SCALE;
    const offsetX = canvas.width - mapWidth - 20;
    const offsetY = 20;

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

    enemies.forEach(enemy => {
        ctx.fillStyle = 'blue';
        ctx.fillRect(
            offsetX + enemy.x * MINI_MAP_SCALE - 2,
            offsetY + enemy.y * MINI_MAP_SCALE - 2,
            4,
            4
        );
    });

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
