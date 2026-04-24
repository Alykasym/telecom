import { placedUnits, unitTemplates, UNIT_CATEGORIES, WEAPON_TYPES } from '../models/unitDictionary.js';
import { mapData, MAP_CONFIG } from '../models/mapData.js';

export function autoPlaceUnits() {
    const enemies = placedUnits.filter(u => u.faction === 'enemy');
    if(enemies.length === 0) { alert("Place enemy units first to generate counter-strategy."); return; }

    // Advanced Heuristic:
    // Determine center of enemy mass
    let ex = 0, ey = 0;
    enemies.forEach(e => { ex += e.x; ey += e.y; });
    ex /= enemies.length; ey /= enemies.length;

    // Pick a deployment zone away from enemies (e.g., opposite side of map)
    let deployX = ex > MAP_CONFIG.WIDTH / 2 ? 1000 : MAP_CONFIG.WIDTH - 1000;
    let deployY = ey > MAP_CONFIG.HEIGHT / 2 ? 1000 : MAP_CONFIG.HEIGHT - 1000;

    let infCount = enemies.filter(e => e.category === UNIT_CATEGORIES.INFANTRY).length;
    let vehCount = enemies.filter(e => e.category === UNIT_CATEGORIES.VEHICLE).length;
    let artCount = enemies.filter(e => e.category === UNIT_CATEGORIES.ARTILLERY).length;
    let airCount = enemies.filter(e => e.category === UNIT_CATEGORIES.AIRCRAFT).length;

    // Compose a counter force
    let newUnits = [];

    // Frontline: IFVs and Infantry (Screening force)
    for(let i=0; i < Math.max(2, infCount); i++) {
        newUnits.push(createUnitInstance('infantry_squad', 'player', deployX + (Math.random()-0.5)*1000, deployY + (Math.random()-0.5)*1000 + 500)); // Forward
    }
    for(let i=0; i < Math.ceil(infCount/2); i++) {
        newUnits.push(createUnitInstance('ifv', 'player', deployX + (Math.random()-0.5)*800, deployY + (Math.random()-0.5)*800 + 400));
    }

    // Flanks/Roads: Main Battle Tanks
    for(let i=0; i < Math.max(1, vehCount); i++) {
        // Find nearest road to deployment
        let road = mapData.roads[0];
        let minD = Infinity;
        mapData.roads.forEach(r => {
            let d = Math.hypot(r.start.x - deployX, r.start.y - deployY);
            if(d < minD) { minD = d; road = r; }
        });
        let rx = road.start.x + (road.end.x - road.start.x) * 0.1;
        let ry = road.start.y + (road.end.y - road.start.y) * 0.1;
        newUnits.push(createUnitInstance('mbt', 'player', rx + (Math.random()-0.5)*200, ry + (Math.random()-0.5)*200));
    }

    // High Ground: Snipers and ATGM
    for(let i=0; i < 2; i++) {
        let hill = mapData.hills.reduce((prev, curr) => curr.elevation > prev.elevation ? curr : prev); // Tallest hill
        newUnits.push(createUnitInstance('sniper', 'player', hill.x + (Math.random()-0.5)*100, hill.y + (Math.random()-0.5)*100));
        newUnits.push(createUnitInstance('anti_tank_team', 'player', hill.x + (Math.random()-0.5)*100, hill.y + (Math.random()-0.5)*100));
    }

    // Rear: Artillery
    for(let i=0; i < Math.max(1, Math.ceil((vehCount + infCount)/3)); i++) {
        newUnits.push(createUnitInstance('howitzer', 'player', deployX + (Math.random()-0.5)*500, deployY - 1000)); // Far back
    }

    // Air Superiority: Interceptors if enemy has aircraft, otherwise Attack Helis
    if(airCount > 0) {
        for(let i=0; i < airCount; i++) newUnits.push(createUnitInstance('interceptor_jet', 'player', deployX, deployY - 2000));
    } else {
        newUnits.push(createUnitInstance('attack_heli', 'player', deployX, deployY - 1500));
    }

    placedUnits.push(...newUnits);
    alert("Auto-placed optimal counter-force formulation (Screening Infantry, Armored Flanks, Artillery Rear, High-Ground Snipers).");
}

