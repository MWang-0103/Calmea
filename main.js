import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { products } from './products.js';
import { logoBase64 } from './logo.js';

// Inject Logo into DOM
const loaderLogo = document.querySelector('.loader-logo');
if (loaderLogo) loaderLogo.src = logoBase64;

const navLogo = document.querySelector('.nav-logo');
if (navLogo) navLogo.src = logoBase64;

// --- DOM & UI Logic ---
const productGrid = document.getElementById('product-grid');
products.forEach(product => {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.id = `card-${product.id}`;
  card.innerHTML = `
    <div class="product-image-container">
      <img src="${product.imageUrl || ''}" alt="${product.imageAlt || product.name}" class="ritual-img" loading="lazy" decoding="async">
    </div>
    <div class="product-details">
      <div class="product-name">${product.name}</div>
      <div class="product-price">${product.price}</div>
      <div class="product-function">${product.function}</div>
      <button class="add-to-bag">ADD TO BAG</button>
      <button class="inci-toggle">Ingredients (INCI)</button>
      <div class="inci-accordion-wrapper">
        <div class="inci-content-inner">
          <p>${product.inci}</p>
        </div>
      </div>
    </div>
  `;
  productGrid.appendChild(card);
});

document.querySelectorAll('.inci-toggle').forEach(btn => {
  btn.addEventListener('click', function() {
    this.classList.toggle('active');
    const content = this.nextElementSibling;
    content.classList.toggle('is-open');
  });
});

// Carousel Scroll Logic
const navLeft = document.querySelector('.nav-left');
const navRight = document.querySelector('.nav-right');

if (navLeft && navRight && productGrid) {
  navLeft.addEventListener('click', () => {
    productGrid.scrollBy({ left: -340, behavior: 'smooth' });
  });
  navRight.addEventListener('click', () => {
    productGrid.scrollBy({ left: 340, behavior: 'smooth' });
  });

  let isDown = false;
  let startX;
  let scrollLeft;

  productGrid.addEventListener('mousedown', (e) => {
    isDown = true;
    productGrid.classList.add('is-dragging');
    productGrid.style.cursor = 'grabbing';
    productGrid.style.scrollSnapType = 'none'; // Disable snap during drag
    productGrid.style.scrollBehavior = 'auto'; // Disable smooth scroll during drag
    startX = e.pageX - productGrid.offsetLeft;
    scrollLeft = productGrid.scrollLeft;
  });
  
  productGrid.addEventListener('mouseleave', () => {
    if(!isDown) return;
    isDown = false;
    productGrid.classList.remove('is-dragging');
    productGrid.style.cursor = 'default';
    productGrid.style.scrollSnapType = 'x mandatory';
    productGrid.style.scrollBehavior = 'smooth';
  });
  
  productGrid.addEventListener('mouseup', () => {
    isDown = false;
    productGrid.classList.remove('is-dragging');
    productGrid.style.cursor = 'default';
    productGrid.style.scrollSnapType = 'x mandatory';
    productGrid.style.scrollBehavior = 'smooth';
  });
  
  productGrid.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - productGrid.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll-fast multiplier
    productGrid.scrollLeft = scrollLeft - walk;
  });
}

window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

function scrollToProduct(id) {
  const card = document.getElementById(`card-${id}`);
  if (card) {
    const yOffset = -100; 
    const y = card.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({top: y, behavior: 'smooth'});
    
    card.classList.remove('highlighted');
    void card.offsetWidth; 
    card.classList.add('highlighted');
  }
}

// --- Three.js Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
// Scene background is kept transparent to let CSS ambient glows show through


const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 45, 35);
if (window.innerWidth < 768) { 
  camera.position.set(0, 65, 50); 
}
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1); // Force exactly 1 for maximum FPS on high-DPI laptops
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

const ambientLight = new THREE.AmbientLight(0xfffbf5, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
dirLight.position.set(10, 25, 15);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.mapSize.width = 512;
dirLight.shadow.mapSize.height = 512;
dirLight.shadow.radius = 4;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight('#F3EAD3', 0.5);
fillLight.position.set(-10, 15, -10);
scene.add(fillLight);

// Rim Light for Visibility
const rimLight = new THREE.DirectionalLight('#FFFFFF', 1.5);
rimLight.position.set(0, 5, -20); // Behind the products, low angle
scene.add(rimLight);

// --- Materials ---
const sleeveMaterial = new THREE.MeshPhysicalMaterial({ 
  color: 0xffffff,
  transmission: 0.85, // Lowered slightly to improve performance
  opacity: 0.85,
  roughness: 0.45,
  metalness: 0.0,
  thickness: 0.2, // Reduced thickness to simplify refraction calculations
  ior: 1.5,
  clearcoat: 0.0,
  envMapIntensity: 1.5,
  transparent: true
});

function createPaperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 80000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}
const paperBump = createPaperTexture();

