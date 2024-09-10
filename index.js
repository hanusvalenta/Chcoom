const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const TILE_SIZE = 64;
const player = {
    x: 100,
    y: 100,
    angle: 0, // Player's viewing direction in radians
    speed: 2, // Movement speed
    rotationSpeed: 0.05 // Rotation speed
};

let map = []; // Initialize an empty map

const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

// Load the map from JSON file
async function loadMap() {
    try {
        const response = await fetch('map.json');
        const data = await response.json();
        map = data.map;
        startGame(); // Start the game loop after loading the map
    } catch (error) {
        console.error('Error loading the map:', error);
    }
}

function startGame() {
    // Start the main game loop
    gameLoop();
}

// Main game loop
function gameLoop() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update player position
    updatePlayer();

    // Cast rays and render scene
    castRays();

    // Request the next frame
    requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    // Forward and backward movement
    if (keys.forward) {
        player.x += Math.cos(player.angle) * player.speed;
        player.y += Math.sin(player.angle) * player.speed;
    }
    if (keys.backward) {
        player.x -= Math.cos(player.angle) * player.speed;
        player.y -= Math.sin(player.angle) * player.speed;
    }

    // Left and right rotation
    if (keys.left) {
        player.angle -= player.rotationSpeed;
    }
    if (keys.right) {
        player.angle += player.rotationSpeed;
    }

    // Prevent the angle from going beyond 2*PI (full rotation)
    player.angle = (player.angle + 2 * Math.PI) % (2 * Math.PI);
}

function castRays() {
    // Draw the 2D map
    draw2DMap();

    // Draw the player
    ctx.fillStyle = 'red';
    ctx.fillRect(player.x - 5, player.y - 5, 10, 10);

    // Draw the player's viewing direction
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
    // Draw a line representing the player's viewing direction
    const viewLength = 50; // Length of the line to indicate the viewing direction
    const endX = player.x + Math.cos(player.angle) * viewLength;
    const endY = player.y + Math.sin(player.angle) * viewLength;

    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y); // Start from the player's position
    ctx.lineTo(endX, endY);         // Draw to the endpoint in the direction of the viewing angle
    ctx.stroke();
}

// Handle keyboard input
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

// Start loading the map
loadMap();
