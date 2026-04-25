import { MAP_CONFIG, mapData } from '../models/mapData.js';
import { placedUnits } from '../models/unitDictionary.js';
import { selectedUnit } from './inputHandler.js';

let canvas, ctx;
export let camera = { x: 0, y: 0, zoom: 0.5 }; // Start zoomed out a bit

export function initMap() {
    canvas = document.getElementById('strategy-map');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Center camera roughly
    camera.x = MAP_CONFIG.WIDTH / 2 - (canvas.width / camera.zoom) / 2;
    camera.y = MAP_CONFIG.HEIGHT / 2 - (canvas.height / camera.zoom) / 2;

    requestAnimationFrame(renderLoop);
}

function resizeCanvas() {
    const container = document.getElementById('map-container');
    if(!container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

export function getCanvasState() {
    return { canvas, camera };
}

function renderLoop() {
    render();
    requestAnimationFrame(renderLoop);
}

function render() {
    if(!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Background
    ctx.fillStyle = '#2c3e50'; // Darker base for tactical look
    ctx.fillRect(0, 0, MAP_CONFIG.WIDTH, MAP_CONFIG.HEIGHT);

    // Grid (optional tactical feel)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    const gridSize = 500;
    for(let i=0; i<MAP_CONFIG.WIDTH; i+=gridSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, MAP_CONFIG.HEIGHT); ctx.stroke();
    }
    for(let i=0; i<MAP_CONFIG.HEIGHT; i+=gridSize) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(MAP_CONFIG.WIDTH, i); ctx.stroke();
    }

    // Map Bounds
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, MAP_CONFIG.WIDTH, MAP_CONFIG.HEIGHT);

    // Roads
    ctx.lineCap = 'round';
    mapData.roads.forEach(road => {
        ctx.beginPath();
        ctx.moveTo(road.start.x, road.start.y);
        ctx.lineTo(road.end.x, road.end.y);
        ctx.strokeStyle = road.type === 'highway' ? '#7f8c8d' : '#8e44ad'; // distinct colors
        ctx.lineWidth = road.width;
        ctx.stroke();

        if(road.type === 'highway') {
            ctx.beginPath();
            ctx.moveTo(road.start.x, road.start.y);
            ctx.lineTo(road.end.x, road.end.y);
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            ctx.setLineDash([20, 20]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });

    // Hills (Elevation Maps)
    mapData.hills.forEach(hill => {
        ctx.beginPath();
        ctx.arc(hill.x, hill.y, hill.radius, 0, Math.PI * 2);

        // Dynamic gradient based on elevation multiplier
        const gradient = ctx.createRadialGradient(hill.x, hill.y, 0, hill.x, hill.y, hill.radius);
        // Higher elevation = lighter color
        let colorCenter = hill.elevation >= 3 ? '#ecf0f1' : (hill.elevation >= 2 ? '#95a5a6' : '#7f8c8d');

        gradient.addColorStop(0, colorCenter);
        gradient.addColorStop(1, 'rgba(44, 62, 80, 0)'); // fade into background
        ctx.fillStyle = gradient;
        ctx.fill();

        // Contour line
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Elevation text
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '14px Arial';
        ctx.fillText(`+${hill.elevation}x`, hill.x, hill.y);
    });

    // Effects Layer (Tracers, Explosions)
    placedUnits.forEach(unit => {
        if(unit.state !== 'destroyed' && unit.visualEffects) {
            unit.visualEffects.forEach((fx, i) => {
                if(fx.type === 'laser') {
                    ctx.beginPath();
                    ctx.moveTo(unit.x, unit.y);
                    ctx.lineTo(fx.targetX, fx.targetY);
                    ctx.strokeStyle = `rgba(241, 196, 15, ${fx.alpha})`;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    fx.alpha -= 0.05;
                } else if(fx.type === 'explosion') {
                    ctx.beginPath();
                    ctx.arc(fx.targetX, fx.targetY, fx.radius, 0, Math.PI*2);
                    ctx.fillStyle = `rgba(231, 76, 60, ${fx.alpha})`;
                    ctx.fill();
                    fx.radius += 5;
                    fx.alpha -= 0.05;
                }
            });
            // Clean dead fx
            unit.visualEffects = unit.visualEffects.filter(fx => fx.alpha > 0);
        }
    });

    // Units
    placedUnits.forEach(unit => {
        if (unit.state === 'destroyed') {
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔥', unit.x, unit.y);
            return;
        }

        // Suppression Visual indicator
        if(unit.suppression > 0) {
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, 25 + Math.random()*5, 0, Math.PI*2);
            ctx.fillStyle = `rgba(243, 156, 18, ${unit.suppression * 0.5})`;
            ctx.fill();
        }

        // Selection highlight
        if(selectedUnit && selectedUnit.id === unit.id) {
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, 24, 0, Math.PI * 2);
            ctx.strokeStyle = '#f39c12'; // Yellow highlight
            ctx.lineWidth = 4;
            ctx.stroke();

            // Draw Range Circle for selected unit
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, unit.range, 0, Math.PI * 2);
            ctx.strokeStyle = unit.faction === 'player' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(231, 76, 60, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Base disk
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = unit.faction === 'player' ? '#3498db' : '#e74c3c';
        ctx.fill();
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unit.icon, unit.x, unit.y);

        // Status bars (Ammo & Morale)
        drawStatusBar(ctx, unit.x - 15, unit.y + 25, 30, 4, unit.currentAmmo / unit.maxAmmo, '#3498db');
        if(unit.suppression > 0) {
            drawStatusBar(ctx, unit.x - 15, unit.y + 31, 30, 4, 1 - unit.suppression, '#e67e22');
        }
    });

    ctx.restore();
}

function drawStatusBar(ctx, x, y, width, height, percent, color) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * Math.max(0, percent), height);
}
