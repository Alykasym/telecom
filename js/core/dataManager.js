import { placedUnits, unitTemplates } from '../models/unitDictionary.js';
import { updateUnitInfoPanel, selectedUnit } from '../ui/inputHandler.js';
import { populateUnitDropdown } from '../ui/domManager.js';
import { mapData } from '../models/mapData.js';

export function exportScenario() {
    const data = {
        map: {
            hills: mapData.hills,
            roads: mapData.roads
        },
        customTemplates: Object.keys(unitTemplates).filter(k => k.startsWith('custom_')).reduce((acc, k) => {
            acc[k] = unitTemplates[k];
            return acc;
        }, {}),
        units: placedUnits.map(u => ({
            ...u,
            // don't export runtime state if not needed, but we will to preserve exactly
            state: 'idle',
            targetId: null,
            suppression: 0,
            visualEffects: []
        }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'military_scenario.json';
    a.click();
    URL.revokeObjectURL(url);
}

export function importScenario(file) {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Load custom templates
            if(data.customTemplates) {
                for(const [k, v] of Object.entries(data.customTemplates)) {
                    unitTemplates[k] = v;
                }
                populateUnitDropdown();
            }

            // Load units
            if(data.units) {
                placedUnits.length = 0; // Clear array
                data.units.forEach(u => placedUnits.push(u));
                // Deselect
                if(selectedUnit) {
                    // Update inputHandler's selectedUnit reference? We need a setter.
                    // For now, let's dispatch a custom event or just let it break highlight temporarily.
                    // A better way: force inputHandler to clear selection
                    document.dispatchEvent(new CustomEvent('clearSelection'));
                }
            }

            // Load map
            if(data.map) {
                mapData.hills = data.map.hills || [];
                mapData.roads = data.map.roads || [];
            }

            alert("Scenario imported successfully.");
        } catch (err) {
            alert("Failed to parse scenario file.");
            console.error(err);
        }
    };
    reader.readAsText(file);
}