const drawerMaterial = new THREE.MeshStandardMaterial({
  color: 0x4C5E51, // Softened, lighter, slightly desaturated sage-olive
  roughness: 1.0,
  bumpMap: paperBump,
  bumpScale: 0.008,
  metalness: 0.0
});

const insertMaterial = new THREE.MeshStandardMaterial({
  color: 0xD8D0C5, // Darkened, warmer beige for contrast
  roughness: 1.0,
  bumpMap: paperBump,
  bumpScale: 0.006,
  metalness: 0.0
});

const slotBaseMaterial = new THREE.MeshStandardMaterial({
  color: 0x8D8471, // Darkened to fake ambient occlusion inside cutouts
  roughness: 1.0,
});

// --- The Box ---
const boxGroup = new THREE.Group();
scene.add(boxGroup);

// Grid Layout Box
const slW = 32, slH = 7.5, slD = 20, th = 0.5;

// Outer Sleeve (Open on the RIGHT / +X side)
const outerSleeve = new THREE.Group();
boxGroup.add(outerSleeve);

// Top
const topGeo = new RoundedBoxGeometry(slW, th, slD, 2, 0.05);
const topMesh = new THREE.Mesh(topGeo, sleeveMaterial);
topMesh.position.y = slH/2 - th/2;
topMesh.castShadow = false; // Disabled to improve performance (translucent shadows are expensive)
topMesh.receiveShadow = true;
outerSleeve.add(topMesh);

// Bottom
const bottomGeo = new RoundedBoxGeometry(slW, th, slD, 2, 0.05);
const bottomMesh = new THREE.Mesh(bottomGeo, sleeveMaterial);
bottomMesh.position.y = -slH/2 + th/2;
bottomMesh.receiveShadow = true;
outerSleeve.add(bottomMesh);

// Front
const frontGeo = new RoundedBoxGeometry(slW, slH - 2*th, th, 2, 0.05);
const frontMesh = new THREE.Mesh(frontGeo, sleeveMaterial);
frontMesh.position.z = slD/2 - th/2;
frontMesh.receiveShadow = true;
outerSleeve.add(frontMesh);

// Back
const backGeo = new RoundedBoxGeometry(slW, slH - 2*th, th, 2, 0.05);
const backMesh = new THREE.Mesh(backGeo, sleeveMaterial);
backMesh.position.z = -slD/2 + th/2;
backMesh.receiveShadow = true;
outerSleeve.add(backMesh);

// Left Side
const leftGeo = new RoundedBoxGeometry(th, slH - 2*th, slD - 2*th, 2, 0.05);
const leftMesh = new THREE.Mesh(leftGeo, sleeveMaterial);
leftMesh.position.x = -slW/2 + th/2;
leftMesh.receiveShadow = true;
outerSleeve.add(leftMesh);

// Logo Texture on Top
const textureLoader = new THREE.TextureLoader();
const logoTexture = textureLoader.load(logoBase64);
const logoGeo = new THREE.PlaneGeometry(10, 4.5);
const logoMat = new THREE.MeshBasicMaterial({ 
  map: logoTexture, 
  transparent: true,
  depthWrite: false, // Prevents Z-fighting with frosted sleeve
  opacity: 0.85
});
const logoPlane = new THREE.Mesh(logoGeo, logoMat);
logoPlane.rotation.x = -Math.PI / 2;
logoPlane.position.y = slH/2 + 0.01; 
outerSleeve.add(logoPlane);

// Inner Drawer
const innerDrawer = new THREE.Group();
// Shift it slightly inside the sleeve initially
innerDrawer.position.x = 0; 
boxGroup.add(innerDrawer);

// Drawer solid floor (thinner base instead of a huge block)
const drW = slW - 0.2, drH = slH - 0.2, drD = slD - 0.2;
const drawerBaseGeo = new RoundedBoxGeometry(drW, th, drD, 2, 0.05);
const drawerBase = new THREE.Mesh(drawerBaseGeo, drawerMaterial);
drawerBase.position.y = -drH/2 + th/2;
drawerBase.receiveShadow = true;
innerDrawer.add(drawerBase);

// Right side wall of the drawer (the part you pull)
const pullWallGeo = new RoundedBoxGeometry(th, drH, drD, 2, 0.05);
const pullWall = new THREE.Mesh(pullWallGeo, drawerMaterial);
pullWall.position.x = drW/2 - th/2;
pullWall.castShadow = true;
pullWall.receiveShadow = true;
innerDrawer.add(pullWall);

