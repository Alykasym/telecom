import { MAP_CONFIG, mapData } from '../models/mapData.js';
import { unitTemplates, placedUnits } from '../models/unitDictionary.js';
import { getCanvasState } from './mapRenderer.js';

let placementMode = false;
let selectedTemplateKey = null;
let selectedFaction = 'player';
let placementCount = 1;
let placementFormation = 'cluster';

let isDragging = false;
let hasDragged = false;
let lastMousePos = { x: 0, y: 0 };

export let selectedUnit = null; // For editing
let isDraggingUnit = false;

// Map Editor state
let activeMapTool = 'none'; // none, hill, road
let roadStartPoint = null;

export function setPlacementMode(val) { placementMode = val; }
export function setSelectedTemplate(val) { selectedTemplateKey = val; }
export function setSelectedFaction(val) { selectedFaction = val; }
export function setPlacementCount(val) { placementCount = val; }
export function setPlacementFormation(val) { placementFormation = val; }
export function setActiveMapTool(val) { activeMapTool = val; roadStartPoint = null; }

export function initInputHandler() {
    const { canvas, camera } = getCanvasState();
    if(!canvas) return;

    const container = document.getElementById('map-container');

    container.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left click
            const { worldX, worldY } = getMouseWorldPos(e, canvas, camera);

            // Check if clicking on an existing unit
            let clickedUnit = null;
            for(let i = placedUnits.length - 1; i >= 0; i--) {
                let u = placedUnits[i];
                if(Math.hypot(u.x - worldX, u.y - worldY) < 25) { // 25 is roughly unit radius
                    clickedUnit = u;
                    break;
                }
            }

            if(clickedUnit) {
                selectedUnit = clickedUnit;
                isDraggingUnit = true;
                updateUnitInfoPanel();
                // Prevent map drag
                return;
            } else {
                selectedUnit = null;
                updateUnitInfoPanel();
            }
        }

        if (e.button === 0 || e.button === 1) {
            isDragging = true;
            hasDragged = false;
            lastMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    window.addEventListener('mouseup', (e) => {
        if(isDraggingUnit) {
            isDraggingUnit = false;
        } else if (!hasDragged && isDragging) {
            if(activeMapTool !== 'none') {
                handleMapEditorClick(e, canvas, camera);
            } else if (placementMode && selectedTemplateKey) {
                placeUnitsAtMouse(e, canvas, camera);
            }
        }
        isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
        if(isDraggingUnit && selectedUnit) {
            const { worldX, worldY } = getMouseWorldPos(e, canvas, camera);
            selectedUnit.x = Math.max(0, Math.min(MAP_CONFIG.WIDTH, worldX));
            selectedUnit.y = Math.max(0, Math.min(MAP_CONFIG.HEIGHT, worldY));
        } else if (isDragging) {
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

    // Handle delete key
    document.addEventListener('keydown', (e) => {
        if((e.key === 'Delete' || e.key === 'Backspace') && selectedUnit) {
            deleteSelectedUnit();
        }
    });

    // Handle UI delete button
    const btnDelete = document.getElementById('btn-delete-unit');
    if (btnDelete) btnDelete.addEventListener('click', deleteSelectedUnit);

    // Listen for custom event from dataManager
    document.addEventListener('clearSelection', () => {
        selectedUnit = null;
        updateUnitInfoPanel();
    });
}

function handleMapEditorClick(e, canvas, camera) {
    const { worldX, worldY } = getMouseWorldPos(e, canvas, camera);

    if (activeMapTool === 'hill') {
        const elevation = parseFloat(document.getElementById('map-hill-elevation').value) || 2;
        const radius = parseFloat(document.getElementById('map-hill-radius').value) || 400;

        mapData.hills.push({
            x: worldX,
            y: worldY,
            radius: radius,
            elevation: elevation
        });
    } else if (activeMapTool === 'road') {
        if (!roadStartPoint) {
            roadStartPoint = { x: worldX, y: worldY };
        } else {
            const type = document.getElementById('map-road-type').value || 'dirt';
            let width = 20;
            let speedMultiplier = 1.5;
            if (type === 'highway') {
                width = 40;
                speedMultiplier = 2.5;
            }

            mapData.roads.push({
                start: { x: roadStartPoint.x, y: roadStartPoint.y },
                end: { x: worldX, y: worldY },
                width: width,
                type: type,
                speedMultiplier: speedMultiplier
            });
            roadStartPoint = null;
        }
    }
}

function getMouseWorldPos(e, canvas, camera) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    return {
        worldX: (mouseX / camera.zoom) + camera.x,
        worldY: (mouseY / camera.zoom) + camera.y
    };
}

function deleteSelectedUnit() {
    if(!selectedUnit) return;
    const idx = placedUnits.findIndex(u => u.id === selectedUnit.id);
    if(idx !== -1) {
        placedUnits.splice(idx, 1);
    }
    selectedUnit = null;
    updateUnitInfoPanel();
}

export function updateUnitInfoPanel() {
    const panel = document.getElementById('unit-info-panel');
    const content = document.getElementById('unit-info-content');
    if(!panel || !content) return;

    if(selectedUnit) {
        panel.style.display = 'block';
        // Prevent XSS by using textContent for text nodes and minimal safe HTML
        content.innerHTML = '';
        const strong = document.createElement('strong');
        strong.textContent = `${selectedUnit.icon} ${selectedUnit.name}`;
        content.appendChild(strong);
        content.appendChild(document.createElement('br'));

        const info = document.createTextNode(
            `Faction: ${selectedUnit.faction}\n` +
            `Armor: ${selectedUnit.armor}\n` +
            `Weapon: ${selectedUnit.weapon}\n` +
            `Range: ${selectedUnit.range}m\n` +
            `Ammo: ${selectedUnit.currentAmmo}/${selectedUnit.maxAmmo}`
        );

        // Wrap in a pre to preserve newlines nicely, or just string replaces
        const pre = document.createElement('pre');
        pre.style.fontFamily = 'inherit';
        pre.style.margin = '0';
        pre.style.whiteSpace = 'pre-wrap';
        pre.appendChild(info);

        content.appendChild(pre);
    } else {
        panel.style.display = 'none';
    }
}

function placeUnitsAtMouse(e, canvas, camera) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX / camera.zoom) + camera.x;
    const worldY = (mouseY / camera.zoom) + camera.y;

    const template = unitTemplates[selectedTemplateKey];
    if(!template) return;

    // Precalculate positions based on formation
    const spacing = 40; // Base spacing between units in formation

    for(let i=0; i<placementCount; i++) {
        let offsetX = 0;
        let offsetY = 0;

        if (placementCount > 1) {
            switch(placementFormation) {
                case 'line':
                    // Horizontal line centered on click
                    offsetX = (i - (placementCount - 1) / 2) * spacing;
                    offsetY = (Math.random() - 0.5) * 5; // slight jitter
                    break;
                case 'column':
                    // Vertical line
                    offsetX = (Math.random() - 0.5) * 5;
                    offsetY = (i - (placementCount - 1) / 2) * spacing;
                    break;
                case 'wedge':
                    // V-shape pointing "up"
                    const row = Math.floor((-1 + Math.sqrt(1 + 8 * i)) / 2);
                    const posInRow = i - (row * (row + 1)) / 2;
                    offsetX = (posInRow - row / 2) * spacing;
                    offsetY = row * spacing;
                    break;
                case 'cluster':
                default:
                    // Random cluster
                    offsetX = (Math.random() - 0.5) * 100;
                    offsetY = (Math.random() - 0.5) * 100;
                    break;
            }
        }

        const unit = {
            ...template,
            templateKey: selectedTemplateKey,
            id: 'u_' + Date.now() + '_' + i + Math.floor(Math.random()*1000),
            faction: selectedFaction,
            x: Math.max(0, Math.min(MAP_CONFIG.WIDTH, worldX + offsetX)),
            y: Math.max(0, Math.min(MAP_CONFIG.HEIGHT, worldY + offsetY)),
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
