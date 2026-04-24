import { placedUnits, UNIT_CATEGORIES, WEAPON_TYPES, ARMOR_CLASSES } from '../models/unitDictionary.js';
import { mapData } from '../models/mapData.js';

let simInterval = null;
let simRunning = false;
let simTime = 0;
const TICK_RATE = 100; // Fast ticks (10x a second)
const SIM_SPEED_MULT = 1; // 1 real second = 10 sim seconds

let stats = { pCas: 0, eCas: 0, pAmmo: 0, eAmmo: 0 };

export function initSimulation() {
    // Initializer if needed
}

export function startSimulation() {
    if(simRunning) return;
    if(placedUnits.length === 0) { alert("Please place units."); return; }

    simRunning = true;
    document.getElementById('btn-start-sim').disabled = true;
    document.getElementById('btn-stop-sim').disabled = false;
    document.getElementById('report-panel').style.display = 'none';

    stats = { pCas: 0, eCas: 0, pAmmo: 0, eAmmo: 0 };
    simTime = 0;

    // reset morale/ammo just in case
    placedUnits.forEach(u => {
        if(u.state !== 'destroyed') {
            u.suppression = 0;
            u.state = 'idle';
        }
    });

    simInterval = setInterval(simulationTick, TICK_RATE);
}

export function stopSimulation(reason) {
    if(!simRunning) return;
    simRunning = false;
    clearInterval(simInterval);
    document.getElementById('btn-start-sim').disabled = false;
    document.getElementById('btn-stop-sim').disabled = true;
    generateAAR(reason);
}

export function resetSimulation() {
    stopSimulation("Reset");
    placedUnits.length = 0;
    document.getElementById('report-panel').style.display = 'none';
}

function getElevation(x, y) {
    let maxElev = 1; // Base ground level
    for(let hill of mapData.hills) {
        let dist = Math.hypot(hill.x - x, hill.y - y);
        if(dist <= hill.radius) {
            // Gradient elevation based on distance to center
            let ratio = 1 - (dist / hill.radius);
            let localElev = 1 + (hill.elevation - 1) * ratio;
            if(localElev > maxElev) maxElev = localElev;
        }
    }
    return maxElev;
}

function getTerrainSpeedModifier(x, y, category) {
    let mod = 1.0;
    // Check Roads
    let onRoad = false;
    for(let road of mapData.roads) {
        // Point to line segment rough distance
        let l2 = Math.pow(road.start.x - road.end.x, 2) + Math.pow(road.start.y - road.end.y, 2);
        if(l2 === 0) continue;
        let t = Math.max(0, Math.min(1, ((x - road.start.x) * (road.end.x - road.start.x) + (y - road.start.y) * (road.end.y - road.start.y)) / l2));
        let px = road.start.x + t * (road.end.x - road.start.x);
        let py = road.start.y + t * (road.end.y - road.start.y);
        let dist = Math.hypot(px - x, py - y);
        if(dist < road.width) {
            mod = road.speedMultiplier;
            onRoad = true;
            break;
        }
    }

    // Off-road penalties
    if(!onRoad) {
        if(category === UNIT_CATEGORIES.VEHICLE) mod = 0.5; // Vehicles slow down off-road
        if(category === UNIT_CATEGORIES.ARTILLERY) mod = 0.3; // Towed guns very slow off road
    }

    // Aircraft ignore terrain
    if(category === UNIT_CATEGORIES.AIRCRAFT) return 1.0;

    return mod;
}

function checkLineOfSight(u1, u2) {
    if(u1.category === UNIT_CATEGORIES.AIRCRAFT || u2.category === UNIT_CATEGORIES.AIRCRAFT) return true; // Aircraft always seen/can see

    let e1 = getElevation(u1.x, u1.y);
    let e2 = getElevation(u2.x, u2.y);
    let dist = Math.hypot(u2.x - u1.x, u2.y - u1.y);

    // Elevation bonus to detection
    if (dist > u1.detection * e1) return false;

    // Check if hills block LoS
    for(let hill of mapData.hills) {
        let hillDist = Math.hypot(hill.x - u1.x, hill.y - u1.y);
        // If u1 is on the hill, it doesn't block
        if(hillDist <= hill.radius && e1 >= hill.elevation * 0.8) continue;

        // Simple point-to-segment distance for blocking
        let dx = u2.x - u1.x, dy = u2.y - u1.y;
        let l2 = dx*dx + dy*dy;
        if(l2 === 0) continue;
        let t = Math.max(0, Math.min(1, ((hill.x - u1.x) * dx + (hill.y - u1.y) * dy) / l2));
        let px = u1.x + t * dx, py = u1.y + t * dy;

        let distToCenter = Math.hypot(hill.x - px, hill.y - py);

        // If line passes close to hill center and hill is taller than both units
        if(distToCenter < hill.radius * 0.7) {
            if(hill.elevation > e1 && hill.elevation > e2) return false;
        }
    }
    return true;
}

