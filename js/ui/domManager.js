import { unitTemplates, addCustomUnitTemplate, UNIT_CATEGORIES, WEAPON_TYPES, ARMOR_CLASSES } from '../models/unitDictionary.js';
import { setPlacementMode, setSelectedTemplate, setSelectedFaction, setPlacementCount, setPlacementFormation, setActiveMapTool } from './inputHandler.js';
import { mapData } from '../models/mapData.js';
import { autoPlaceUnits, suggestAdjustments } from '../core/ai.js';
import { startSimulation, stopSimulation, resetSimulation } from '../core/simulation.js';
import { exportScenario, importScenario } from '../core/dataManager.js';

export function initUI() {
    setupTabs();
    populateUnitDropdown();
    setupForms();
    setupControls();
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';
        });
    });
}

export function populateUnitDropdown() {
    const select = document.getElementById('select-unit-type');
    if (!select) return;

    select.innerHTML = '';
    for (const [key, unit] of Object.entries(unitTemplates)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${unit.icon} ${unit.name}`;
        select.appendChild(option);
    }

    if(select.options.length > 0) {
        setSelectedTemplate(select.options[0].value);
    }
}

function setupForms() {
    // Modify index.html structure dynamically if needed, but assuming HTML is updated
    const selectFaction = document.getElementById('select-faction');
    if(selectFaction) {
        selectFaction.addEventListener('change', (e) => setSelectedFaction(e.target.value));
    }

    const selectUnitType = document.getElementById('select-unit-type');
    if(selectUnitType) {
        selectUnitType.addEventListener('change', (e) => setSelectedTemplate(e.target.value));
    }

    // Handle Placement Count if the input exists (we'll add it in HTML later)
    const countInput = document.getElementById('placement-count');
    if(countInput) {
        countInput.addEventListener('change', (e) => setPlacementCount(parseInt(e.target.value) || 1));
    }

    const formationInput = document.getElementById('placement-formation');
    if(formationInput) {
        formationInput.addEventListener('change', (e) => setPlacementFormation(e.target.value));
    }

    const customUnitForm = document.getElementById('form-custom-unit');
    if(customUnitForm) {
        customUnitForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const key = 'custom_' + Date.now();
            const name = document.getElementById('cu-name').value;
            const category = document.getElementById('cu-category').value;
            const armor = document.getElementById('cu-armor').value;
            const weapon = document.getElementById('cu-weapon').value;
            const range = parseFloat(document.getElementById('cu-range').value);
            const detection = parseFloat(document.getElementById('cu-detection').value);
            const mobility = parseFloat(document.getElementById('cu-mobility').value);
            const ammo = parseInt(document.getElementById('cu-ammo').value);

            let icon = '❓';
            if(category === UNIT_CATEGORIES.INFANTRY) icon = '🚶';
            if(category === UNIT_CATEGORIES.VEHICLE) icon = '🚙';
            if(category === UNIT_CATEGORIES.ARTILLERY) icon = '💥';
            if(category === UNIT_CATEGORIES.AIRCRAFT) icon = '✈️';

            addCustomUnitTemplate(key, {
                name, category, armor, weapon, range, detection, mobility, ammo, icon, precision: 0.5
            });

            populateUnitDropdown();
            selectUnitType.value = key;
            setSelectedTemplate(key);

            document.querySelector('[data-tab="tab-place"]').click();
        });
    }
}

function setupControls() {
    // Sim controls
    const simModeSelect = document.getElementById('sim-mode');
    const timeLimitContainer = document.getElementById('time-limit-container');
    if(simModeSelect) {
        simModeSelect.addEventListener('change', (e) => {
            timeLimitContainer.style.display = e.target.value === 'time-limit' ? 'block' : 'none';
        });
    }

    const btnStartSim = document.getElementById('btn-start-sim');
    if (btnStartSim) btnStartSim.addEventListener('click', startSimulation);

    const btnStopSim = document.getElementById('btn-stop-sim');
    if (btnStopSim) btnStopSim.addEventListener('click', () => stopSimulation("Manually Stopped"));

    const btnResetSim = document.getElementById('btn-reset-sim');
    if (btnResetSim) btnResetSim.addEventListener('click', resetSimulation);

    const btnCloseReport = document.getElementById('btn-close-report');
    if (btnCloseReport) {
        btnCloseReport.addEventListener('click', () => {
            document.getElementById('report-panel').style.display = 'none';
        });
    }

    // AI controls
    const btnAutoPlace = document.getElementById('btn-auto-place');
    if (btnAutoPlace) btnAutoPlace.addEventListener('click', autoPlaceUnits);

    const btnSuggest = document.getElementById('btn-suggest-adjustments');
    if (btnSuggest) btnSuggest.addEventListener('click', suggestAdjustments);

    // Data Management (Import / Export)
    const btnExport = document.getElementById('btn-export-scenario');
    if (btnExport) btnExport.addEventListener('click', exportScenario);

    const btnImport = document.getElementById('btn-import-scenario');
    const fileImport = document.getElementById('file-import');

    if (btnImport && fileImport) {
        btnImport.addEventListener('click', () => {
            fileImport.click();
        });
        fileImport.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                importScenario(e.target.files[0]);
                // reset file input
                e.target.value = '';
            }
        });
    }

    // Map hover to enable placement
    const mapContainer = document.getElementById('map-container');
    if(mapContainer) {
        mapContainer.addEventListener('mouseenter', () => {
            if(document.getElementById('tab-place').style.display !== 'none') {
                setPlacementMode(true);
            }
        });
        mapContainer.addEventListener('mouseleave', () => setPlacementMode(false));
    }

    // Map Editor Setup
    const selectMapTool = document.getElementById('select-map-tool');
    const toolHillOptions = document.getElementById('tool-hill-options');
    const toolRoadOptions = document.getElementById('tool-road-options');

    if(selectMapTool) {
        selectMapTool.addEventListener('change', (e) => {
            const val = e.target.value;
            setActiveMapTool(val);
            toolHillOptions.style.display = val === 'hill' ? 'block' : 'none';
            toolRoadOptions.style.display = val === 'road' ? 'block' : 'none';
        });
    }

    const btnClearMapData = document.getElementById('btn-clear-map-data');
    if(btnClearMapData) {
        btnClearMapData.addEventListener('click', () => {
            if(confirm("Are you sure you want to clear all map features?")) {
                mapData.hills = [];
                mapData.roads = [];
            }
        });
    }

    // Connect Map Tab to active tool
    const tabMapBtn = document.querySelector('[data-tab="tab-map"]');
    if(tabMapBtn) {
        tabMapBtn.addEventListener('click', () => {
            if(selectMapTool) {
                setActiveMapTool(selectMapTool.value);
            }
            setPlacementMode(false);
        });
    }

    // Connect Place Tab to turn off active tool
    const tabPlaceBtn = document.querySelector('[data-tab="tab-place"]');
    if(tabPlaceBtn) {
        tabPlaceBtn.addEventListener('click', () => {
            setActiveMapTool('none');
            setPlacementMode(true);
        });
    }
}
