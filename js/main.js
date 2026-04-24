import { initUI } from './ui/domManager.js';
import { initMap } from './ui/mapRenderer.js';
import { initInputHandler } from './ui/inputHandler.js';
import { initSimulation } from './core/simulation.js';

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initInputHandler();
    initUI();
    initSimulation();
});
