// Map configuration and static data

export const MAP_CONFIG = {
    WIDTH: 8000,   // Expanded map size for grand strategy
    HEIGHT: 6000
};

// Represents static terrain features
export const mapData = {
    hills: [
        // elevation represents height advantage (multiplier for LoS/Range)
        { x: 1500, y: 1500, radius: 400, elevation: 2 },
        { x: 4000, y: 2000, radius: 600, elevation: 3 },
        { x: 2500, y: 4500, radius: 350, elevation: 1.5 },
        { x: 6000, y: 1000, radius: 500, elevation: 2.5 },
        { x: 5500, y: 4000, radius: 800, elevation: 4 }, // Big mountain
        { x: 1000, y: 5000, radius: 400, elevation: 2 }
    ],
    roads: [
        // width affects visual, speedMultiplier affects vehicles
        { start: { x: 0, y: 3000 }, end: { x: 8000, y: 3000 }, width: 40, type: 'highway', speedMultiplier: 2.5 },
        { start: { x: 4000, y: 0 }, end: { x: 4000, y: 6000 }, width: 30, type: 'highway', speedMultiplier: 2.5 },
        { start: { x: 1500, y: 1500 }, end: { x: 4000, y: 3000 }, width: 20, type: 'dirt', speedMultiplier: 1.5 },
        { start: { x: 4000, y: 3000 }, end: { x: 5500, y: 4000 }, width: 20, type: 'dirt', speedMultiplier: 1.5 },
        { start: { x: 6000, y: 1000 }, end: { x: 8000, y: 0 }, width: 20, type: 'dirt', speedMultiplier: 1.5 }
    ]
};
