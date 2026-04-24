import { MAP_CONFIG } from '../models/mapData.js';
import { unitTemplates, placedUnits } from '../models/unitDictionary.js';
import { getCanvasState } from './mapRenderer.js';

let placementMode = false;
let selectedTemplateKey = null;
let selectedFaction = 'player';
let placementCount = 1;

let isDragging = false;
let hasDragged = false;
let lastMousePos = { x: 0, y: 0 };

export function setPlacementMode(val) { placementMode = val; }
export function setSelectedTemplate(val) { selectedTemplateKey = val; }
export function setSelectedFaction(val) { selectedFaction = val; }
export function setPlacementCount(val) { placementCount = val; }

export function initInputHandler() {
    const { canvas, camera } = getCanvasState();
    if(!canvas) return;

    const container = document.getElementById('map-container');

    container.addEventListener('mousedown', (e) => {
        if (e.button === 0 || e.button === 1) {
            isDragging = true;
            hasDragged = false;
            lastMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (!hasDragged && placementMode && selectedTemplateKey && isDragging) {
            placeUnitsAtMouse(e, canvas, camera);
        }
        isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            hasDragged = true;
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;

            camera.x -= dx / camera.zoom;
            camera.y -= dy / camera.zoom;

            camera.x = Math.max(0, Math.min(camera.x, MAP_CONFIG.WIDTH - canvas.width / camera.zoom));
            camera.y = Math.max(0, Math.min(camera.y, MAP_CONFIG.HEIGHT - canvas.height / camera.zoom));

            lastMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomAmount = 0.05;
        const oldZoom = camera.zoom;

        if (e.deltaY < 0) {
            camera.zoom = Math.min(camera.zoom + zoomAmount, 2);
        } else {
            camera.zoom = Math.max(camera.zoom - zoomAmount, 0.1);
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX / oldZoom) + camera.x;
        const worldY = (mouseY / oldZoom) + camera.y;

        camera.x = worldX - (mouseX / camera.zoom);
        camera.y = worldY - (mouseY / camera.zoom);

        camera.x = Math.max(0, Math.min(camera.x, MAP_CONFIG.WIDTH - canvas.width / camera.zoom));
        camera.y = Math.max(0, Math.min(camera.y, MAP_CONFIG.HEIGHT - canvas.height / camera.zoom));
    }, { passive: false });
}

function placeUnitsAtMouse(e, canvas, camera) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX / camera.zoom) + camera.x;
    const worldY = (mouseY / camera.zoom) + camera.y;

    const template = unitTemplates[selectedTemplateKey];
    if(!template) return;

    // Place multiple units in a small cluster
    for(let i=0; i<placementCount; i++) {
        // Jitter for multiple placements
        let jx = (Math.random() - 0.5) * 100 * (placementCount > 1 ? 1 : 0);
        let jy = (Math.random() - 0.5) * 100 * (placementCount > 1 ? 1 : 0);

        const unit = {
            ...template,
            id: 'u_' + Date.now() + '_' + i + Math.floor(Math.random()*1000),
            faction: selectedFaction,
            x: Math.max(0, Math.min(MAP_CONFIG.WIDTH, worldX + jx)),
            y: Math.max(0, Math.min(MAP_CONFIG.HEIGHT, worldY + jy)),
            maxAmmo: template.ammo,
            currentAmmo: template.ammo,
            state: 'idle',
            targetId: null,
            suppression: 0, // 0 to 1
            visualEffects: []
        };
        placedUnits.push(unit);
    }
}