// Front hit plane for grabbing the drawer (attached to the right wall)
const drawerHitGeo = new THREE.PlaneGeometry(slD + 4, slH + 4);
const drawerHitMat = new THREE.MeshBasicMaterial({
  visible: false,
  side: THREE.DoubleSide // Essential so the camera raycaster can hit its back face
});
const drawerHitPlane = new THREE.Mesh(drawerHitGeo, drawerHitMat);
drawerHitPlane.rotation.y = Math.PI / 2;
drawerHitPlane.position.set(drW/2, 0, 0);
innerDrawer.add(drawerHitPlane);

// Minimalist pull-tab
const tabGeo = new RoundedBoxGeometry(0.8, 2.0, 3.0, 2, 0.05);
const tabMesh = new THREE.Mesh(tabGeo, drawerMaterial);
tabMesh.position.set(drW/2 + 0.4, 0, 0); 
tabMesh.castShadow = true;
tabMesh.receiveShadow = true;
innerDrawer.add(tabMesh);

// --- Load Image Labels ---
function loadLabelTextures(path) {
  const texFront = textureLoader.load(path);
  texFront.colorSpace = THREE.SRGBColorSpace;
  texFront.minFilter = THREE.LinearMipmapLinearFilter;
  texFront.magFilter = THREE.LinearFilter;
  texFront.anisotropy = 16;
  texFront.generateMipmaps = true;
  texFront.repeat.set(1, 1);
  texFront.offset.set(0, 0);

  const texBack = textureLoader.load(path);
  texBack.colorSpace = THREE.SRGBColorSpace;
  texBack.minFilter = THREE.LinearMipmapLinearFilter;
  texBack.magFilter = THREE.LinearFilter;
  texBack.anisotropy = 16;
  texBack.generateMipmaps = true;
  texBack.repeat.set(1, 1);
  texBack.offset.set(0, 0);

  // CRITICAL FIX: Using transparent:false with alphaTest:0.5 puts the labels in the OPAQUE render queue.
  // This ensures they are properly captured by the sleeve's transmission pass and correctly depth-sorted against the glass bottles.
  // DoubleSide ensures flipped labels don't get backface-culled.
  return {
    front: new THREE.MeshStandardMaterial({ map: texFront, roughness: 0.9, metalness: 0.1, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide }),
    back: new THREE.MeshStandardMaterial({ map: texBack, roughness: 0.9, metalness: 0.1, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide })
  };
}

const labelMats = {
  cleanser: loadLabelTextures('./label_toner.png'),
  toner: loadLabelTextures('./label_cleanser.png'),
  mist: loadLabelTextures('./label_mist.png'),
  serum: loadLabelTextures('./label_serum.png'),
  moisturiser: loadLabelTextures('./label_moisturiser.png'),
  sunscreen: loadLabelTextures('./label_sunscreen.png')
};

// --- Products & Die-Cut Insert ---
const productsGroup = new THREE.Group();
// Products are sunk deeply into the drawer so they don't protrude out the top
productsGroup.position.y = 0.0;
innerDrawer.add(productsGroup);

const productMeshes = [];

// Positions in a single vertical linear row
// Rows along Z, spaced generously with X centered
const positions = [
  { x: -12.7, z: 0, id: 'mist' }, 
  { x: -7.5, z: 0, id: 'cleanser' },    
  { x: -2.05, z: 0, id: 'toner' },  
  { x: 2.5, z: 0, id: 'serum' },    
  { x: 7.45, z: 0, id: 'moisturiser' },      
  { x: 12.65, z: 0, id: 'sunscreen', flip: true }  
];

// Map product data
const productDataMap = {};
products.forEach(p => productDataMap[p.id] = p);

// Create the Extruded Insert Tray to simulate slots
const insertW = drW - 1.0, insertD = drD - 0.4;
const insertShape = new THREE.Shape();
insertShape.moveTo(-insertW/2, -insertD/2);
insertShape.lineTo(insertW/2, -insertD/2);
insertShape.lineTo(insertW/2, insertD/2);
insertShape.lineTo(-insertW/2, insertD/2);

const extrudeSettings = {
  depth: 2.5,
  bevelEnabled: true,
  bevelSegments: 2,
  steps: 1,
  bevelSize: 0.1,
  bevelThickness: 0.1
};

