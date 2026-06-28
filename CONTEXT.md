# MCC

Mining/logistics idle game. The player develops a hex-grid **World** containing multiple
**Plots**; each Plot is an independently developed Mine + Station.

## Language

### Grids

**Cell**:
One unit of the **World** grid — a hexagon addressed by axial coords `(q, r)`. Cells have a
type (`empty`, `plot`, `city`, `factory`, `blocker`). A Cell's id is the `"q,r"` string.
_Avoid_: tile (a tile is a Mine unit, never a World unit), hex (informal)

**Tile**:
One unit of a **Mine Depth** grid — a square addressed by `[row][col]`. Different shape, scale,
and layer from a Cell.
_Avoid_: cell (a cell is a World unit, never a Mine unit)

**Destination** (City / Factory):
A Cell that trains deliver to for payout. **City** = passenger destination; **Factory** = cargo
destination. These are **siblings of Plot**, never containers of it — a City does NOT group
plots. A Plot is itself a destination too (for age-resource transfer during construction).
_Avoid_: treating City as a parent of Plot (a stale idea from the old design doc)

### Plots

**World**:
The hex grid of Cells the player explores. Holds many Cells; some are Plots.
_Avoid_: map, board

**Plot**:
A single developable location in the World — a Cell of type `plot`. **A Plot is identified by
its Cell id** (the `"q,r"` string); there is no separate plot id. Every Plot owns its own Mine
and Station, developed independently of every other Plot. The persistent per-Plot bundle
(current age, age resources, the Mine, the Station) is the unit of "developed progress." The
Cell at the World origin `(0,0)` is **always** a Plot — the starting Plot, discovered and
developed from the first session.
_Avoid_: site; do NOT use "Mine" to mean the whole Plot (a Mine is only one part of a Plot)

**Plot lifecycle** — a Plot Cell is always in exactly one of these states:
- **Undiscovered**: world generation placed it, but the player hasn't found it
  (`cell.discovered === false`). Rendered as **fog**. Has **no stored entry**. *Can* already
  be set as a train-route destination.
- **Under construction**: a train first reached it (`cell.discovered === true`), which creates
  the Plot's **scaffold** — a Station with no Platform and a single Mineshaft with no Depths
  and no Tiles. The player rails **age resources** into the Plot from other Stations; they
  accumulate in the Plot's `ageResources`. Viewable in the World, but its empty Mine/Station
  are not yet selectable.
- **Built**: the player has spent the accumulated resources (and money) to fill the scaffold —
  the Mineshaft's surface Mine Depth (with Tiles) is materialized and the Station's foundation
  Platform exists. Only a Built Plot can be selected and managed.

Transitions are one-way: Undiscovered → Under construction → Built. A stored entry exists from
discovery onward (not from world-gen). The scaffold is always **Tile-less until Built** — that
is what keeps an unbuilt Plot's stored cost negligible. The set of Built Plots ⊆
Plots-with-an-entry ⊆ all Plot Cells.

There is **no stored `built` flag and no separate build ledger**. "Built" is **derived**:
a Plot is Built ⇔ its Mineshaft has its surface Mine Depth (with Tiles) materialized
(`isPlotBuilt(plot)`). The "investment so far" is just the Plot's accumulating `ageResources`.

**Mine**:
The excavation side of one Plot — the collection of its **Mineshafts**. One Mine belongs to
exactly one Plot. It exists as an empty scaffold (one Tile-less Mineshaft) from discovery, and
is filled when the Plot is Built. Surfaced in the Mine view.
_Avoid_: using "Mine" as a synonym for "Plot" or for a single Mineshaft

**Mineshaft**:
One vertical shaft within a Plot's Mine; holds an ordered array of Mine Depths. A Plot may have
several. The current code calls this `northExpansion` — that name is **deprecated** (the game
has no "north"); the canonical term is Mineshaft.
_Avoid_: north expansion, northExpansion, shaft (use the full word)

**Mine Depth**:
One level of a Mineshaft, holding its grid of Tiles and its miners. Depth 0 is the surface.
_Avoid_: layer, floor

**Station**:
The logistics side of one Plot — its train yard and its array of Platforms. One Station belongs
to exactly one Plot. It exists as an empty scaffold (no Platform) from discovery, and gains its
foundation Platform when the Plot is Built. Surfaced in the Station view.

**Platform**:
A loading point within a Station, built on a hard-cleared Mine Depth (surface, then depths
1, 6, 11, …). Trains dock at Platforms.

**Train yard**:
The management hub within a Station where the player assigns engines and carts to Platforms
and routes.

### Selection

**Active Plot**:
The single Built Plot the player is currently managing — the one the Mine and Station views
render and mutate in place. Identified by `activePlotCellId`. Exactly one Plot is active at a
time, and it is always a **Built** `plot` Cell.
_Avoid_: selected plot (ambiguous with inspection — see Inspected Cell)

**Inspected Cell**:
The World Cell the player is currently looking at / hovering for a tooltip in the World view.
Inspection is read-only, session-only (not persisted), and does NOT change which Plot is
active. Identified by `inspectedCellId`.
_Avoid_: selected cell, selectedCellId (the legacy name conflated inspection with activation)
