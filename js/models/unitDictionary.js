// Comprehensive military unit dictionary

export const UNIT_CATEGORIES = {
    INFANTRY: 'infantry',
    VEHICLE: 'vehicle',
    ARTILLERY: 'artillery',
    AIRCRAFT: 'aircraft'
};

export const ARMOR_CLASSES = {
    UNARMORED: 'unarmored',
    LIGHT: 'light',
    HEAVY: 'heavy'
};

export const WEAPON_TYPES = {
    NONE: 'none',
    SMALL_ARMS: 'small_arms',
    ANTI_ARMOR: 'anti_armor',
    EXPLOSIVE: 'explosive'
};

export const unitTemplates = {
    // Infantry
    'sniper': { name: 'Sniper Team', category: UNIT_CATEGORIES.INFANTRY, armor: ARMOR_CLASSES.UNARMORED, weapon: WEAPON_TYPES.SMALL_ARMS, range: 1500, detection: 2000, mobility: 3, ammo: 50, icon: '🎯', precision: 0.9 },
    'infantry_squad': { name: 'Infantry Squad', category: UNIT_CATEGORIES.INFANTRY, armor: ARMOR_CLASSES.UNARMORED, weapon: WEAPON_TYPES.SMALL_ARMS, range: 400, detection: 800, mobility: 4, ammo: 300, icon: '🚶', precision: 0.5 },
    'anti_tank_team': { name: 'ATGM Team', category: UNIT_CATEGORIES.INFANTRY, armor: ARMOR_CLASSES.UNARMORED, weapon: WEAPON_TYPES.ANTI_ARMOR, range: 2500, detection: 3000, mobility: 3, ammo: 10, icon: '🚀', precision: 0.8 },

    // Vehicles
    'recon_jeep': { name: 'Reconnaissance Jeep', category: UNIT_CATEGORIES.VEHICLE, armor: ARMOR_CLASSES.UNARMORED, weapon: WEAPON_TYPES.SMALL_ARMS, range: 800, detection: 4000, mobility: 25, ammo: 200, icon: '🚙', precision: 0.4 },
    'apc': { name: 'Armored Personnel Carrier', category: UNIT_CATEGORIES.VEHICLE, armor: ARMOR_CLASSES.LIGHT, weapon: WEAPON_TYPES.SMALL_ARMS, range: 1000, detection: 1500, mobility: 18, ammo: 1000, icon: '🚐', precision: 0.4 },
    'ifv': { name: 'Infantry Fighting Vehicle', category: UNIT_CATEGORIES.VEHICLE, armor: ARMOR_CLASSES.LIGHT, weapon: WEAPON_TYPES.ANTI_ARMOR, range: 2000, detection: 2500, mobility: 15, ammo: 50, icon: '🪖', precision: 0.6 },
    'light_tank': { name: 'Light Tank', category: UNIT_CATEGORIES.VEHICLE, armor: ARMOR_CLASSES.LIGHT, weapon: WEAPON_TYPES.ANTI_ARMOR, range: 2500, detection: 3000, mobility: 14, ammo: 40, icon: '🚜', precision: 0.7 },
    'mbt': { name: 'Main Battle Tank', category: UNIT_CATEGORIES.VEHICLE, armor: ARMOR_CLASSES.HEAVY, weapon: WEAPON_TYPES.ANTI_ARMOR, range: 3500, detection: 3500, mobility: 10, ammo: 40, icon: '🛡️', precision: 0.75 },

    // Artillery
    'mortar_team': { name: 'Mortar Team', category: UNIT_CATEGORIES.ARTILLERY, armor: ARMOR_CLASSES.UNARMORED, weapon: WEAPON_TYPES.EXPLOSIVE, range: 5000, detection: 500, mobility: 2, ammo: 60, icon: '💣', precision: 0.3 },
    'howitzer': { name: 'Towed Howitzer', category: UNIT_CATEGORIES.ARTILLERY, armor: ARMOR_CLASSES.UNARMORED, weapon: WEAPON_TYPES.EXPLOSIVE, range: 18000, detection: 500, mobility: 1, ammo: 40, icon: '💥', precision: 0.2 },
    'spg': { name: 'Self-Propelled Gun', category: UNIT_CATEGORIES.ARTILLERY, armor: ARMOR_CLASSES.LIGHT, weapon: WEAPON_TYPES.EXPLOSIVE, range: 25000, detection: 1000, mobility: 8, ammo: 50, icon: '🎇', precision: 0.25 },
    'mlrs': { name: 'Multiple Launch Rocket System', category: UNIT_CATEGORIES.ARTILLERY, armor: ARMOR_CLASSES.LIGHT, weapon: WEAPON_TYPES.EXPLOSIVE, range: 40000, detection: 1000, mobility: 12, ammo: 12, icon: '🎆', precision: 0.1 }, // Low precision, high AoE concept

    // Aircraft
    'recon_drone': { name: 'Recon Drone (UAV)', category: UNIT_CATEGORIES.AIRCRAFT, armor: ARMOR_CLASSES.UNARMORED, weapon: WEAPON_TYPES.NONE, range: 0, detection: 8000, mobility: 30, ammo: 0, icon: '🛸', precision: 0 },
    'attack_drone': { name: 'Attack Drone (UCAV)', category: UNIT_CATEGORIES.AIRCRAFT, armor: ARMOR_CLASSES.UNARMORED, weapon: WEAPON_TYPES.ANTI_ARMOR, range: 4000, detection: 6000, mobility: 25, ammo: 4, icon: '✈️', precision: 0.9 },
    'attack_heli': { name: 'Attack Helicopter', category: UNIT_CATEGORIES.AIRCRAFT, armor: ARMOR_CLASSES.LIGHT, weapon: WEAPON_TYPES.ANTI_ARMOR, range: 4000, detection: 5000, mobility: 40, ammo: 16, icon: '🚁', precision: 0.8 },
    'interceptor_jet': { name: 'Interceptor Jet', category: UNIT_CATEGORIES.AIRCRAFT, armor: ARMOR_CLASSES.UNARMORED, weapon: WEAPON_TYPES.EXPLOSIVE, range: 10000, detection: 15000, mobility: 200, ammo: 6, icon: '🦅', precision: 0.8 },
    'bomber': { name: 'Tactical Bomber', category: UNIT_CATEGORIES.AIRCRAFT, armor: ARMOR_CLASSES.HEAVY, weapon: WEAPON_TYPES.EXPLOSIVE, range: 5000, detection: 6000, mobility: 150, ammo: 20, icon: '🦇', precision: 0.4 }
};

// Global state for placed units
export const placedUnits = [];

export function addCustomUnitTemplate(key, unitData) {
    unitTemplates[key] = unitData;
}
