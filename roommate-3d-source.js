import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const floorImages = {
  walnut: 'interior-plan-floor-walnut.webp',
  oak: 'interior-plan-floor-oak.webp',
  stone: 'interior-plan-floor-stone.webp',
};

const finishColors = {
  walls: { lime: '#e2cfaf', chalk: '#ede7da', sage: '#a8b095' },
  door: { oak: '#b4804e', walnut: '#65432c', chalk: '#e6ddd1' },
  window: { oak: '#966132', chalk: '#e3d9cc', graphite: '#433e3a' },
  rug: { jute: '#b3986c', grey: '#aba7a1' },
};

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.77, ...options });
}

function box(group, dimensions, position, surface, radius = 0) {
  const geometry = radius
    ? new RoundedBoxGeometry(...dimensions, 3, radius)
    : new THREE.BoxGeometry(...dimensions);
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function cylinder(group, radii, height, position, surface) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(...radii, height, 32), surface);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function clear(group) {
  const materials = new Set();
  group.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    materials.add(object.material);
  });
  materials.forEach(surface => surface.dispose());
  group.clear();
}

function legs(group, width, depth, height, surface) {
  for (const x of [-width * 0.36, width * 0.36]) {
    for (const z of [-depth * 0.36, depth * 0.36]) {
      cylinder(group, [0.018, 0.013], height, [x, height / 2, z], surface);
    }
  }
}

function makeBed(group, w, d, h, product) {
  const frame = material(product.color || '#af9680');
  const linen = material('#e4d8c5');
  const pillow = material('#f4ebdc');
  const throwColor = material(product.accent || '#71654a');
  const wood = material('#644632');
  legs(group, w, d, 0.13, wood);
  box(group, [w, 0.22, d], [0, 0.24, 0], frame, 0.055);
  box(group, [w, h, 0.1], [0, h / 2, -d / 2 + 0.05], frame, 0.047);
  box(group, [w - 0.07, 0.19, d - 0.17], [0, 0.43, 0.055], linen, 0.065);
  box(group, [w - 0.045, 0.086, d * 0.66], [0, 0.55, d * 0.143], linen, 0.042);
  for (const x of [-w / 4, w / 4]) {
    const cushion = box(group, [w * 0.43, 0.12, 0.43], [x, 0.57, -d * 0.29], pillow, 0.057);
    cushion.rotation.y = x < 0 ? -0.06 : 0.06;
  }
  box(group, [w - 0.06, 0.035, d * 0.245], [0, 0.607, d * 0.31], throwColor, 0.016);
  box(group, [w - 0.06, 0.115, 0.023], [0, 0.55, d * 0.43], throwColor, 0.011);
}

function makeTable(group, w, d, h, product) {
  const wood = material(product.color || '#946445');
  const handle = material('#40302a', { metalness: 0.35 });
  legs(group, w, d, h * 0.17, wood);
  box(group, [w, h * 0.83, d], [0, h * 0.585, 0], wood, 0.012);
  for (const y of [h * 0.45, h * 0.73]) {
    box(group, [w * 0.91, h * 0.24, 0.02], [0, y, d * 0.5], wood, 0.008);
    box(group, [w * 0.27, 0.013, 0.03], [0, y, d * 0.53], handle, 0.005);
  }
}

function makeChair(group, w, d, h, product) {
  const cloth = material(product.color || '#d8c6ac');
  const wood = material(product.accent || '#916241');
  legs(group, w, d, h * 0.34, wood);
  box(group, [w * 0.86, 0.195, d * 0.82], [0, h * 0.4, d * 0.06], cloth, 0.08);
  const back = box(group, [w * 0.89, h * 0.63, 0.17], [0, h * 0.635, -d * 0.31], cloth, 0.073);
  back.rotation.x = -0.12;
  for (const x of [-w * 0.441, w * 0.441]) {
    box(group, [0.074, 0.071, d * 0.83], [x, h * 0.62, 0], wood, 0.034);
    box(group, [0.049, h * 0.29, 0.06], [x, h * 0.49, d * 0.27], wood, 0.015);
  }
}

function makeTV(group, w, d, h) {
  const casing = material('#252321', { roughness: 0.36, metalness: 0.27 });
  const screen = material('#1c2325', { roughness: 0.24, metalness: 0.22 });
  const center = 1.1;
  cylinder(group, [0.022, 0.022], center, [0, center / 2, d / 2 - 0.013], casing);
  box(group, [w * 0.45, 0.028, 0.23], [0, 0.014, -0.052], casing, 0.012);
  box(group, [w, h, d], [0, center, 0], casing, 0.013);
  box(group, [w * 0.975, h * 0.952, 0.012], [0, center, -d / 2], screen, 0.006);
}

