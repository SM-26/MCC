# Mines & Choo Choos: Design Specification

**Tagline:** Dig, merge, and build your rail empire from rubble.

## Overview
A portrait-first idle railway tycoon. The player manages a layered transport empire by clearing land, mining resources, and optimizing train routes across discovered cities.

## UI & Layout Structure
* **Splash Screen:** Functional loading state; requests PWA installation if needed; hides immediately upon ready.
* **Header:** Persistent global status display (Currency, EI, Active City).
* **Navigation Bar (Shell):** Five primary tabs (World, Mine, Station, EI, Settings). Persistent across the app; user can toggle orientation (top/bottom).
* **Footer (Tab-Specific):** Contextual area displaying information specific to the active tab (e.g., active miner count, train schedules).
* **Locked Tabs:** Station and EI tabs are visible but disabled until progression requirements are met.

## Core Layers & Mechanics
* **World Generation:** Seed-based generation creating map layouts, city identities, and destination placements.
* **Mine Generation:** Procedural generation of plots and depth-based rubble/resource tiles within cities.
* **Plot/Mine:** Each city has an array of plots, and each plot has an array of mines. Miners are merged (Drag & Drop) to clear depth-based rubble.
* **Rail:** Station platforms are built on deep mine levels (depth 5, 10, 15...).
* **Trains:** Assigned to a single route at a time. 
* **Train Yard:** The management hub where players assign engines (Age-tier dependent) and cart configurations to platforms.
* **Cart Types:** Differentiated by capacity and value multipliers (e.g., Simple/Double-floor/Luxury for passengers, or Generic for cargo).
* **Age Progression:** City-specific technology tiers unlocked by mining:
    * **Basic:** Starting tier (clearing Rubble).
    * **Steam Age:** Unlocked by Coal.
    * **Diesel Age:** Unlocked by Oil.
    * **Electric Age:** Unlocked by Copper.
    * **Maglev Age:** Unlocked by Super-Alloy.
* **Meta (Prestige):** Nuke resets the station. Payout of Engineering Ideas (EI) is calculated based on total station value, progress achieved, and current miner assets.

## Progression & Economy
* **Mining:** City-specific; advancing an age in one city is a local puzzle. 
* **Rail:** Routes have fixed discovery-based times; train engine and cart choice dictates efficiency.
* **Prestige:** Resetting via "Nuke" earns EI; EI nodes can be global or city-specific.

## Onboarding & Tutorial (Placeholder)
* *Reserved for future implementation.* Needs to define the state-driven tutorial flow that introduces mechanics sequentially (Mining -> Station -> World).