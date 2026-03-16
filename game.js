const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const stateEl = document.getElementById('state');

const world = {
  width: canvas.width,
  height: canvas.height,
  centerX: canvas.width / 2,
  centerY: canvas.height / 2 + 20
};

const kayak = {
  x: world.centerX,
  y: world.centerY,
  width: 180,
  height: 54
};

const child = {
  x: kayak.x,
  y: kayak.y - 30,
  inWater: false,
  dropTimer: 2.5,
  nextDropMin: 1.8,
  nextDropMax: 3.7
};

const animals = [];
let score = 0;
let gameOver = false;
let elapsed = 0;
let spawnTimer = 0;
let streamOffset = 0;

const garSprite = new Image();
garSprite.src = 'assets/florida-gar-sprite.png';
let garSpriteReady = false;
garSprite.addEventListener('load', () => {
  garSpriteReady = true;
});
garSprite.addEventListener('error', () => {
  if (!gameOver) {
    stateEl.textContent = 'Gar sprite file missing at assets/florida-gar-sprite.png';
  }
});

// Frames mapped to the 7 fish poses in the provided sprite sheet (4 top row, 3 bottom row).
const garFrames = [
  { x: 70, y: 365, w: 320, h: 132 },
  { x: 410, y: 365, w: 320, h: 132 },
  { x: 735, y: 365, w: 320, h: 132 },
  { x: 1060, y: 365, w: 380, h: 132 },
  { x: 210, y: 545, w: 390, h: 132 },
  { x: 575, y: 545, w: 340, h: 132 },
  { x: 920, y: 545, w: 350, h: 132 }
];