positions.forEach(pos => {
  const pData = productDataMap[pos.id] || products[0];
  
  // Custom dimensions per product
  let r = 1.4, h = 5.0, w = null, isSquare = false, isTube = false;
  if (pos.id === 'cleanser') { r = 2.4; h = 12.0; } // Cylindrical bottle
  else if (pos.id === 'toner') { r = 2.1; h = 9.0; }
  else if (pos.id === 'sunscreen') { r = 1.8; h = 10.0; isTube = true; } // Flattened
  else if (pos.id === 'serum') { r = 1.8; h = 8.5; }
  else if (pos.id === 'mist') { r = 1.8; h = 9.0; }
  else if (pos.id === 'moisturiser') { r = 2.2; h = 4.0; }
  
  // Calculate total height of product including caps/pumps
  let totalH = h;
  if (pos.id === 'cleanser') totalH = h + 4.0; 
  else if (pos.id === 'toner') totalH = h + 2.0;
  else if (pos.id === 'sunscreen') totalH = h + 2.0;
  else if (pos.id === 'serum') totalH = h + 2.5; 
  else if (pos.id === 'mist') totalH = h + 2.0;
  else if (pos.id === 'moisturiser') totalH = h + 1.0;

  const padding = 0.3;
  const holePath = new THREE.Path();
  
  // They lay flat along Z axis. Z stretches length (holeH), X stretches width (holeW)
  const holeH = totalH + padding * 2;
  let holeW = (isSquare ? w : r*2) + padding * 2;
  if (pos.id === 'sunscreen') holeW = (r*2) + padding * 2; // Flat tube width is still r*2 on X axis

  holePath.moveTo(pos.x - holeW/2, pos.z - holeH/2);
  holePath.lineTo(pos.x + holeW/2, pos.z - holeH/2);
  holePath.lineTo(pos.x + holeW/2, pos.z + holeH/2);
  holePath.lineTo(pos.x - holeW/2, pos.z + holeH/2);
  
  const slotGeo = new THREE.PlaneGeometry(holeW, holeH);
  insertShape.holes.push(holePath);

  // Add the base of the slot (darker plane underneath)
  const slotMesh = new THREE.Mesh(slotGeo, slotBaseMaterial);
  slotMesh.rotation.x = -Math.PI / 2;
  slotMesh.position.set(pos.x, -1.4, pos.z);
  slotMesh.receiveShadow = true;
  innerDrawer.add(slotMesh);

  // Add a dark bevel/outline to the inner edge of the slot to define separation
  const edgesGeo = new THREE.EdgesGeometry(slotGeo);
  const outlineMat = new THREE.LineBasicMaterial({ color: 0x1A1F18, transparent: true, opacity: 0.6 });
  const slotOutline = new THREE.LineSegments(edgesGeo, outlineMat);
  slotOutline.rotation.x = -Math.PI / 2;
  slotOutline.position.set(pos.x, -1.38, pos.z); // Hover slightly above base
  innerDrawer.add(slotOutline);
});

// Create Insert Geometry
const insertGeo = new THREE.ExtrudeGeometry(insertShape, extrudeSettings);
const insertMesh = new THREE.Mesh(insertGeo, insertMaterial);
insertMesh.rotation.x = Math.PI / 2;
// Positioned higher to envelop the products
insertMesh.position.y = 1.0;
insertMesh.receiveShadow = true;
insertMesh.castShadow = true;
innerDrawer.add(insertMesh);

