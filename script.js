// Three.js scene in hero canvas
const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
function sizeFromHero() {
  const hero = document.getElementById('hero');
  const rect = hero.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

const { width: initW, height: initH } = sizeFromHero();
renderer.setSize(initW, initH);

const scene = new THREE.Scene();
renderer.setClearColor(0x000000, 0); // transparent to show CSS gradient
scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

const camera = new THREE.PerspectiveCamera(60, initW / initH, 0.1, 200);
camera.position.set(0, 1.2, 4.5);

// Lights: soft ambient + point light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.1, 0, 2);
pointLight.position.set(2.5, 2.5, 2.5);
scene.add(pointLight);

// Rotating hero object: Icosahedron
const coreGeometry = new THREE.IcosahedronGeometry(1.1, 1);
const coreMaterial = new THREE.MeshStandardMaterial({
  color: 0x66ccff,
  roughness: 0.35,
  metalness: 0.35,
  emissive: 0x0a1020,
  envMapIntensity: 0.6
});
const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
scene.add(coreMesh);

// Subtle glow halo using additive blended basic material
const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0x66ccff,
  transparent: true,
  opacity: 0.18,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const glowMesh = new THREE.Mesh(coreGeometry.clone(), glowMaterial);
glowMesh.scale.setScalar(1.35);
scene.add(glowMesh);

// Starfield (points)
function createStarField(count = 800, spread = 60) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    positions[ix] = (Math.random() - 0.5) * spread;
    positions[ix + 1] = (Math.random() - 0.5) * spread;
    positions[ix + 2] = (Math.random() - 0.5) * spread;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.035,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = -1;
  return points;
}
const stars = createStarField(1200, 120);
scene.add(stars);

// Theme handling: toggle site theme and adjust Three.js lighting/materials
const themeToggleBtn = document.getElementById('theme-toggle');

function getPreferredTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // Three.js adjustments per theme
  if (theme === 'light') {
    ambientLight.intensity = 0.55;
    pointLight.intensity = 1.15;
    coreMaterial.color.set(0x3a7bff);
    coreMaterial.emissive.set(0x0a0c14);
    if (stars.material && stars.material.color) stars.material.color.set(0x9aa6bf);
    glowMaterial.color.set(0x7fb0ff);
    scene.fog.color.set(0xeaf0ff);
    renderer.setClearColor(0x000000, 0); // keep transparent
  } else {
    ambientLight.intensity = 0.4;
    pointLight.intensity = 1.1;
    coreMaterial.color.set(0x66ccff);
    coreMaterial.emissive.set(0x0a1020);
    if (stars.material && stars.material.color) stars.material.color.set(0xffffff);
    glowMaterial.color.set(0x66ccff);
    scene.fog.color.set(0x0f172a);
    renderer.setClearColor(0x000000, 0);
  }
}

function setTheme(theme) {
  localStorage.setItem('theme', theme);
  applyTheme(theme);
}

const initialTheme = getPreferredTheme();
applyTheme(initialTheme);

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });
}

// Haze toggle
const hazeToggleBtn = document.getElementById('haze-toggle');
if (hazeToggleBtn) {
  hazeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('hazy-mode');
  });
}

// Interactivity state
let mouseX = 0, mouseY = 0;
let targetRotX = 0, targetRotY = 0;
let targetCamZ = camera.position.z;

function handlePointerMove(e) {
  const hero = document.getElementById('hero');
  const rect = hero.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;  // 0..1
  const y = (e.clientY - rect.top) / rect.height;  // 0..1
  mouseX = (x - 0.5) * 2; // -1..1
  mouseY = (y - 0.5) * 2; // -1..1
  // Aim for subtle tilt
  targetRotX = mouseY * 0.3;
  targetRotY = mouseX * 0.4;
}
window.addEventListener('pointermove', handlePointerMove, { passive: true });

function handleScroll() {
  const h = Math.max(1, window.innerHeight);
  const t = Math.min(1, Math.max(0, window.scrollY / h));
  // Slight zoom-in as you scroll past hero
  targetCamZ = 4.5 - t * 0.9;
}
window.addEventListener('scroll', handleScroll, { passive: true });

function onResize() {
  const { width, height } = sizeFromHero();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

function animate() {
  // Base idle rotation
  const idleX = coreMesh.rotation.x + 0.0045;
  const idleY = coreMesh.rotation.y + 0.006;

  // Smoothly blend towards mouse-driven tilt on top of idle
  const desiredX = idleX + targetRotX;
  const desiredY = idleY + targetRotY;
  coreMesh.rotation.x = THREE.MathUtils.lerp(coreMesh.rotation.x, desiredX, 0.08);
  coreMesh.rotation.y = THREE.MathUtils.lerp(coreMesh.rotation.y, desiredY, 0.08);

  // Keep glow aligned with core
  glowMesh.rotation.copy(coreMesh.rotation);

  // Starfield subtle drift
  stars.rotation.y += 0.0009;

  // Camera parallax/zoom
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.08);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// Smooth scrolling for in-page nav
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// IntersectionObserver for fade-in reveals
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