function calculateHitProbability(attacker, defender, distance) {
    // Range falloff mitigated by elevation
    let attElev = getElevation(attacker.x, attacker.y);
    let effRange = attacker.range * (attacker.category === UNIT_CATEGORIES.AIRCRAFT ? 1 : attElev);

    let rangeFalloff = 1 - (distance / effRange);
    if(rangeFalloff < 0) return 0; // Out of range entirely

    // Weapon vs Armor matrix
    let armorFactor = 0.1;
    if(attacker.weapon === WEAPON_TYPES.SMALL_ARMS) {
        if(defender.armor === ARMOR_CLASSES.UNARMORED) armorFactor = 0.8;
        if(defender.armor === ARMOR_CLASSES.LIGHT) armorFactor = 0.2;
    } else if(attacker.weapon === WEAPON_TYPES.ANTI_ARMOR) {
        if(defender.armor === ARMOR_CLASSES.UNARMORED) armorFactor = 0.4;
        if(defender.armor === ARMOR_CLASSES.LIGHT) armorFactor = 0.9;
        if(defender.armor === ARMOR_CLASSES.HEAVY) armorFactor = 0.7;
    } else if(attacker.weapon === WEAPON_TYPES.EXPLOSIVE) {
        if(defender.armor === ARMOR_CLASSES.UNARMORED) armorFactor = 1.0;
        if(defender.armor === ARMOR_CLASSES.LIGHT) armorFactor = 0.6;
        if(defender.armor === ARMOR_CLASSES.HEAVY) armorFactor = 0.3;
    }

    // Suppression penalty
    let suppressionPenalty = 1 - (attacker.suppression * 0.8); // High suppression reduces accuracy heavily

    return attacker.precision * rangeFalloff * armorFactor * suppressionPenalty;
}

