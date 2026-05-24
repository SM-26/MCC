# Test Strategy Options for Merge & Choo-Choo

## Current State Assessment

### ✅ What's Already Implemented
- **Money tests**: 8 comprehensive tests covering initialization, persistence, and edge cases (all passing)
- **Vitest setup**: Configured with happy-dom environment
- **Core save/load functions**: Fully tested and working
- **Type safety**: Strong TypeScript typing throughout

### 📊 Architecture Alignment (per technical_architecture_doc.md)
The current implementation follows the documented architecture:
- ✅ Domain slices are separate (`world`, `mines`, `station`, `save`)
- ✅ State is source of truth (not UI-driven)
- ✅ Modular monolith structure
- ✅ Offline-first persistence model

---

## 🎯 5 Test Direction Options

Based on the technical architecture doc and current implementation, here are 5 strategic test directions:

### **Option 1: World Generation & Discovery Tests** ⭐ RECOMMENDED

**Focus**: Seed-based world generation, discovery logic, hex grid coordinates

**Why**: 
- Critical for deterministic gameplay (seed must produce same results)
- Architecture doc emphasizes "seeded world structure" as a core pillar
- Currently untested - high risk area if bugs exist

**Test Scope**:
```typescript
// Example test cases:
describe('World Generation', () => {
  test('same seed produces identical world grid', () => {
    const seed1 = generateWorldGrid('abc123');
    const seed2 = generateWorldGrid('abc123');
    expect(seed1).toEqual(seed2); // Deterministic generation
  });

  test('different seeds produce different layouts', () => {
    const grid1 = generateWorldGrid('seed-a');
    const grid2 = generateWorldGrid('seed-b');
    expect(grid1).not.toEqual(grid2);
  });

  test('hex coordinates are valid for all cells', () => {
    const grid = generateInitialWorldGrid();
    grid.forEach(cell => {
      // Validate hex coordinate system
      expect(cell.q).toBeNumber();
      expect(cell.r).toBeNumber();
    });
  });

  test('discovery state tracks revealed locations', () => {
    // Test discovery logic and fog of war
  });
});
```

**Architecture Alignment**: 
- Tests `world` slice independently (per doc: "World slice owns global map, discovery state")
- Validates seeded generation is deterministic
- Ensures world slice doesn't depend on other slices

**Estimated Effort**: Medium (2-3 hours)
**Risk Mitigation**: High (catches seed bugs early)

---

### **Option 2: Mines & Plot Progression Tests** ⭐⭐ HIGH PRIORITY

**Focus**: Miner behavior, merging logic, depth progression, tile states

**Why**:
- Core gameplay loop (clearing rubble → age progression)
- Architecture doc: "Mines slice owns plots, depths, tile states, miner units"
- Complex state transitions that need regression protection

**Test Scope**:
```typescript
describe('Miner System', () => {
  test('merging equal-level miners creates higher level', () => {
    // Test merge mechanics
  });

  test('miner clearing speed increases with level', () => {
    // Test progression math
  });

  test('depth progression unlocks new resources at correct levels', () => {
    // Test resource unlock thresholds
  });

  test('tile states transition correctly (rubble → dirt → cleared)', () => {
    // Test tile lifecycle
  });

  test('age resources accumulate correctly per depth', () => {
    // Test coal/oil/copper/super-alloy collection
  });
});

describe('Plot Expansion', () => {
  test('north expansion adds new plot with correct ID', () => {
    // Test plot buying logic
  });

  test('digging down requires full previous level clearance', () => {
    // Test depth progression gates
  });
});
```

**Architecture Alignment**:
- Tests `mines` slice in isolation
- Validates mining→age progression pipeline
- Ensures mines slice exposes simple outcomes to other systems

**Estimated Effort**: Medium-High (3-4 hours)
**Risk Mitigation**: Critical (core gameplay mechanics)

---

### **Option 3: Station & Train Route Logic Tests** ⭐⭐⭐ CRITICAL PATH

**Focus**: Platform management, train assignment, route calculation, trip income

**Why**:
- Main income source and core optimization loop
- Architecture doc: "Station slice owns station construction, platforms, train assignment"
- Complex calculations (trip value, speed vs capacity trade-offs)

**Test Scope**:
```typescript
describe('Station System', () => {
  test('platform holds exactly one train', () => {
    // Test platform capacity constraint
  });

  test('train can be reassigned to different route', () => {
    // Test route flexibility
  });

  test('cart composition affects trip value correctly', () => {
    // Test passenger vs cargo cart math
  });

  test('trip income = passengers × fare × distance / travel time', () => {
    // Test income calculation formula
  });

  test('train speed vs capacity trade-off is balanced', () => {
    // Test optimization curve
  });
});

describe('Route Management', () => {
  test('route distance is fixed after discovery', () => {
    // Test route immutability
  });

  test('destination train limits are enforced', () => {
    // Test city/factory capacity limits
  });

  test('exploration timer completes and discovers destination', () => {
    // Test exploration mechanic
  });
});
```

**Architecture Alignment**:
- Tests `station` slice independently
- Validates station→route→income pipeline
- Ensures station doesn't depend on mining internals

**Estimated Effort**: High (4-5 hours)
**Risk Mitigation**: Critical (main income loop)

---