// Build Products
const capsuleMeshes = [];
positions.forEach((pos) => {
  const pData = productDataMap[pos.id] || products[0];
  
  const prodGroup = new THREE.Group();
  
  let r = 1.4, h = 5.0, isSquare = false, isTube = false;
  if (pos.id === 'cleanser') { r = 2.4; h = 12.0; }
  else if (pos.id === 'toner') { r = 2.1; h = 9.0; }
  else if (pos.id === 'sunscreen') { r = 1.8; h = 10.0; isTube = true; }
  else if (pos.id === 'serum') { r = 1.8; h = 8.5; }
  else if (pos.id === 'mist') { r = 1.8; h = 9.0; }
  else if (pos.id === 'moisturiser') { r = 2.2; h = 4.0; }

  // Recalculate totalH to accurately center the product mesh over the hole
  let totalH = h;
  if (pos.id === 'cleanser') totalH = h + 4.0; 
  else if (pos.id === 'toner') totalH = h + 2.0;
  else if (pos.id === 'sunscreen') totalH = h + 2.0;
  else if (pos.id === 'serum') totalH = h + 2.5; 
  else if (pos.id === 'mist') totalH = h + 2.0;
  else if (pos.id === 'moisturiser') totalH = h + 1.0;

  // Lay flat along the Z-axis (pointing backwards)
  prodGroup.rotation.x = -Math.PI / 2;
  if (pos.flip) {
    prodGroup.rotation.z = Math.PI;
  }

  // Sunk securely into the slot tray floor (y = -1.4). Radius determines its centered Y-height.
  // Visual center correction: offset Z to perfectly center the asymmetric bottle caps inside their slots
  const zOffset = (totalH - h)/2;
  prodGroup.position.set(pos.x, -1.4 + r, pos.z + (pos.flip ? -zOffset : zOffset));
  
  const isGlass = pos.id === 'toner' || pos.id === 'serum' || pos.id === 'mist';
  
  const bodyMat = isGlass ? new THREE.MeshPhysicalMaterial({
    color: '#F4E8C1',
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.95,
    ior: 1.5,
    thickness: 0.05,
    clearcoat: 0.5, // Reduced from 1.0
    clearcoatRoughness: 0.1,
    transparent: true
  }) : new THREE.MeshStandardMaterial({
    color: '#F8F5EE',
    roughness: 0.8,
    metalness: 0.1
  });

  const capMat = new THREE.MeshStandardMaterial({
    color: '#3B4A3F',
    roughness: 0.2,
    metalness: 0.1
  });

  const liquidMat = new THREE.MeshStandardMaterial({
    color: '#FFFDF5', // Nearly transparent white/yellow for general use
    opacity: 0.85,
    transparent: true,
    roughness: 0.05
  });

  const liquidAmberMat = new THREE.MeshStandardMaterial({
    color: '#FFF2DB', // Extremely pale, near-clear warm tint
    opacity: 0.5,
    transparent: true,
    roughness: 0.05
  });

  const liquidDeepAmberMat = new THREE.MeshStandardMaterial({
    color: '#F9E0B9', // Very pale yellow tint
    opacity: 0.65,
    transparent: true,
    roughness: 0.05
  });

  const mats = labelMats[pos.id] || labelMats['cleanser'];

  function addCurvedLabels(targetBody, rTop, rBot, lHeight, isFlipped) {    
    // Force exact 1:1 aspect ratio to prevent stretching.
    const rAvg = (rTop + rBot) / 2 * 1.01;
    let theta = lHeight / rAvg;
    
    // Cap at Math.PI * 0.95 so front and back don't overlap
    if (theta > Math.PI * 0.95) {
      theta = Math.PI * 0.95;
      lHeight = theta * rAvg;
    }

    const geoFront = new THREE.CylinderGeometry(rTop*1.01, rBot*1.01, lHeight, 32, 10, true, -theta/2, theta);
    const meshFront = new THREE.Mesh(geoFront, mats.front);
    meshFront.renderOrder = 99; // CRITICAL FIX: Ensure transparent labels render on top of glass/liquids
    
    const geoBack = new THREE.CylinderGeometry(rTop*1.01, rBot*1.01, lHeight, 32, 10, true, Math.PI - theta/2, theta);
    const meshBack = new THREE.Mesh(geoBack, mats.back);
    meshBack.renderOrder = 99;

    // If the product is physically flipped upside down (pos.flip), we must rotate the labels 180° 
    // around their local Y axis so they face the camera (straight UP) instead of facing the tray floor.
    if (isFlipped) {
      meshFront.rotation.y = Math.PI;
      meshBack.rotation.y = Math.PI;
    }
    
    targetBody.add(meshFront);
    targetBody.add(meshBack);
  }

  let bodyMesh, capMesh;

  // 1. Cleanser (Cylindrical Pump Bottle)
  if (pos.id === 'cleanser') {
    const bodyGeo = new THREE.CylinderGeometry(r, r, h, 32);
    bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(r*0.95, r*0.95, h*0.95, 32), liquidMat);
    bodyMesh.add(liquidMesh);
    addCurvedLabels(bodyMesh, r, r, h*0.6, pos.flip);
    
    // Complex Pump
    const capGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(r*0.6, r*0.6, 0.8, 32);
    const stemGeo = new THREE.CylinderGeometry(r*0.2, r*0.2, 1.2, 32);
    const headGeo = new THREE.CylinderGeometry(r*0.6, r*0.6, 0.6, 32);
    
    const nozzleGeo = new THREE.CylinderGeometry(r*0.15, r*0.12, 1.5, 32);
    nozzleGeo.translate(0, 0.75, 0); 
    
    const baseM = new THREE.Mesh(baseGeo, capMat);
    const stemM = new THREE.Mesh(stemGeo, capMat);
    const headM = new THREE.Mesh(headGeo, capMat);
    const nozzleM = new THREE.Mesh(nozzleGeo, capMat);
    
    stemM.position.y = 1.0;
    headM.position.y = 1.9;
    nozzleM.position.set(0, 1.9, 0);
    nozzleM.rotation.x = -Math.PI / 2 - 0.2; 
    nozzleM.rotation.z = Math.PI;
    
    capGroup.add(baseM, stemM, headM, nozzleM);
    capGroup.position.y = h/2 + 0.4;
    capMesh = capGroup;
  }
  // 2. Toner (Square Shoulder)
  else if (pos.id === 'toner') {
    const bodyGeo = new THREE.CylinderGeometry(r, r, h, 32);
    bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(r*0.95, r*0.95, h*0.95, 32), liquidAmberMat);
    bodyMesh.add(liquidMesh);
    addCurvedLabels(bodyMesh, r, r, h*0.6, pos.flip);
    
    const capH = 1.5;
    const capGeo = new THREE.CylinderGeometry(r*0.9, r*0.9, capH, 32);
    capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.y = h/2 + capH/2;
  }
  // 3. Sunscreen (Flattened Tube)
  else if (pos.id === 'sunscreen') {
    const bodyGeo = new THREE.CylinderGeometry(r, r, h, 32, 32);
    const posAttr = bodyGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const py = posAttr.getY(i);
      const factor = 0.05 + 0.95 * ((py + h/2) / h);
      posAttr.setZ(i, posAttr.getZ(i) * factor);
    }
    bodyGeo.computeVertexNormals();

    bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({color: '#F8F5EE', roughness: 0.9}));
    
    const lHeight = h * 0.6;
    const lTop = h/2 - (h - lHeight)/2;
    const lBot = lTop - lHeight;
    
    const geoFront = new THREE.CylinderGeometry(r, r, lHeight, 32, 10, true, -Math.PI*0.4, Math.PI*0.8);
    const pFront = geoFront.attributes.position;
    for (let i = 0; i < pFront.count; i++) {
      const py = pFront.getY(i);
      const globalY = py + (lTop + lBot)/2;
      const factor = 0.05 + 0.95 * ((globalY + h/2) / h);
      pFront.setZ(i, pFront.getZ(i) * factor * 1.01);
      pFront.setX(i, pFront.getX(i) * 1.01);
    }
    geoFront.computeVertexNormals();
    const meshFront = new THREE.Mesh(geoFront, mats.front);
    meshFront.renderOrder = 99;
    
    if (pos.flip) {
      meshFront.rotation.y = Math.PI;
    }
    bodyMesh.add(meshFront);
    
    const capH = 1.2;
    const capGeo = new THREE.CylinderGeometry(r, r, capH, 32);
    // The top of the tube is fully round, so the cap must also be fully round.
    // Removed the code that erroneously flattened the cap.
    capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.y = h/2 + capH/2;
  }
  // 4. Serum (Dropper)
  else if (pos.id === 'serum') {
    const bodyGeo = new THREE.CylinderGeometry(r, r, h, 32);
    bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(r*0.95, r*0.95, h*0.95, 32), liquidAmberMat);
    bodyMesh.add(liquidMesh);
    addCurvedLabels(bodyMesh, r, r, h*0.6, pos.flip);
    
    const capH = 1.0;
    const capGeo = new THREE.CylinderGeometry(r, r, capH, 32);
    const bulbGeo = new THREE.SphereGeometry(r*0.6, 32, 32);
    
    const capGroup = new THREE.Group();
    const capBase = new THREE.Mesh(capGeo, capMat);
    const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshStandardMaterial({color: '#EEEEEE', roughness: 0.9}));
    bulb.position.y = capH/2 + r*0.4;
    
    capGroup.add(capBase, bulb);
    capGroup.position.y = h/2 + capH/2;
    capMesh = capGroup;
  }
  // 5. Mist (Spray)
  else if (pos.id === 'mist') {
    const bodyGeo = new THREE.CylinderGeometry(r, r, h, 32);
    bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(r*0.95, r*0.95, h*0.95, 32), liquidDeepAmberMat);
    bodyMesh.add(liquidMesh);
    addCurvedLabels(bodyMesh, r, r, h*0.6, pos.flip);
    
    const capH = 1.2;
    const capGeo = new THREE.CylinderGeometry(r, r, capH, 32);
    capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.y = h/2 + capH/2;
  }
  // 6. Moisturiser (Jar)
  else if (pos.id === 'moisturiser') {
    const jarR = 2.4, jarH = 3.5;
    const bodyGeo = new THREE.CylinderGeometry(jarR, jarR, jarH, 32);
    const moistMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.85,
      thickness: 0.1,
      roughness: 0.05,
      ior: 1.5,
      transparent: true
    });
    bodyMesh = new THREE.Mesh(bodyGeo, moistMat);
    
    const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(jarR*0.95, jarR*0.95, jarH*0.9, 32), liquidMat);
    bodyMesh.add(liquidMesh);
    
    addCurvedLabels(bodyMesh, jarR, jarR, jarH*0.85, pos.flip);
    
    const capH = 0.8;
    const capGeo = new THREE.CylinderGeometry(jarR*1.05, jarR*1.05, capH, 32);
    capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.y = jarH/2 + capH/2;
  }

  // Add 'Oil Capsule' Particles
  if (pos.id === 'toner' || pos.id === 'serum' || pos.id === 'moisturiser') {
    const particleCount = 40; // Hard capped to 40 for optimal performance
    const beadGeo = new THREE.SphereGeometry(0.05, 16, 16); 
    // CRITICAL FIX: InstancedMesh with transparent:true does not depth-sort its instances, causing them to look like a solid mass.
    // By using an OPAQUE material, the Z-buffer sorts them perfectly. The liquid around them is already transparent.
    const beadMat = new THREE.MeshStandardMaterial({
      color: '#FFD700', // Rich bright gold
      roughness: 0.1,
      metalness: 0.5,
      emissive: '#442200' // Increased glow to compensate for lack of post-processing bloom
    });
    
    const instancedBeads = new THREE.InstancedMesh(beadGeo, beadMat, particleCount);
    const dummy = new THREE.Object3D();
    
    const targetR = pos.id === 'moisturiser' ? 2.4 : r;
    const targetH = pos.id === 'moisturiser' ? 3.5 : h;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Use uniform distribution across volume so they are evenly separated
      const rad = Math.pow(Math.random(), 0.5) * targetR * 0.85; 
      const py = (Math.random() - 0.5) * targetH * 0.8;
      
      dummy.position.set(Math.cos(angle) * rad, py, Math.sin(angle) * rad);
      const scale = 0.5 + Math.random() * 0.7;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      instancedBeads.setMatrixAt(i, dummy.matrix);
    }
    
    bodyMesh.add(instancedBeads);
    capsuleMeshes.push(instancedBeads);
  }

  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  prodGroup.add(bodyMesh);
  
  if (capMesh) {
    capMesh.castShadow = true;
    capMesh.receiveShadow = true;
    prodGroup.add(capMesh);
  }
  
  // Invisible hit box encompassing the whole product
  const hitGeo = new THREE.CylinderGeometry(r*1.4, r*1.4, h + 3.0, 16);
  const hitMat = new THREE.MeshBasicMaterial({visible: false});
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.position.y = 0;
  hitMesh.userData = { id: pos.id, isProduct: true, targetBody: bodyMesh };
  prodGroup.add(hitMesh);
  
  productsGroup.add(prodGroup);
  productMeshes.push(hitMesh);
});