const animalTypes = [
  { kind: 'gator', speed: 70, color: '#1a5d1a', size: 48 },
  { kind: 'gar', speed: 95, color: '#64748b', size: 72 },
  { kind: 'turtle', speed: 62, color: '#3f6212', size: 34 }
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pickAnimalTemplate() {
  if (elapsed < 12) {
    const earlyPool = ['gar', 'gar', 'gar', 'gator', 'turtle'];
    const earlyKind = earlyPool[Math.floor(Math.random() * earlyPool.length)];
    return animalTypes.find(animal => animal.kind === earlyKind) || animalTypes[0];
  }

  return animalTypes[Math.floor(Math.random() * animalTypes.length)];
}

function spawnAnimal(template = pickAnimalTemplate()) {
  animals.push({
    ...template,
    x: rand(190, world.width - 190),
    y: world.height + rand(15, 140),
    wiggle: rand(0, Math.PI * 2),
    frameClock: rand(0, 1)
  });
}

function maybeDropChild(dt) {
  if (child.inWater || gameOver) return;
  child.dropTimer -= dt;
  if (child.dropTimer > 0) return;

  child.inWater = true;
  child.x = kayak.x + rand(-90, 90);
  child.y = kayak.y + rand(54, 105);
  stateEl.textContent = 'Child in water! Press Space or click to rescue!';
}

function rescueChild() {
  if (!child.inWater || gameOver) return;
  child.inWater = false;
  child.x = kayak.x;
  child.y = kayak.y - 30;
  child.dropTimer = rand(child.nextDropMin, child.nextDropMax);
  score += 1;
  scoreEl.textContent = `Score: ${score}`;
  stateEl.textContent = 'Nice rescue!';
}

function updateAnimals(dt) {
  for (const animal of animals) {
    animal.wiggle += dt * 2.3;
    animal.frameClock += dt;

    const targetX = child.inWater ? child.x : world.centerX + Math.sin(animal.wiggle) * 70;
    const targetY = child.inWater ? child.y : world.centerY + 50;

    const dx = targetX - animal.x;
    const dy = targetY - animal.y;
    const dist = Math.hypot(dx, dy) || 1;

    animal.x += (dx / dist) * animal.speed * dt + Math.sin(animal.wiggle) * 0.85;
    animal.y += (dy / dist) * animal.speed * dt - 26 * dt;

    if (child.inWater && Math.hypot(child.x - animal.x, child.y - animal.y) < animal.size * 0.56) {
      gameOver = true;
      stateEl.textContent = `Oh no! A ${animal.kind} reached the child. Refresh to retry.`;
    }
  }

  for (let i = animals.length - 1; i >= 0; i -= 1) {
    if (animals[i].y < -70) animals.splice(i, 1);
  }
}

function drawRiverAndBanks(dt) {
  streamOffset = (streamOffset + dt * 90) % 34;

  const riverLeft = 150;
  const riverRight = world.width - 150;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 0, riverLeft, world.height);
  ctx.fillRect(riverRight, 0, world.width - riverRight, world.height);

  ctx.fillStyle = '#0369a1';
  ctx.fillRect(riverLeft, 0, riverRight - riverLeft, world.height);

  for (let i = -2; i < 24; i += 1) {
    const y = i * 34 + streamOffset;
    const alpha = 0.14 + ((i % 3) * 0.03);
    ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(riverLeft + 26, y);
    ctx.lineTo(riverRight - 26, y + 8);
    ctx.stroke();
  }

  ctx.fillStyle = '#365314';
  for (let i = 0; i < 11; i += 1) {
    const lilyX = riverLeft + 35 + ((i * 131 + streamOffset * 2) % (riverRight - riverLeft - 70));
    const lilyY = (i * 63 + streamOffset * 2.5) % world.height;
    ctx.beginPath();
    ctx.arc(lilyX, lilyY, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawKayak() {
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.ellipse(kayak.x, kayak.y, kayak.width / 2, kayak.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.ellipse(kayak.x, kayak.y, kayak.width / 2 - 25, kayak.height / 2 - 15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(kayak.x - 34, kayak.y - 26, 10, 0, Math.PI * 2);
  ctx.arc(kayak.x + 34, kayak.y - 26, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(kayak.x - 43, kayak.y - 19, 18, 20);
  ctx.fillRect(kayak.x + 25, kayak.y - 19, 18, 20);
}

function drawChild() {
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(child.x, child.y - 10, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f97316';
  ctx.fillRect(child.x - 8, child.y - 2, 16, 16);

  if (child.inWater) {
    ctx.strokeStyle = 'rgba(226,232,240,0.5)';
    ctx.beginPath();
    ctx.arc(child.x, child.y + 13, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGarSprite(animal) {
  const frameIndex = Math.floor(animal.frameClock * 9) % garFrames.length;
  const frame = garFrames[frameIndex];
  const facingLeft = animal.x > (child.inWater ? child.x : world.centerX);

  const drawW = animal.size * 1.75;
  const drawH = animal.size * 0.72;

  ctx.save();
  ctx.translate(animal.x, animal.y);
  if (facingLeft) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    garSprite,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  ctx.restore();
}

function drawAnimalFallback(animal) {
  ctx.save();
  ctx.translate(animal.x, animal.y);
  ctx.scale(1, 0.62);

  ctx.fillStyle = animal.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, animal.size / 2, animal.size / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-animal.size / 2, 0);
  ctx.lineTo(-animal.size / 2 - 16, -10);
  ctx.lineTo(-animal.size / 2 - 16, 10);
  ctx.closePath();
  ctx.fill();

  if (animal.kind === 'gator') {
    ctx.fillRect(animal.size / 5, -4, animal.size / 3, 8);
  }

  ctx.restore();
}

function drawAnimal(animal) {
  if (animal.kind === 'gar' && garSpriteReady) {
    drawGarSprite(animal);
    return;
  }

  drawAnimalFallback(animal);
}

const garTemplate = animalTypes.find(animal => animal.kind === 'gar');
if (garTemplate) {
  spawnAnimal(garTemplate);
  animals[animals.length - 1].x = world.centerX - 130;
  animals[animals.length - 1].y = world.height - 40;
}

let lastFrame = performance.now();

function gameLoop(now) {
  const deltaTime = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;

  if (!gameOver) {
    elapsed += deltaTime;
    spawnTimer -= deltaTime;

    const spawnInterval = Math.max(0.3, 1.6 - elapsed * 0.07);
    if (spawnTimer <= 0) {
      spawnAnimal();
      spawnTimer = spawnInterval;
    }

    maybeDropChild(deltaTime);
    updateAnimals(deltaTime);
  }

  drawRiverAndBanks(deltaTime);
  drawKayak();
  drawChild();
  animals.forEach(drawAnimal);

  if (gameOver) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.fillStyle = '#fef2f2';
    ctx.font = 'bold 40px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', world.centerX, world.centerY - 15);
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText(`Final score: ${score}`, world.centerX, world.centerY + 24);
  }

  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    event.preventDefault();
    rescueChild();
  }
});

canvas.addEventListener('pointerdown', () => {
  rescueChild();
});

requestAnimationFrame(gameLoop);