export function suggestAdjustments() {
    const players = placedUnits.filter(u => u.faction === 'player');
    if(players.length === 0) { alert("No player units to evaluate."); return; }

    let report = "Strategic Adjustments Executed:\n";
    let moves = 0;

    players.forEach(u => {
        // Artillery & Snipers -> Seek High Ground
        if(u.category === UNIT_CATEGORIES.ARTILLERY || u.weapon === WEAPON_TYPES.SMALL_ARMS && u.range > 1000) {
            let currentElev = getElevationAt(u.x, u.y);
            if(currentElev < 2) {
                let bestHill = mapData.hills.reduce((prev, curr) => {
                    // Score = Elevation / Distance
                    let s1 = curr.elevation / Math.max(1, Math.hypot(curr.x - u.x, curr.y - u.y));
                    let s2 = prev.elevation / Math.max(1, Math.hypot(prev.x - u.x, prev.y - u.y));
                    return s1 > s2 ? curr : prev;
                });
                u.x = bestHill.x + (Math.random()-0.5)*50;
                u.y = bestHill.y + (Math.random()-0.5)*50;
                report += `- Moved ${u.name} to higher elevation (+${bestHill.elevation}x modifier).\n`;
                moves++;
            }
        }

        // Vehicles -> Seek Roads for Mobility if far from frontline
        if(u.category === UNIT_CATEGORIES.VEHICLE) {
            let onRoad = mapData.roads.some(r => {
                let l2 = Math.pow(r.start.x - r.end.x, 2) + Math.pow(r.start.y - r.end.y, 2);
                if(l2===0) return false;
                let t = Math.max(0, Math.min(1, ((u.x - r.start.x) * (r.end.x - r.start.x) + (u.y - r.start.y) * (r.end.y - r.start.y)) / l2));
                let px = r.start.x + t * (r.end.x - r.start.x);
                let py = r.start.y + t * (r.end.y - r.start.y);
                return Math.hypot(px - u.x, py - u.y) < r.width;
            });
            if(!onRoad) {
                // Find nearest road
                let bestRoad = mapData.roads[0], bestPx = u.x, bestPy = u.y, minD = Infinity;
                mapData.roads.forEach(r => {
                    let l2 = Math.pow(r.start.x - r.end.x, 2) + Math.pow(r.start.y - r.end.y, 2);
                    if(l2===0) return;
                    let t = Math.max(0, Math.min(1, ((u.x - r.start.x) * (r.end.x - r.start.x) + (u.y - r.start.y) * (r.end.y - r.start.y)) / l2));
                    let px = r.start.x + t * (r.end.x - r.start.x);
                    let py = r.start.y + t * (r.end.y - r.start.y);
                    let d = Math.hypot(px - u.x, py - u.y);
                    if(d < minD) { minD = d; bestRoad = r; bestPx = px; bestPy = py; }
                });

                // Only move if it's worth it (e.g. road isn't extremely far)
                if(minD < 1500) {
                    u.x = bestPx; u.y = bestPy;
                    report += `- Shifted ${u.name} onto ${bestRoad.type} network for mobility bonus.\n`;
                    moves++;
                }
            }
        }
    });

    if(moves === 0) alert("Units are already optimally placed based on doctrine heuristics.");
    else alert(report);
}

function getElevationAt(x, y) {
    let maxElev = 1;
    for(let hill of mapData.hills) {
        let dist = Math.hypot(hill.x - x, hill.y - y);
        if(dist <= hill.radius) {
            let ratio = 1 - (dist / hill.radius);
            let localElev = 1 + (hill.elevation - 1) * ratio;
            if(localElev > maxElev) maxElev = localElev;
        }
    }
    return maxElev;
}

function createUnitInstance(key, faction, x, y) {
    let t = unitTemplates[key] || Object.values(unitTemplates)[0];
    return {
        ...t,
        id: 'u_' + Date.now() + Math.floor(Math.random() * 10000),
        faction: faction,
        x: Math.max(0, Math.min(MAP_CONFIG.WIDTH, x)),
        y: Math.max(0, Math.min(MAP_CONFIG.HEIGHT, y)),
        maxAmmo: t.ammo,
        currentAmmo: t.ammo,
        state: 'idle',
        targetId: null,
        suppression: 0,
        visualEffects: []
    };
}