// --- Interaction Logic ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let drawerOpened = false;
let dragDistance = 0;

const MAX_SLIDE_DISTANCE = 31.5;

function onPointerDown(event) {
  if (window.scrollY > window.innerHeight) return;
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (!drawerOpened) {
    const intersectsDrawer = raycaster.intersectObject(drawerHitPlane);
    if (intersectsDrawer.length > 0) {
      isDragging = true;
      dragDistance = 0;
      document.body.style.cursor = 'grabbing';
      previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  } else {
    // Drawer is open, check for product clicks
    const intersectsProducts = raycaster.intersectObjects(productMeshes);
    if (intersectsProducts.length > 0) {
      const prod = intersectsProducts[0].object;
      scrollToProduct(prod.userData.id);
    }
  }
}

function onPointerMove(event) {
  if (window.scrollY > window.innerHeight) return;
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (!drawerOpened && !isDragging) {
    const intersectsDrawerMove = raycaster.intersectObject(drawerHitPlane);
    if (intersectsDrawerMove.length > 0) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = 'default';
    }
  }

  if (isDragging && !drawerOpened) {
    dragDistance += Math.abs(event.clientX - previousMousePosition.x);
    const deltaX = event.clientX - previousMousePosition.x;
    
    // Map horizontal mouse drag to X-axis slide (Left to Right)
    const pullAmount = deltaX * 0.08; 
    innerDrawer.position.x += pullAmount;

    // Clamp translation strictly
    innerDrawer.position.x = Math.min(Math.max(innerDrawer.position.x, 0), MAX_SLIDE_DISTANCE);

    if (innerDrawer.position.x >= MAX_SLIDE_DISTANCE) {
      drawerOpened = true;
      isDragging = false;
      document.body.style.cursor = 'default';
      const indicator = document.getElementById('drag-indicator');
      if (indicator) indicator.classList.remove('visible');
    }
    
    previousMousePosition = { x: event.clientX, y: event.clientY };
  } else if (drawerOpened) {
    const intersects = raycaster.intersectObjects(productMeshes);
    
    productMeshes.forEach(mesh => {
      if (mesh.userData.targetBody) {
        mesh.userData.targetBody.material.emissive.setHex(0x000000);
      }
      document.body.style.cursor = 'default';
    });

    if (intersects.length > 0) {
      const prod = intersects[0].object;
      if (prod.userData.targetBody) {
        // Subtle emissive glow on hover
        prod.userData.targetBody.material.emissive.setHex(0x334422); 
      }
      document.body.style.cursor = 'pointer';
    }
  }
}

