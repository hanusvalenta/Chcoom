const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 64;
const FOV = Math.PI / 4;
const MAX_DEPTH = 500;
const MINI_MAP_SIZE = 100; // Size of the minimap
const TILE_SCALE = 0.2; // Scale factor to make tiles smaller on the minimap

const textures = {};
const enemies = [];
const doors = [];
const player = {
    x: 100,
    y: 100,
    angle: 0,
    speed: 2,
    rotationSpeed: 0.05
};

let map = [];
let currentMapIndex = 0;
const maps = ['map1.json', 'map2.json', 'map3.json']; // List of map files

const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    openDoor: false
};

// Floor and Ceiling Colors
const FLOOR_COLOR = '#6e8b3d'; // Example floor color
const CEILING_COLOR = '#4a4a4a'; // Example ceiling color

// Door states
const DOOR_CLOSED = 0;
const DOOR_OPEN = 1;
const DOOR_OPEN_TIME = 5000; // Time in milliseconds for the door to stay open
let doorOpenTimeout = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

async function loadTextures() {
    const textureSources = {
        wall: 'wall.png',
        enemy: 'enemy.png',
        hand: 'hand.png',
        doorClosed: 'doorClosed.png',
        doorOpen: 'doorOpen.png'
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
    doors.length = 0;
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
            } else if (tile === 6) { // Door tile
                doors.push({
                    x: col * TILE_SIZE + TILE_SIZE / 2,
                    y: row * TILE_SIZE + TILE_SIZE / 2,
                    state: DOOR_CLOSED
                });
                map[row][col] = 0; // Clear the door position on the map
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
    drawDoors();
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

    if (!isCollidingWithObstacle(newX, newY)) {
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

    if (keys.openDoor) {
        keys.openDoor = false;
        openClosestDoor();
    }
}

function isCollidingWithObstacle(x, y) {
    const mapX = Math.floor(x / TILE_SIZE);
    const mapY = Math.floor(y / TILE_SIZE);

    if (mapX < 0 || mapY < 0 || mapX >= map[0].length || mapY >= map.length) {
        return true;
    }

    if (map[mapY][mapX] === 1) {
        return true; // Collides with wall
    }

    // Check for door collisions
    for (const door of doors) {
        if (Math.abs(door.x - x) < TILE_SIZE / 2 && Math.abs(door.y - y) < TILE_SIZE / 2) {
            if (door.state === DOOR_CLOSED) {
                return true; // Collides with closed door
            }
        }
    }

    return false;
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

function openClosestDoor() {
    const mapX = Math.floor(player.x / TILE_SIZE);
    const mapY = Math.floor(player.y / TILE_SIZE);

    let closestDoor = null;
    let minDistance = Infinity;

    doors.forEach(door => {
        const distance = Math.sqrt(Math.pow(door.x - player.x, 2) + Math.pow(door.y - player.y, 2));
        if (distance < minDistance) {
            minDistance = distance;
            closestDoor = door;
        }
    });

    if (closestDoor) {
        closestDoor.state = DOOR_OPEN;
        setTimeout(() => {
            closestDoor.state = DOOR_CLOSED;
        }, DOOR_OPEN_TIME);
    }
}

function castRays() {
    const halfFOV = FOV / 2;
    const startAngle = player.angle - halfFOV;
    const numRays = canvas.width;
    const rays = [];

    for (let i = 0; i < numRays; i++) {
        const rayAngle = startAngle + (i / numRays) * FOV;
        const { distance, textureOffset } = castSingleRay(rayAngle);
        rays.push({ rayAngle, distance, textureOffset, i });
    }

    // Sort rays by distance (depth buffering)
    rays.sort((a, b) => a.distance - b.distance);

    rays.forEach(({ rayAngle, distance, textureOffset, i }) => {
        const sliceHeight = (TILE_SIZE / distance) * 300;

        // Draw the ceiling
        ctx.fillStyle = CEILING_COLOR;
        ctx.fillRect(i, 0, 1, (canvas.height - sliceHeight) / 2);

        // Draw the wall
        ctx.drawImage(
            textures.wall,
            textureOffset, 0, 1, TILE_SIZE,
            i, (canvas.height - sliceHeight) / 2, 1, sliceHeight
        );

        // Draw the floor
        ctx.fillStyle = FLOOR_COLOR;
        ctx.fillRect(i, (canvas.height + sliceHeight) / 2, 1, canvas.height - (canvas.height + sliceHeight) / 2);
    });
}

function castSingleRay(angle) {
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);

    for (let depth = 0; depth < MAX_DEPTH; depth++) {
        let x = player.x + cos * depth;
        let y = player.y + sin * depth;

        if (isCollidingWithObstacle(x, y)) {
            const textureOffset = Math.floor((x % TILE_SIZE) / TILE_SIZE * 64); // Simple texture offset
            return { distance: depth, textureOffset };
        }
    }

    return { distance: MAX_DEPTH, textureOffset: 0 };
}

function renderEnemies() {
    // Sort enemies by distance to player
    enemies.sort((a, b) => {
        const dxA = a.x - player.x;
        const dyA = a.y - player.y;
        const dxB = b.x - player.x;
        const dyB = b.y - player.y;

        const distanceA = Math.sqrt(dxA * dxA + dyA * dyA);
        const distanceB = Math.sqrt(dxB * dxB + dyB * dyB);

        return distanceA - distanceB;
    });

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
    const miniMapWidth = MINI_MAP_SIZE;
    const miniMapHeight = MINI_MAP_SIZE;

    // Calculate the minimap viewport (centered on player)
    const miniMapCenterX = canvas.width - miniMapWidth - 20; // 20px padding from the right
    const miniMapCenterY = 20; // 20px padding from the top
    const mapViewportSize = MINI_MAP_SIZE / TILE_SCALE; // Area of the map visible on the minimap
    const mapOffsetX = Math.max(0, player.x - mapViewportSize / 2);
    const mapOffsetY = Math.max(0, player.y - mapViewportSize / 2);

    // Draw map tiles
    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
            const tile = map[row][col];
            if (tile === 1) {
                ctx.fillStyle = 'gray';
                ctx.fillRect(
                    miniMapCenterX + (col * TILE_SIZE - mapOffsetX) * TILE_SCALE,
                    miniMapCenterY + (row * TILE_SIZE - mapOffsetY) * TILE_SCALE,
                    TILE_SIZE * TILE_SCALE,
                    TILE_SIZE * TILE_SCALE
                );
            }
        }
    }

    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = 'blue';
        ctx.fillRect(
            miniMapCenterX + (enemy.x - mapOffsetX) * TILE_SCALE - 2,
            miniMapCenterY + (enemy.y - mapOffsetY) * TILE_SCALE - 2,
            4,
            4
        );
    });

    // Draw player
    ctx.fillStyle = 'red';
    ctx.fillRect(
        miniMapCenterX + (player.x - mapOffsetX) * TILE_SCALE - 2,
        miniMapCenterY + (player.y - mapOffsetY) * TILE_SCALE - 2,
        4,
        4
    );

    // Draw player's view direction
    const viewLength = 30;
    const endX = miniMapCenterX + (player.x + Math.cos(player.angle) * viewLength - mapOffsetX) * TILE_SCALE;
    const endY = miniMapCenterY + (player.y + Math.sin(player.angle) * viewLength - mapOffsetY) * TILE_SCALE;

    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(miniMapCenterX + (player.x - mapOffsetX) * TILE_SCALE, miniMapCenterY + (player.y - mapOffsetY) * TILE_SCALE);
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

function drawDoors() {
    doors.forEach(door => {
        const dx = door.x - player.x;
        const dy = door.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const angleToDoor = Math.atan2(dy, dx);
        let relativeAngle = angleToDoor - player.angle;

        if (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
        if (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

        const screenX = (relativeAngle / FOV + 0.5) * canvas.width;

        if (distance > 0 && screenX >= 0 && screenX <= canvas.width) {
            const rayHit = castSingleRay(angleToDoor);
            if (rayHit.distance > distance) {
                const doorSize = (TILE_SIZE / distance) * 300;
                ctx.drawImage(
                    textures[door.state === DOOR_OPEN ? 'doorOpen' : 'doorClosed'],
                    screenX - doorSize / 2,
                    canvas.height / 2 - doorSize / 2,
                    doorSize,
                    doorSize
                );
            }
        }
    });
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
        case ' ':
            keys.openDoor = true;
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
        case ' ':
            keys.openDoor = false;
            break;
    }
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
loadMap();
