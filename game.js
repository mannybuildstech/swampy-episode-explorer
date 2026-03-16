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
  speed: 380,
  width: 180,
  height: 54
};

const child = {
  x: kayak.x,
  y: kayak.y - 30,
  inWater: false,
  dropTimer: 3,
  nextDropMin: 2,
  nextDropMax: 4,
  rescueRange: 110
};

const animals = [];
let score = 0;
let gameOver = false;
let elapsed = 0;
let spawnTimer = 0;
let keys = new Set();

const animalTypes = [
  { kind: 'gator', speed: 68, color: '#1a5d1a', size: 48 },
  { kind: 'gar', speed: 88, color: '#64748b', size: 40 },
  { kind: 'turtle', speed: 58, color: '#3f6212', size: 34 }
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnAnimal() {
  const template = animalTypes[Math.floor(Math.random() * animalTypes.length)];
  animals.push({
    ...template,
    x: rand(70, world.width - 70),
    y: world.height + rand(25, 180),
    wiggle: rand(0, Math.PI * 2)
  });
}

function maybeDropChild() {
  if (child.inWater || gameOver) return;
  child.dropTimer -= deltaTime;
  if (child.dropTimer > 0) return;

  child.inWater = true;
  child.x = kayak.x + rand(-80, 80);
  child.y = kayak.y + rand(48, 95);
  stateEl.textContent = 'Child in water! Scoop them up!';
}

function rescueChild() {
  if (!child.inWater || gameOver) return;
  const dx = child.x - kayak.x;
  const dy = child.y - kayak.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= child.rescueRange) {
    child.inWater = false;
    child.x = kayak.x;
    child.y = kayak.y - 30;
    child.dropTimer = rand(child.nextDropMin, child.nextDropMax);
    score += 1;
    scoreEl.textContent = `Score: ${score}`;
    stateEl.textContent = 'Nice rescue!';
  }
}

function updateAnimals(dt) {
  const targetX = child.inWater ? child.x : world.centerX;
  const targetY = child.inWater ? child.y : world.centerY;

  for (const animal of animals) {
    animal.wiggle += dt * 2.1;
    const dx = targetX - animal.x;
    const dy = targetY - animal.y;
    const dist = Math.hypot(dx, dy) || 1;
    animal.x += (dx / dist) * animal.speed * dt + Math.sin(animal.wiggle) * 0.5;
    animal.y += (dy / dist) * animal.speed * dt;

    if (child.inWater && Math.hypot(child.x - animal.x, child.y - animal.y) < animal.size * 0.55) {
      gameOver = true;
      stateEl.textContent = `Oh no! A ${animal.kind} reached the child. Refresh to retry.`;
    }
  }

  while (animals.length > 25) animals.shift();
}

function updateKayak(dt) {
  let direction = 0;
  if (keys.has('ArrowLeft') || keys.has('a')) direction -= 1;
  if (keys.has('ArrowRight') || keys.has('d')) direction += 1;

  kayak.x += direction * kayak.speed * dt;
  kayak.x = Math.max(120, Math.min(world.width - 120, kayak.x));

  if (!child.inWater) {
    child.x = kayak.x;
    child.y = kayak.y - 30;
  }
}

function drawIsoRiver() {
  const left = 130;
  const right = world.width - 130;
  const top = 110;
  const bottom = world.height - 35;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(left, top + 40);
  ctx.lineTo(left, bottom);
  ctx.lineTo(0, world.height);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(world.width, 0);
  ctx.lineTo(right, top + 40);
  ctx.lineTo(right, bottom);
  ctx.lineTo(world.width, world.height);
  ctx.closePath();
  ctx.fill();

  const waterGradient = ctx.createLinearGradient(0, top, 0, bottom);
  waterGradient.addColorStop(0, '#0e7490');
  waterGradient.addColorStop(0.45, '#0369a1');
  waterGradient.addColorStop(1, '#082f49');

  ctx.fillStyle = waterGradient;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right - 70, bottom);
  ctx.lineTo(left + 70, bottom);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 14; i += 1) {
    const y = top + i * 34;
    const width = (right - left) - i * 7;
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.18)';
    ctx.beginPath();
    ctx.moveTo(world.centerX - width / 2, y);
    ctx.lineTo(world.centerX + width / 2, y);
    ctx.stroke();
  }
}

function drawKayak() {
  ctx.save();
  ctx.translate(kayak.x, kayak.y);
  ctx.scale(1, 0.7);

  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.ellipse(0, 0, kayak.width / 2, kayak.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.ellipse(0, 0, kayak.width / 2 - 25, kayak.height / 2 - 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // parents
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
    ctx.strokeStyle = 'rgba(226,232,240,0.55)';
    ctx.beginPath();
    ctx.arc(child.x, child.y + 13, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawAnimal(animal) {
  ctx.save();
  ctx.translate(animal.x, animal.y);
  ctx.scale(1, 0.58);

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

let lastFrame = performance.now();
let deltaTime = 0;

function gameLoop(now) {
  deltaTime = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;

  if (!gameOver) {
    elapsed += deltaTime;
    spawnTimer -= deltaTime;
    const spawnInterval = Math.max(0.35, 1.75 - elapsed * 0.06);
    if (spawnTimer <= 0) {
      spawnAnimal();
      spawnTimer = spawnInterval;
    }

    updateKayak(deltaTime);
    maybeDropChild();
    updateAnimals(deltaTime);
  }

  drawIsoRiver();
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
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.add(key);

  if (event.code === 'Space') {
    event.preventDefault();
    rescueChild();
  }
});

window.addEventListener('keyup', event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

requestAnimationFrame(gameLoop);