function onPointerUp() {
  if (isDragging && !drawerOpened) {
    isDragging = false;
    document.body.style.cursor = 'grab';
    
    // If the user barely dragged, treat it as a click and open automatically
    if (dragDistance < 10) {
      animateDrawer(MAX_SLIDE_DISTANCE, () => {
        drawerOpened = true;
        const indicator = document.getElementById('drag-indicator');
        if (indicator) indicator.classList.remove('visible');
      });
    } else if (innerDrawer.position.x < 2.0) {
      animateDrawer(0);
    } else {
      animateDrawer(MAX_SLIDE_DISTANCE, () => {
        drawerOpened = true;
        const indicator = document.getElementById('drag-indicator');
        if (indicator) indicator.classList.remove('visible');
      });
    }
  }
}

let currentAnimationId = null;

function animateDrawer(targetX, callback) {
  if (currentAnimationId) cancelAnimationFrame(currentAnimationId);
  function step() {
    if (isDragging) return; // Cancel animation if user grabs the drawer
    const diff = targetX - innerDrawer.position.x;
    if (Math.abs(diff) > 0.1) {
      innerDrawer.position.x += diff * 0.15;
      currentAnimationId = requestAnimationFrame(step);
    } else {
      innerDrawer.position.x = targetX;
      if (callback) callback();
    }
  }
  step();
}