function makeLamp(group, w, d, h, product, lightOn) {
  const metal = material(product.color || '#815630', { metalness: 0.27 });
  const shadeWidth = Math.min(w, d);
  const shade = material(product.shade || '#c39a68', { emissive: '#ffbf70', emissiveIntensity: lightOn ? 0.36 : 0 });
  const reach = Math.max(0, (w - d) / 2);
  cylinder(group, [shadeWidth * 0.48, shadeWidth * 0.51], 0.034, [-reach, 0.017, 0], metal);
  cylinder(group, [0.013, 0.013], h - 0.08, [-reach, (h - 0.08) / 2, 0], metal);
  if (reach > 0.05) box(group, [reach * 2 + 0.025, 0.028, 0.028], [0, h - 0.08, 0], metal, 0.008);
  cylinder(group, [shadeWidth * 0.28, shadeWidth * 0.49], 0.21, [reach, h - 0.105, 0], shade);
  if (lightOn) {
    const lampLight = new THREE.PointLight('#ffb96c', 12, 3, 2);
    lampLight.position.set(reach, h - 0.24, 0);
    group.add(lampLight);
  }
}

const constructors = {
  bed: makeBed, table: makeTable, tableLeft: makeTable, chair: makeChair, tv: makeTV, lamp: makeLamp,
};

function shell(scene, furnishings, edges, settings, textures) {
  const width = settings.room.width / 100;
  const depth = settings.room.depth / 100;
  const halfW = width / 2;
  const halfD = depth / 2;
  const wallHeight = 2.56;
  const thickness = 0.12;
  const wall = material(finishColors.walls[settings.finishes.walls]);
  const skirting = material('#c4ac8c');
  const windowFrame = material(finishColors.window[settings.finishes.window]);
  const doorWood = material(finishColors.door[settings.finishes.door]);
  const glass = material('#bfd0c8', { transparent: true, opacity: 0.17, depthWrite: false });
  const floorBases = { walnut: '#987655', oak: '#e1c6a4', stone: '#cbbc9f', smoked: '#513722' };
  const floorKey = settings.finishes.floor;
  const map = textures[floorKey === 'smoked' ? 'walnut' : floorKey];
  const floorColor = map ? (floorKey === 'smoked' ? '#aa9683' : '#ffffff') : floorBases[floorKey];
  const floor = material(floorColor, { map: map ?? null });
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floor);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);
  box(scene, [width + 0.2, 0.12, depth + 0.2], [0, -0.061, 0], skirting, 0.015);

  const [north, east, south, west] = edges;
  const windowStart = -halfW + width * 0.16;
  const windowWidth = width * 0.47;
  const windowEnd = windowStart + windowWidth;
  const windowX = windowStart + windowWidth / 2;
  const northZ = -halfD - thickness / 2;
  const southZ = halfD + thickness / 2;
  const northLeft = windowStart + halfW;
  const northRight = halfW - windowEnd;
  box(north, [northLeft, wallHeight, thickness], [-halfW + northLeft / 2, wallHeight / 2, northZ], wall);
  box(north, [northRight, wallHeight, thickness], [windowEnd + northRight / 2, wallHeight / 2, northZ], wall);
  box(north, [windowWidth, 0.87, thickness], [windowX, 0.435, northZ], wall);
  box(north, [windowWidth, 0.52, thickness], [windowX, 2.3, northZ], wall);
  const windowBottom = 0.87;
  const windowHeight = 1.17;
  for (const y of [windowBottom, windowBottom + windowHeight]) {
    box(north, [windowWidth, 0.058, 0.118], [windowX, y, northZ], windowFrame, 0.008);
  }
  for (const x of [windowStart, windowX, windowEnd]) {
    box(north, [0.057, windowHeight, 0.098], [x, windowBottom + windowHeight / 2, northZ], windowFrame, 0.007);
  }
  box(north, [windowWidth - 0.04, windowHeight - 0.05, 0.013], [windowX, windowBottom + windowHeight / 2, northZ], glass).castShadow = false;
  box(north, [windowWidth + 0.06, 0.055, 0.24], [windowX, windowBottom - 0.043, northZ + 0.05], windowFrame, 0.008);
  box(east, [thickness, wallHeight, depth], [halfW + thickness / 2, wallHeight / 2, 0], wall);
  box(west, [thickness, wallHeight, depth], [-halfW - thickness / 2, wallHeight / 2, 0], wall);
  box(east, [0.03, 0.068, depth], [halfW - 0.012, 0.034, 0], skirting);
  box(west, [0.03, 0.068, depth], [-halfW + 0.012, 0.034, 0], skirting);
  const doorStart = -halfW + width * 0.1;
  const doorWidth = width * 0.23;
  const doorEnd = doorStart + doorWidth;
  const southLeft = doorStart + halfW;
  const southRight = halfW - doorEnd;
  box(south, [southLeft, wallHeight, thickness], [-halfW + southLeft / 2, wallHeight / 2, southZ], wall);
  box(south, [southRight, wallHeight, thickness], [doorEnd + southRight / 2, wallHeight / 2, southZ], wall);
  box(south, [doorWidth, 0.46, thickness], [doorStart + doorWidth / 2, 2.33, southZ], wall);
  const door = new THREE.Group();
  door.position.set(doorStart, 0, southZ);
  door.rotation.y = -1.13;
  box(door, [doorWidth - 0.02, 2.06, 0.045], [doorWidth / 2, 1.055, 0], doorWood, 0.012);
  const metal = material('#42352b', { metalness: 0.54 });
  box(door, [0.095, 0.02, 0.078], [doorWidth - 0.1, 1.02, 0], metal, 0.009);
  south.add(door);
  if (settings.finishes.rug !== 'none') {
    box(scene, [width * 0.64, 0.023, depth * 0.43], [width * 0.09, 0.012, depth * 0.015], material(finishColors.rug[settings.finishes.rug]), 0.011);
  }

  Object.entries(settings.items).forEach(([slot, product]) => {
    if (!product) return;
    const { width: w, depth: d, height: h, x, z } = product;
    const object = new THREE.Group();
    object.userData.slot = slot;
    object.position.set((x + w / 2) / 100 - halfW, 0, (z + d / 2) / 100 - halfD);
    if (slot === 'chair') object.rotation.y = 0.39;
    constructors[slot](object, w / 100, d / 100, h / 100, product, settings.lightOn);
    furnishings.add(object);
  });
}