function simulationTick() {
    let dt = SIM_SPEED_MULT;
    simTime += dt;

    const aliveUnits = placedUnits.filter(u => u.state !== 'destroyed');

    // Morale/Suppression recovery over time
    aliveUnits.forEach(u => {
        if(u.suppression > 0) u.suppression = Math.max(0, u.suppression - 0.05 * dt);
    });

    aliveUnits.forEach(unit => {
        if(unit.weapon === WEAPON_TYPES.NONE) return; // Unarmed units just spot

        if(unit.state === 'idle' || unit.state === 'moving') {
            let enemies = aliveUnits.filter(e => e.faction !== unit.faction);
            let bestTarget = null;
            let minScore = Infinity; // Lower score = better target (distance / threat)

            enemies.forEach(enemy => {
                let dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
                let effRange = unit.range * (unit.category === UNIT_CATEGORIES.AIRCRAFT ? 1 : getElevation(unit.x, unit.y));

                // Spotting checks
                if(dist <= unit.detection * (unit.category === UNIT_CATEGORIES.AIRCRAFT ? 1 : getElevation(unit.x, unit.y)) && checkLineOfSight(unit, enemy)) {
                    // Score = Distance. Prioritize units we can actually hurt
                    let score = dist;
                    if(unit.weapon === WEAPON_TYPES.SMALL_ARMS && enemy.armor === ARMOR_CLASSES.HEAVY) score += 10000; // Ignore heavy armor if small arms
                    if(dist > effRange) score += 5000; // Penalty for out of range

                    if(score < minScore) { minScore = score; bestTarget = enemy; }
                }
            });

            if(bestTarget) {
                unit.targetId = bestTarget.id;
                unit.state = 'engaging';
            }
        }

        if(unit.state === 'engaging') {
            let target = aliveUnits.find(u => u.id === unit.targetId);
            // If target lost or destroyed, return to idle
            if(!target || target.state === 'destroyed' || !checkLineOfSight(unit, target)) {
                unit.state = 'idle';
                unit.targetId = null;
                return;
            }

            let dist = Math.hypot(target.x - unit.x, target.y - unit.y);
            let effRange = unit.range * (unit.category === UNIT_CATEGORIES.AIRCRAFT ? 1 : getElevation(unit.x, unit.y));

            if(dist > effRange) {
                // Move towards target
                let dx = target.x - unit.x;
                let dy = target.y - unit.y;
                let len = Math.hypot(dx, dy);

                let terrSpeed = getTerrainSpeedModifier(unit.x, unit.y, unit.category);
                let suppSpeed = 1 - (unit.suppression * 0.5); // move slower when suppressed

                unit.x += (dx / len) * unit.mobility * terrSpeed * suppSpeed * dt;
                unit.y += (dy / len) * unit.mobility * terrSpeed * suppSpeed * dt;
            } else {
                // Fire
                if(unit.currentAmmo > 0) {
                    // Fire rate throttle based on tick (simulate reload times simply)
                    if(Math.random() < 0.2) { // 20% chance to fire per tick if in range
                        unit.currentAmmo--;
                        if(unit.faction === 'player') stats.pAmmo++; else stats.eAmmo++;

                        // Visual fx
                        unit.visualEffects.push({
                            type: unit.weapon === WEAPON_TYPES.EXPLOSIVE ? 'explosion' : 'laser',
                            targetX: target.x + (Math.random()-0.5)*50,
                            targetY: target.y + (Math.random()-0.5)*50,
                            radius: unit.weapon === WEAPON_TYPES.EXPLOSIVE ? 50 : 0,
                            alpha: 1.0
                        });

                        // Suppression application (explosives cause massive suppression even on miss)
                        if(unit.weapon === WEAPON_TYPES.EXPLOSIVE) {
                            target.suppression = Math.min(1.0, target.suppression + 0.4);
                            // Splash suppression to nearby
                            aliveUnits.forEach(nearby => {
                                if(nearby.faction === target.faction && nearby.id !== target.id) {
                                    if(Math.hypot(nearby.x - target.x, nearby.y - target.y) < 150) {
                                        nearby.suppression = Math.min(1.0, nearby.suppression + 0.2);
                                    }
                                }
                            });
                        } else {
                            target.suppression = Math.min(1.0, target.suppression + 0.1);
                        }

                        let pKill = calculateHitProbability(unit, target, dist);
                        if(Math.random() < pKill) {
                            target.state = 'destroyed';
                            if(target.faction === 'player') stats.pCas++; else stats.eCas++;
                        }
                    }
                } else {
                    unit.state = 'idle'; // Out of ammo
                }
            }
        }
    });

    let pAlive = placedUnits.filter(u => u.faction === 'player' && u.state !== 'destroyed').length;
    let eAlive = placedUnits.filter(u => u.faction === 'enemy' && u.state !== 'destroyed').length;
    let mode = document.getElementById('sim-mode')?.value;

    if(pAlive === 0 || eAlive === 0) {
        stopSimulation(pAlive === 0 ? "Player Force Neutralized" : "Enemy Force Neutralized");
    } else if (mode === 'time-limit') {
        let maxHours = parseFloat(document.getElementById('sim-time-limit')?.value || 2);
        if(simTime >= maxHours * 3600) stopSimulation("Time Limit Reached");
    }
}

function generateAAR(reason) {
    const pTotal = placedUnits.filter(u => u.faction === 'player').length;
    const eTotal = placedUnits.filter(u => u.faction === 'enemy').length;

    let html = `
        <p><strong>Result:</strong> ${reason}</p>
        <p><strong>Sim Time:</strong> ${(simTime / 3600).toFixed(2)} Hrs</p>
        <hr style="border-color: #c0392b;">
        <p style="color:#3498db"><strong>Player (Blue):</strong></p>
        <ul><li>Casualties: ${stats.pCas}/${pTotal}</li><li>Ammo: ${stats.pAmmo}</li></ul>
        <p style="color:#e74c3c"><strong>Enemy (Red):</strong></p>
        <ul><li>Casualties: ${stats.eCas}/${eTotal}</li><li>Ammo: ${stats.eAmmo}</li></ul>
    `;
    const rc = document.getElementById('report-content');
    const rp = document.getElementById('report-panel');
    if(rc && rp) { rc.innerHTML = html; rp.style.display = 'block'; }
}