function startIdleAnimation() {
  let loops = 0;
  const loopMax = 3;
  function peek() {
    if (isDragging || drawerOpened) return; 
    animateDrawer(1.5, () => {
      if (isDragging || drawerOpened) return;
      setTimeout(() => {
        if (isDragging || drawerOpened) return;
        animateDrawer(0, () => {
          loops++;
          if (loops < loopMax) {
            setTimeout(peek, 800);
          }
        });
      }, 300);
    });
  }
  setTimeout(peek, 800);
}

window.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let fpsLastTime = performance.now();
let fpsFrames = 0;
let fpsDowngraded = false;

function animate() {
  requestAnimationFrame(animate);
  
  const now = performance.now();
  fpsFrames++;
  if (now - fpsLastTime >= 1000) {
    const fps = fpsFrames;
    fpsFrames = 0;
    fpsLastTime = now;
    if (fps < 45 && !fpsDowngraded) {
      fpsDowngraded = true;
      outerSleeve.children.forEach(child => {
        if (child.isMesh && child !== logoPlane) { // Protect the logo from being overwritten
          child.material = new THREE.MeshStandardMaterial({
            transparent: true, 
            opacity: 0.65,  
            roughness: 0.2, 
            metalness: 0.1, 
            color: 0xeef3ed
          });
        }
      });
      console.warn(`Performance Downgrade: FPS dropped to ${fps}. Outer sleeve switched to MeshStandardMaterial.`);
    }
  }

  // Dynamic conditional visibility for capsules
  capsuleMeshes.forEach(mesh => {
    mesh.visible = drawerOpened;
  });

  if (!drawerOpened && !isDragging) {
    boxGroup.position.y = Math.sin(Date.now() * 0.001) * 0.5;
  } else if (drawerOpened) {
    boxGroup.position.y += (0 - boxGroup.position.y) * 0.1;
  }

  // Dynamic Camera Tracking
  camera.position.x += ((innerDrawer.position.x / 2) - camera.position.x) * 0.1;
  camera.lookAt(camera.position.x, 0, 0);

  // Very subtle parallax
  if (drawerOpened || isDragging) {
    scene.rotation.y += (mouse.x * 0.05 - scene.rotation.y) * 0.05;
    scene.rotation.x += (-mouse.y * 0.05 - scene.rotation.x) * 0.05;
  }

  renderer.render(scene, camera);
}

window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  const progress = document.getElementById('progress');
  if (progress) progress.style.width = '100%';
  setTimeout(() => {
    if (loader) loader.style.opacity = '0';
    setTimeout(() => { 
      if(loader) loader.remove();
      startIdleAnimation();
    }, 1000);
  }, 500);
  animate();
});