function create(host, onSelect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e5dbcb');
  const camera = new THREE.PerspectiveCamera(37, 1, 0.05, 50);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.21;
  host.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.45;
  const room = new THREE.Group();
  const furnishings = new THREE.Group();
  const edges = Array.from({ length: 4 }, () => new THREE.Group());
  scene.add(room, furnishings, ...edges);
  const daylight = new THREE.DirectionalLight('#ffe6c4', 2.7);
  daylight.position.set(-3.2, 6.2, -4.3);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(1536, 1536);
  daylight.shadow.camera.left = -4;
  daylight.shadow.camera.right = 4;
  daylight.shadow.camera.top = 4;
  daylight.shadow.camera.bottom = -4;
  daylight.shadow.bias = -0.0003;
  daylight.shadow.normalBias = 0.018;
  scene.add(new THREE.HemisphereLight('#fffbec', '#aa8d71', 2.05), daylight);

  function draw() {
    if (!host.clientWidth || !host.clientHeight) return;
    const overhead = controls.getPolarAngle() < 0.24;
    const { x, z } = camera.position;
    [edges[0].visible, edges[1].visible, edges[2].visible, edges[3].visible] = overhead
      ? [true, true, true, true]
      : [z > -0.75, x < 0.75, z < 0.75, x > -0.75];
    renderer.render(scene, camera);
  }

  function sizeCanvas() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    draw();
  }

  const loader = new THREE.TextureLoader();
  const textures = {};
  const loadingTextures = new Set();
  let latest;
  const textureKey = floor => floor === 'smoked' ? 'walnut' : floor;

  function update(settings) {
    latest = settings;
    const key = textureKey(settings.finishes.floor);
    if (window.location.protocol !== 'file:' && !textures[key] && !loadingTextures.has(key)) {
      loadingTextures.add(key);
      loader.load(floorImages[key], texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        textures[key] = texture;
        if (textureKey(latest.finishes.floor) === key) update(latest);
      }, undefined, () => loadingTextures.delete(key));
    }
    [room, furnishings, ...edges].forEach(clear);
    shell(room, furnishings, edges, settings, textures);
    draw();
  }

  function view(preset) {
    sizeCanvas();
    const fit = Math.max(1, 0.98 / camera.aspect);
    controls.target.set(0, preset === 'top' ? 0.22 : 0.63, 0);
    if (preset === 'top') camera.position.set(0, 8.7 * fit, 0.001);
    else camera.position.set(4.95 * fit, 5.45 * fit, 6.6 * fit);
    controls.update();
    draw();
  }

  function rotate(angle) {
    const offset = camera.position.clone().sub(controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    draw();
  }

  const ray = new THREE.Raycaster();
  let press;
  renderer.domElement.addEventListener('pointerdown', event => {
    press = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointerup', event => {
    if (!press || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    ), camera);
    const hit = ray.intersectObjects(furnishings.children)[0];
    let object = hit?.object;
    while (object && !object.userData.slot) object = object.parent;
    if (object) onSelect(object.userData.slot);
  });
  new ResizeObserver(sizeCanvas).observe(host);
  controls.addEventListener('change', draw);
  view('perspective');
  return { update, view, rotate };
}

window.RoomMate3D = { create };
