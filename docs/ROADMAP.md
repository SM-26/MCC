# Mines & Choo Choos: Road Map

## Overview
### Definitions & Hierarchy

* **Milestone:** A significant project checkpoint or "version goal." Reaching one means a major chunk of the game is playable or testable.
* **Slice:** A functional vertical of the game (e.g., `Mines`, `Station`, `World`). These are the primary organizational folders in your architecture.
* **Branch:** A temporary workspace for a `Task`. In your workflow, branches should be named after the `Slice` and the `Task` (e.g., `feature/mine-gen-logic`).
* **Task:** A single, measurable piece of work (e.g., "Implement Mine Generation algorithm"). This fits inside a slice.
* **Subtask:** The atomic steps for a `Task` (e.g., "Write the interface for a `Tile`", "Create the `generateMine()` function", "Add unit tests").

### Workflow Implementation

To put this into action, here is how you relate them:

1. **Pick the current Milestone** (e.g., M2).
2. **Pick a Task** (e.g., "Mine Gen Logic").
3. **Create a Branch** (e.g., `feature/mines-gen`).
4. **Break into Subtasks** (in your Logseq, a text file, or as GitHub/GitLab issues).
5. **Commit/Merge** once the Subtasks are done.
6. **Automated testing + user testing** before making a PR.

---

## 2. Roadmap (`docs/ROADMAP.md`)

#### **M1: Core Shell & Infrastructure**

 - [x] **Task:** Setup Vite + Svelte 5 + Project Folder Structure.
 - [ ] **Task:** Implement Global UI Shell (Header, Nav, Footer).
 - [ ] **Task:** Implement **Settings Tab** (Debug toggles, reset save, logging level settings).

#### **M2: Mine Systems (Logic & UI)**

 - [ ] **Task:** Implement **Mine Gen Logic** (Logic only).
   - [ ] *Subtask:* Define `Mine` and `Tile` interfaces.
   - [ ] *Subtask:* Write pure TS generation function.
   - [ ] *Subtask:* **Create Test Suite** (`mine.test.ts`) to verify generation logic.
 - [ ] **Task:** Implement **Mine View UI**.
   - [ ] *Subtask:* Grid rendering for tiles.
   - [ ] *Subtask:* Drag & drop logic for Miner merging.
   - [ ] *Subtask:* Plot/Depth navigation UI.

#### **M3: World Systems**

 - [ ] **Task:** Implement **World Gen Logic** (Logic + Test file).
 - [ ] **Task:** Implement **World Tab UI**.
   - [ ] *Subtask:* City list and map view.
   - [ ] *Subtask:* City discovery logic.

#### **M4: The Rail (Station & Logistics)**

 - [ ] **Task:** Station Platform management.
 - [ ] **Task:** Train Yard (Engine/Cart configurations).
 - [ ] **Task:** Route calculation and scheduling.

#### **M5: Meta & Polish**

 - [ ] **Task:** Nuke / Prestige logic + EI calculation.
 - [ ] **Task:** Technology Age progression.
 - [ ] **Task:** Tutorial implementation.