### **Option 4: Save System & Data Integrity Tests** ⭐⭐ RECOMMENDED

**Focus**: Serialization, deserialization, version migration, data validation

**Why**:
- Architecture doc emphasizes "save integrity" as most important tests
- Currently only money is tested; full state needs coverage
- Critical for offline-first design and future cloud save

**Test Scope**:
```typescript
describe('Save System', () => {
  test('full game state serializes correctly', () => {
    // Test complete GameState serialization
  });

  test('deserialized state matches original', () => {
    // Test round-trip integrity
  });

  test('save version migration works correctly', () => {
    // Test version compatibility
  });

  test('corrupted save falls back to default state', () => {
    // Test error recovery
  });

  test('missing optional fields use correct defaults', () => {
    // Test backward compatibility
  });

  test('save data is valid JSON and parseable', () => {
    // Test serialization format
  });
});

describe('Data Integrity', () => {
  test('all GameState fields persist correctly', () => {
    // Test every field in GameState interface
  });

  test('world grid persists with correct structure', () => {
    // Test world data integrity
  });

  test('plots array maintains correct references', () => {
    // Test plot data integrity
  });
});
```

**Architecture Alignment**:
- Tests `save` slice (architecture doc: "Save layer owns serialization, deserialization")
- Validates save is serialized form of game state (not second source of truth)
- Ensures future cloud sync can sit above save layer

**Estimated Effort**: Medium (2-3 hours)
**Risk Mitigation**: Critical (data loss prevention)

---

### **Option 5: Content & Seeded Data Tests** ⭐ MEDIUM PRIORITY

**Focus**: City/factory naming, destination templates, train categories, authored data

**Why**:
- Architecture doc: "Content slice stays data-oriented so game can grow without hardcoding"
- Ensures seeded content is properly integrated
- Validates content pipeline works correctly

**Test Scope**:
```typescript
describe('Content Generation', () => {
  test('city names are generated from seed deterministically', () => {
    // Test city naming logic
  });

  test('factory names differ by input type', () => {
    // Test factory naming
  });

  test('destination templates have correct structure', () => {
    // Test destination data
  });

  test('train categories are properly defined', () => {
    // Test train type definitions
  });
});

describe('Content Integration', () => {
  test('seeded cities appear in world grid', () => {
    // Test content→world integration
  });

  test('factories appear as discoverable destinations', () => {
    // Test content→discovery integration
  });

  test('train ages are properly unlocked by resources', () => {
    // Test content→progression integration
  });
});
```

**Architecture Alignment**:
- Tests `content` slice independently
- Validates content feeds systems via data, not hardcoded rules
- Ensures content can grow without changing core systems

**Estimated Effort**: Low-Medium (1-2 hours)
**Risk Mitigation**: Medium (data integrity)

---

## 📋 Recommendation Matrix

| Priority | Option | Reason | Timeline |
|----------|--------|--------|----------|
| **P0** | Option 4 (Save System) | Data loss prevention, architecture requirement | 2-3 hours |
| **P1** | Option 2 (Mines) | Core gameplay loop, complex state | 3-4 hours |
| **P1** | Option 3 (Station/Trains) | Main income source, optimization math | 4-5 hours |
| **P2** | Option 1 (World Gen) | Seed determinism, high-risk area | 2-3 hours |
| **P3** | Option 5 (Content) | Data-driven design validation | 1-2 hours |

---

## 🎯 My Recommendation: Start with Option 4 + Option 2

**Rationale**:
1. **Option 4 (Save System)** is architecturally required per the doc ("most important tests protect save integrity")
2. **Option 2 (Mines)** covers the core gameplay loop that players interact with most
3. Together they cover ~60% of critical paths with minimal effort
4. Both slices are well-defined in architecture doc, making test boundaries clear

**Alternative**: If you want to focus on the main income loop first, do **Option 3 (Station/Trains)** instead of Option 2.

---

## 🔧 Implementation Notes

### Test Structure Pattern (per updated TDD skill)
```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { /* imports */ } from '../path/to/module';

describe('Module Name', () => {
  beforeEach(() => {
    // Clean state using real browser API
    localStorage.clear();
  });

  test('should do X', () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = moduleFunction(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### File Naming Convention
- Source: `src/mines/plot.ts`
- Tests: `src/tests/mines/plot.test.ts` (or `*.spec.ts`)

### Running Tests
```bash
pnpm test          # Watch mode with hot-reload
pnpm test:a        # Force re-run all suites
pnpm test:t mines  # Filter by module pattern
```

---

## 📊 Expected Coverage After All Options

| Slice | Current | After All Options |
|-------|----------|-------------------|
| Money | ✅ 100% | ✅ 100% |
| World | ❌ 0% | ✅ 80% |
| Mines | ❌ 0% | ✅ 75% |
| Station | ❌ 0% | ✅ 70% |
| Save | ✅ 25% (money only) | ✅ 90% |
| Content | ❌ 0% | ✅ 60% |

**Total Coverage**: ~80% of critical paths tested

---

## 🚀 Next Steps

Choose one option and I'll help you:
1. Create the test file structure
2. Write initial failing tests (RED phase)
3. Fix implementation to pass tests (GREEN phase)
4. Refactor if needed (REFACTOR phase)

**Which option would you like to tackle first?**
