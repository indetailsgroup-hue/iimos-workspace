# Hardware & Drilling Specifications
# ข้อกำหนดอุปกรณ์และรูปแบบการเจาะ

**Version:** 1.0
**Last Updated:** 2026-01-10
**Status:** Technical Reference
**Scope:** Cabinet Hardware Systems & CNC Drilling Patterns

---

## บทนำ (Introduction)

เอกสารนี้เป็นคู่มืออ้างอิงทางวิศวกรรมสำหรับ **ระบบอุปกรณ์ตู้ (Hardware Systems)** และ **รูปแบบการเจาะ (Drilling Patterns)** ที่ใช้ในการผลิตตู้เฟอร์นิเจอร์ ครอบคลุมข้อมูลทางเทคนิคที่จำเป็นสำหรับการออกแบบ การคำนวณ และการส่งออกไฟล์ CNC

### วัตถุประสงค์ (Objectives)

1. **มาตรฐานการเจาะ**: กำหนดรูปแบบการเจาะตามระบบ 32mm
2. **Hardware Catalog**: รายละเอียดอุปกรณ์พร้อมข้อกำหนดการติดตั้ง
3. **CNC Integration**: Layer definitions สำหรับ DXF export
4. **Compatibility Matrix**: ตารางความเข้ากันได้ของอุปกรณ์

---

## ส่วนที่ 1: ระบบ 32 มิลลิเมตร (32mm System)

### 1.1 หลักการพื้นฐาน

**ระบบ 32mm** (หรือ System 32) คือมาตรฐานสากลสำหรับการผลิตตู้เฟอร์นิเจอร์ โดยกำหนดให้รูเจาะทุกรูอยู่บน Grid ที่มีระยะห่าง 32mm

**ข้อดี:**
- ✅ ความเข้ากันได้สากล (ใช้กับอุปกรณ์จากผู้ผลิตต่างๆ ได้)
- ✅ ลดความผิดพลาดในการผลิต (ตำแหน่งรูคงที่)
- ✅ ยืดหยุ่นในการปรับระดับชั้น (ใช้รูเดียวกันได้)
- ✅ เหมาะสำหรับ CNC อัตโนมัติ

### 1.2 Grid Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│    37mm ────┐                                           │
│             │                                           │
│    ●────●────●────●────●────●────●────●────●────●       │ ← Row 1
│    │    │    │    │    │    │    │    │    │    │       │
│   32mm  32   32   32   32   32   32   32   32   32      │
│    │    │    │    │    │    │    │    │    │    │       │
│    ●────●────●────●────●────●────●────●────●────●       │ ← Row 2
│                                                         │
│    ← 37mm from front edge                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**ค่าคงที่ระบบ 32mm:**

| พารามิเตอร์ | ค่า | หน่วย | คำอธิบาย |
|-------------|-----|-------|----------|
| Grid Spacing | 32 | mm | ระยะห่างระหว่างรู |
| Front Setback | 37 | mm | ระยะจากขอบหน้าถึงแถวแรก |
| Rear Setback | 37 | mm | ระยะจากขอบหลังถึงแถวสุดท้าย |
| Row Spacing | 32 | mm | ระยะระหว่างแถว (ถ้ามี 2 แถว) |
| Hole Diameter | 5 | mm | เส้นผ่านศูนย์กลางรูมาตรฐาน |
| Hole Depth | 13 | mm | ความลึกรูมาตรฐาน |

### 1.3 การคำนวณจำนวนรู (Hole Count Calculation)

**สูตร:**
```
N_holes = floor((H_panel - 2×setback) / 32) + 1
```

**ตัวอย่าง:**
```
แผ่นข้างสูง 720mm
Setback = 37mm
พื้นที่ใช้งาน = 720 - (2×37) = 646mm
N_holes = floor(646 / 32) + 1 = 20 + 1 = 21 รู
```

### 1.4 TypeScript Implementation

```typescript
interface System32Config {
  gridSpacing: number      // 32mm
  frontSetback: number     // 37mm
  rearSetback: number      // 37mm (หรือจากขอบล่าง)
  holeDiameter: number     // 5mm
  holeDepth: number        // 13mm
}

interface DrillHole {
  x: number
  y: number
  diameter: number
  depth: number
  type: 'shelf_pin' | 'dowel' | 'confirmat' | 'hinge'
}

function generateSystem32Holes(
  panelHeight: number,
  panelDepth: number,
  config: System32Config
): DrillHole[] {
  const holes: DrillHole[] = []

  // คำนวณจำนวนรูในแนวตั้ง
  const usableHeight = panelHeight - config.frontSetback - config.rearSetback
  const verticalCount = Math.floor(usableHeight / config.gridSpacing) + 1

  // สร้างแถวรู (2 แถว: หน้า 37mm และหลัง panelDepth - 37mm)
  const rowPositions = [config.frontSetback, panelDepth - config.frontSetback]

  for (const rowX of rowPositions) {
    for (let i = 0; i < verticalCount; i++) {
      const y = config.frontSetback + (i * config.gridSpacing)

      holes.push({
        x: rowX,
        y: y,
        diameter: config.holeDiameter,
        depth: config.holeDepth,
        type: 'shelf_pin'
      })
    }
  }

  return holes
}

// Default configuration
const DEFAULT_SYSTEM32: System32Config = {
  gridSpacing: 32,
  frontSetback: 37,
  rearSetback: 37,
  holeDiameter: 5,
  holeDepth: 13
}
```

---

## ส่วนที่ 2: ประเภทการเจาะ (Drilling Types)

### 2.1 Shelf Pin Holes (รูหมุดชั้น)

**วัตถุประสงค์:** รองรับชั้นปรับระดับได้

| พารามิเตอร์ | ค่ามาตรฐาน | หมายเหตุ |
|-------------|------------|----------|
| Diameter | 5mm | สำหรับหมุด 5mm |
| Depth | 13mm | ≤ T_panel - 3mm |
| Spacing | 32mm | ตามระบบ 32mm |
| Edge Distance | 37mm | ระยะจากขอบหน้า/หลัง |

**DXF Layer:** `DRILL_V_5_D13`

```typescript
interface ShelfPinSpec {
  diameter: 5
  depth: 13
  minEdgeDistance: 37
  gridSpacing: 32
}
```

### 2.2 Confirmat Screw Holes (รูสกรูดาว)

**วัตถุประสงค์:** ยึดแผ่นไม้เข้าด้วยกัน (Construction Joint)

**Confirmat 7×50mm (มาตรฐาน):**

| พารามิเตอร์ | หน้าแผ่น (Face) | ขอบแผ่น (Edge) |
|-------------|-----------------|----------------|
| Diameter | 8mm | 5mm |
| Depth | 12mm (ทะลุ) | 37mm |
| Countersink | Yes (Ø11mm × 3mm) | No |

**DXF Layers:**
- Face: `DRILL_V_8_THRU` + `CSINK_11_D3`
- Edge: `DRILL_H_5_D37`

```typescript
interface ConfirmatSpec {
  screwSize: '7x50' | '5x40'
  faceDrill: {
    diameter: number      // 8mm
    depth: 'through'      // ทะลุ
    countersink: {
      diameter: number    // 11mm
      depth: number       // 3mm
    }
  }
  edgeDrill: {
    diameter: number      // 5mm
    depth: number         // 37mm
  }
  minEdgeDistance: number // 25mm
  minEndDistance: number  // 50mm
}

const CONFIRMAT_7x50: ConfirmatSpec = {
  screwSize: '7x50',
  faceDrill: {
    diameter: 8,
    depth: 'through',
    countersink: { diameter: 11, depth: 3 }
  },
  edgeDrill: {
    diameter: 5,
    depth: 37
  },
  minEdgeDistance: 25,
  minEndDistance: 50
}
```

### 2.3 Dowel Holes (รูหมุดไม้)

**วัตถุประสงค์:** ยึดแผ่นไม้แบบซ่อน (Invisible Joint)

| พารามิเตอร์ | ค่ามาตรฐาน | หมายเหตุ |
|-------------|------------|----------|
| Diameter | 8mm | สำหรับหมุดไม้ 8mm |
| Depth | 13mm | ทั้งสองด้าน |
| Spacing | 32mm | หรือ 64mm (ตามโหลด) |
| Edge Distance | 37mm | ระยะจากขอบ |

**DXF Layer:** `DRILL_V_8_D13` หรือ `DRILL_H_8_D13`

```typescript
interface DowelSpec {
  diameter: 8
  depth: 13
  spacing: 32 | 64
  minEdgeDistance: 37
  tolerance: 0.1  // ความคลาดเคลื่อนยอมได้ ±0.1mm
}
```

### 2.4 Minifix/Cam Lock Holes (รูล็อคแคม)

**วัตถุประสงค์:** ยึดแบบถอดประกอบได้ (Knock-down)

**Minifix 15mm (Häfele/Blum):**

| พารามิเตอร์ | Housing (แผ่นหลัก) | Bolt (แผ่นรอง) |
|-------------|-------------------|----------------|
| Diameter | 15mm | 8mm |
| Depth | 12.5mm | ทะลุ |
| Edge Distance | 34mm | 9.5mm (center) |

**DXF Layers:**
- Housing: `DRILL_V_15_D12.5`
- Bolt: `DRILL_H_8_THRU`

```typescript
interface MinifixSpec {
  housingDrill: {
    diameter: 15
    depth: 12.5
    edgeDistance: 34
  }
  boltDrill: {
    diameter: 8
    depth: 'through'
    centerFromEdge: 9.5
  }
}
```

### 2.5 Hinge Cup Holes (รูบานพับ)

**วัตถุประสงค์:** ติดตั้งบานพับซ่อน (Concealed Hinge)

**Blum Clip Top 35mm:**

| พารามิเตอร์ | ค่า | หมายเหตุ |
|-------------|-----|----------|
| Cup Diameter | 35mm | มาตรฐานยุโรป |
| Cup Depth | 12.5mm | |
| Pilot Holes | 2 × Ø5mm × 10mm | ห่างจากศูนย์กลาง 22.5mm |
| Edge Distance | 3-6mm | ขึ้นอยู่กับ overlay |

**DXF Layer:** `HINGE_CUP_35`

```typescript
interface HingeCupSpec {
  cupDiameter: 35
  cupDepth: 12.5
  pilotHoles: {
    diameter: 5
    depth: 10
    spacing: 45  // ระยะระหว่าง pilot holes
  }
  edgeDistance: number  // 3-6mm ขึ้นอยู่กับ overlay
}

// ระยะขอบตาม Overlay
const HINGE_EDGE_DISTANCE = {
  'full_overlay': 3,    // บานทับขอบ
  'half_overlay': 5,    // บานทับครึ่ง
  'inset': 6            // บานเฝือง
}
```

---

## ส่วนที่ 3: Hardware Catalog

### 3.1 Hinges (บานพับ)

#### 3.1.1 Concealed Hinges (บานพับซ่อน)

| รุ่น | Opening Angle | Overlay | Door Thickness | Weight Capacity |
|------|---------------|---------|----------------|-----------------|
| Blum Clip Top 110° | 110° | 0-22mm | 16-25mm | 4kg |
| Blum Clip Top 155° | 155° | 0-22mm | 16-25mm | 4kg |
| Blum Clip Top BLUMOTION | 110° | 0-22mm | 16-25mm | 4kg (soft-close) |
| Hettich Sensys 110° | 110° | 0-23mm | 15-25mm | 4kg |
| Grass Tiomos 110° | 110° | 0-21mm | 16-24mm | 3.5kg |

**Drilling Pattern (Blum Clip Top):**

```
              ← 22.5mm →
                  ↓
    ○─────────────●─────────────○
    ↑             ↑             ↑
  Pilot         Cup          Pilot
  5×10        35×12.5        5×10

  ← Edge Distance (3-6mm) →
```

```typescript
interface HingeSpec {
  brand: string
  model: string
  openingAngle: number    // 110, 155, etc.
  overlayRange: {
    min: number
    max: number
  }
  doorThicknessRange: {
    min: number
    max: number
  }
  weightCapacity: number  // kg
  softClose: boolean
  drilling: HingeCupSpec
  mountingPlate: MountingPlateSpec
}

interface MountingPlateSpec {
  type: 'cruciform' | 'linear'
  height: number          // 0mm, 3mm, 6mm, 9mm
  screwPattern: {
    diameter: number
    depth: number
    spacing: number
  }
}
```

#### 3.1.2 จำนวนบานพับตามขนาดบาน (Hinge Quantity)

| ความสูงบาน | จำนวนบานพับ | ตำแหน่ง |
|------------|-------------|---------|
| ≤ 600mm | 2 | 100mm จากบน/ล่าง |
| 601-1000mm | 2 | 80mm จากบน/ล่าง |
| 1001-1400mm | 3 | 80mm, กลาง, 80mm |
| 1401-2000mm | 4 | 80mm, 1/3, 2/3, 80mm |
| > 2000mm | 5 | 80mm, กระจายเท่าๆ |

```typescript
function calculateHingePositions(doorHeight: number): number[] {
  const positions: number[] = []
  const topOffset = doorHeight > 600 ? 80 : 100
  const bottomOffset = topOffset

  if (doorHeight <= 1000) {
    // 2 hinges
    positions.push(topOffset, doorHeight - bottomOffset)
  } else if (doorHeight <= 1400) {
    // 3 hinges
    positions.push(topOffset, doorHeight / 2, doorHeight - bottomOffset)
  } else if (doorHeight <= 2000) {
    // 4 hinges
    positions.push(
      topOffset,
      doorHeight / 3,
      (doorHeight / 3) * 2,
      doorHeight - bottomOffset
    )
  } else {
    // 5 hinges
    const spacing = (doorHeight - topOffset - bottomOffset) / 4
    for (let i = 0; i < 5; i++) {
      positions.push(topOffset + (i * spacing))
    }
  }

  return positions
}
```

### 3.2 Drawer Slides (รางลิ้นชัก)

#### 3.2.1 Ball Bearing Slides (รางลูกปืน)

| รุ่น | Extension | Load Capacity | Lengths | Features |
|------|-----------|---------------|---------|----------|
| Standard Side Mount | Full | 35kg | 250-600mm | พื้นฐาน |
| Heavy Duty Side Mount | Full | 50kg | 350-700mm | โหลดหนัก |
| Soft-Close Side Mount | Full | 35kg | 300-550mm | ปิดนุ่ม |

**Clearance Requirements:**
- ระยะหักออกจากความกว้างตู้: **12.7mm ต่อข้าง** (รวม 25.4mm)

```typescript
interface BallBearingSlideSpec {
  type: 'side_mount' | 'center_mount'
  extension: 'full' | '3/4' | '1/2'
  loadCapacity: number    // kg
  lengths: number[]       // available lengths in mm
  clearancePerSide: 12.7  // mm
  softClose: boolean
  mountingHoles: {
    slotLength: number    // สำหรับการปรับระดับ
    holeSpacing: number
    holeDiameter: number
  }
}
```

#### 3.2.2 Undermount Slides (รางซ่อน)

| รุ่น | Load Capacity | Lengths | Features |
|------|---------------|---------|----------|
| Blum Tandem 500 | 30kg | 250-600mm | ซ่อนใต้ลิ้นชัก |
| Blum Tandem 550H (BLUMOTION) | 30kg | 270-650mm | ซ่อน + ปิดนุ่ม |
| Blum Legrabox | 40kg | 270-650mm | Premium + SERVO-DRIVE |
| Hettich Actro 5D | 40kg | 300-650mm | Full extension |

**Clearance Requirements:**
- ระยะหักออก: **10-15mm** (ขึ้นอยู่กับรุ่น)
- ต้องการความลึกก้นลิ้นชัก: **12-16mm**

```typescript
interface UndermountSlideSpec {
  brand: string
  model: string
  loadCapacity: number
  lengths: number[]
  clearance: number       // 10-15mm
  drawerBottomThickness: number  // ความหนาก้นลิ้นชัก
  drawerSideThickness: {
    min: number           // 12mm
    max: number           // 19mm
  }
  mountingPattern: {
    type: 'front_bracket' | 'rear_socket'
    holes: DrillHole[]
  }
}
```

### 3.3 Lift Systems (ระบบยกบาน)

#### 3.3.1 Aventos HK-S (Blum)

**สำหรับ:** บานเปิดขึ้นขนาดเล็ก-กลาง

| พารามิเตอร์ | ค่า |
|-------------|-----|
| Front Height | 280-350mm |
| Front Width | ≤ 1800mm |
| Front Weight | 1.5-9kg |
| Opening Angle | 107° |

```typescript
interface AventosHKSSpec {
  frontHeight: { min: 280, max: 350 }
  frontWidth: { max: 1800 }
  frontWeight: { min: 1.5, max: 9 }
  openingAngle: 107
  powerFactor: number  // คำนวณจาก weight × height
  mountingHoles: DrillHole[]
}
```

#### 3.3.2 Aventos HF (Blum)

**สำหรับ:** บานพับขึ้นแบบ Bi-fold

| พารามิเตอร์ | ค่า |
|-------------|-----|
| Front Height | 480-1040mm |
| Front Width | ≤ 1800mm |
| Front Weight | 3.5-17.5kg (ต่อบาน) |

### 3.4 Shelf Supports (หมุดรองชั้น)

| ประเภท | Diameter | Length | Load Capacity | ใช้กับ |
|--------|----------|--------|---------------|--------|
| Metal Pin | 5mm | 16mm | 15kg/pin | ชั้นทั่วไป |
| Plastic Pin | 5mm | 14mm | 10kg/pin | ชั้นเบา |
| Glass Shelf Support | 5mm | 20mm | 8kg/pin | ชั้นกระจก |
| Locking Pin | 5mm | 18mm | 20kg/pin | ชั้นยึดแน่น |

---

## ส่วนที่ 4: Compatibility Matrix

### 4.1 Panel Thickness Compatibility

| อุปกรณ์ | 15mm | 16mm | 18mm | 19mm | 25mm |
|---------|------|------|------|------|------|
| Blum Clip Top 110° | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Confirmat 7×50 | ❌ | ✅ | ✅ | ✅ | ✅ |
| Dowel 8×30 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Minifix 15mm | ❌ | ✅ | ✅ | ✅ | ✅ |
| System 32 (13mm deep) | ❌ | ⚠️ | ✅ | ✅ | ✅ |

**Legend:** ✅ Compatible, ⚠️ Limited, ❌ Not Compatible

### 4.2 Door Size Limits by Hinge

| บานพับ | Max Width | Max Height | Max Weight |
|--------|-----------|------------|------------|
| Blum Clip Top 110° | 600mm | 2000mm | 16kg (4 hinges) |
| Blum Clip Top 155° | 400mm | 2000mm | 16kg |
| Heavy Duty (Grass) | 800mm | 2400mm | 25kg |

### 4.3 Drawer Width Limits by Slide

| รางลิ้นชัก | Min Width | Max Width | Max Depth |
|------------|-----------|-----------|-----------|
| Ball Bearing 35kg | 300mm | 900mm | 600mm |
| Ball Bearing 50kg | 300mm | 1000mm | 700mm |
| Blum Tandem 30kg | 280mm | 900mm | 650mm |
| Blum Legrabox 40kg | 280mm | 1200mm | 650mm |

---

## ส่วนที่ 5: DXF Layer Naming Convention

### 5.1 Drilling Layers

```
DRILL_[Axis]_[Diameter]_[Depth/Type]

Axis:
- V = Vertical (ตั้งฉากกับหน้าแผ่น)
- H = Horizontal (ขนานกับหน้าแผ่น)
- Z = Z-axis (from top/bottom edge)

Diameter: เส้นผ่านศูนย์กลางเป็น mm

Depth/Type:
- D[xx] = Depth in mm
- THRU = Through hole (ทะลุ)
```

**ตัวอย่าง:**
- `DRILL_V_5_D13` - รูแนวตั้ง Ø5mm ลึก 13mm (Shelf Pin)
- `DRILL_V_8_D12` - รูแนวตั้ง Ø8mm ลึก 12mm (Dowel)
- `DRILL_V_35_D12.5` - รูแนวตั้ง Ø35mm ลึก 12.5mm (Hinge Cup)
- `DRILL_H_5_D37` - รูแนวนอน Ø5mm ลึก 37mm (Confirmat Edge)
- `DRILL_V_8_THRU` - รูทะลุ Ø8mm (Minifix Bolt)

### 5.2 Special Operations

```
[Operation]_[Details]

Operations:
- CSINK = Countersink
- HINGE = Hinge drilling pattern
- SAW = Saw cut / Routing
- POCKET = Pocket milling
```

**ตัวอย่าง:**
- `CSINK_11_D3` - Countersink Ø11mm ลึก 3mm
- `HINGE_CUP_35` - Hinge cup pattern (รวม pilot holes)
- `SAW_GROOVE_D8` - Groove ลึก 8mm (สำหรับแผ่นหลัง)
- `POCKET_15_D12.5` - Pocket Ø15mm ลึก 12.5mm (Minifix housing)

### 5.3 Layer Color Standards

| Layer | Color (DXF Code) | Purpose |
|-------|-----------------|---------|
| CUT_OUT | White (7) | Profile cut |
| DRILL_V_* | Red (1) | Vertical drilling |
| DRILL_H_* | Yellow (2) | Horizontal drilling |
| HINGE_CUP_* | Green (3) | Hinge patterns |
| SAW_GROOVE_* | Cyan (4) | Grooving |
| CSINK_* | Magenta (6) | Countersinking |
| ANNOTATION | Grey (8) | Non-cutting |

---

## ส่วนที่ 6: Validation Rules

### 6.1 Minimum Edge Distances

```typescript
interface EdgeDistanceRules {
  shelfPin: 37,      // mm from panel edge
  confirmat: 25,     // mm from panel edge
  dowel: 37,         // mm from panel edge
  minifix: 34,       // mm from panel edge (housing)
  hingeCup: 3,       // mm from door edge (minimum)
}
```

### 6.2 Collision Detection

```typescript
function validateDrillingPattern(
  holes: DrillHole[],
  panelWidth: number,
  panelHeight: number,
  panelThickness: number
): ValidationResult {
  const errors: string[] = []

  for (const hole of holes) {
    // Check edge distance
    if (hole.x < EDGE_DISTANCE_RULES[hole.type]) {
      errors.push(`Hole at (${hole.x}, ${hole.y}) too close to left edge`)
    }
    if (hole.y < EDGE_DISTANCE_RULES[hole.type]) {
      errors.push(`Hole at (${hole.x}, ${hole.y}) too close to bottom edge`)
    }

    // Check depth vs thickness
    if (hole.depth > panelThickness - 3) {
      errors.push(`Hole at (${hole.x}, ${hole.y}) depth exceeds safe limit`)
    }

    // Check for collisions with other holes
    for (const other of holes) {
      if (hole === other) continue
      const distance = Math.sqrt(
        Math.pow(hole.x - other.x, 2) +
        Math.pow(hole.y - other.y, 2)
      )
      const minDistance = (hole.diameter + other.diameter) / 2 + 3
      if (distance < minDistance) {
        errors.push(`Hole collision detected at (${hole.x}, ${hole.y})`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  }
}
```

### 6.3 Hardware Compatibility Check

```typescript
function validateHardwareCompatibility(
  hardware: HardwareItem,
  panel: PanelSpec
): ValidationResult {
  const errors: string[] = []

  // Check thickness compatibility
  if (panel.thickness < hardware.minThickness) {
    errors.push(
      `Panel thickness ${panel.thickness}mm is below minimum ` +
      `${hardware.minThickness}mm for ${hardware.name}`
    )
  }

  // Check drilling depth vs panel thickness
  const maxDepth = hardware.drilling.maxDepth
  const safeDepth = panel.thickness - 3  // Leave 3mm minimum

  if (maxDepth > safeDepth) {
    errors.push(
      `Drilling depth ${maxDepth}mm would exceed safe limit ` +
      `${safeDepth}mm for panel thickness ${panel.thickness}mm`
    )
  }

  // Check load capacity
  if (hardware.type === 'shelf_support') {
    const requiredCapacity = calculateShelfLoad(panel)
    if (hardware.loadCapacity * 4 < requiredCapacity) {  // 4 pins
      errors.push(
        `Shelf supports may not handle expected load of ${requiredCapacity}kg`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  }
}
```

---

## ส่วนที่ 7: G-code Generation for Drilling

### 7.1 Drilling Cycle (G81)

```gcode
; Standard drilling cycle
G81 X[x] Y[y] Z-[depth] R2 F[feed]

; Example: Shelf pin hole
G81 X37.000 Y37.000 Z-13.000 R2.000 F500
```

### 7.2 Peck Drilling Cycle (G83)

สำหรับรูลึก (depth > 3 × diameter):

```gcode
; Peck drilling cycle
G83 X[x] Y[y] Z-[depth] R2 Q[peck_depth] F[feed]

; Example: Confirmat edge hole (deep)
G83 X9.000 Y50.000 Z-37.000 R2.000 Q5.000 F300
```

### 7.3 Boring Cycle (G85)

สำหรับรูที่ต้องการความแม่นยำสูง (Hinge cup):

```gcode
; Boring cycle with controlled retract
G85 X[x] Y[y] Z-[depth] R2 F[feed]

; Example: Hinge cup
G85 X22.000 Y100.000 Z-12.500 R2.000 F200
```

### 7.4 Complete Drilling Program Example

```gcode
; IIMOS Drilling Program
; Panel: LEFT_SIDE
; Material: PB 18mm
; Date: 2026-01-10

; Setup
G21              ; Metric
G90              ; Absolute
G17              ; XY plane
G94              ; Feed per minute
M03 S18000       ; Spindle on

; Tool: 5mm drill
T1 M06
G43 H1 Z50.000   ; Tool length comp

; Shelf pin holes (System 32)
G81 R2.000 F500
X37.000 Y37.000 Z-13.000
X37.000 Y69.000 Z-13.000
X37.000 Y101.000 Z-13.000
X37.000 Y133.000 Z-13.000
; ... (continue for all holes)
G80              ; Cancel cycle

; Tool: 8mm drill (Dowels)
T2 M06
G43 H2 Z50.000
G81 R2.000 F400
X50.000 Y9.000 Z-13.000
X150.000 Y9.000 Z-13.000
; ...
G80

; Tool: 35mm Forstner (Hinge cups)
T3 M06
G43 H3 Z50.000
G85 R2.000 F150
X22.000 Y100.000 Z-12.500
X22.000 Y620.000 Z-12.500
G80

; End
M05              ; Spindle off
G91 G28 Z0       ; Return to home
M30              ; End program
```

---

## ภาคผนวก A: Hardware Database Schema

```sql
-- Hardware Types
CREATE TABLE hardware_type (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL  -- 'hinge', 'slide', 'lift', 'support', 'fastener'
);

-- Hardware Items
CREATE TABLE hardware (
  id TEXT PRIMARY KEY,
  type_id TEXT REFERENCES hardware_type(id),
  brand TEXT,
  model TEXT,
  description TEXT,
  load_capacity_kg REAL,
  min_thickness_mm REAL,
  max_thickness_mm REAL,
  cost_thb REAL,
  safety_rating TEXT  -- 'SAFE', 'WARN', 'UNSAFE'
);

-- Drilling Patterns
CREATE TABLE drilling_pattern (
  hardware_id TEXT REFERENCES hardware(id),
  hole_index INTEGER,
  x_offset_mm REAL,
  y_offset_mm REAL,
  diameter_mm REAL,
  depth_mm REAL,
  axis TEXT,  -- 'V', 'H', 'Z'
  hole_type TEXT,  -- 'pilot', 'main', 'countersink'
  PRIMARY KEY (hardware_id, hole_index)
);

-- Panel-Hardware Assignments
CREATE TABLE panel_hardware (
  panel_id TEXT,
  hardware_id TEXT REFERENCES hardware(id),
  position_x_mm REAL,
  position_y_mm REAL,
  rotation_deg REAL DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  PRIMARY KEY (panel_id, hardware_id, position_x_mm, position_y_mm)
);
```

---

## ภาคผนวก B: Quick Reference

### Drilling Depths by Panel Thickness

| Panel Thickness | Max Depth | Safe Depth | Shelf Pin | Dowel | Hinge Cup |
|-----------------|-----------|------------|-----------|-------|-----------|
| 16mm | 13mm | 13mm | ✅ 13mm | ✅ 13mm | ⚠️ 12mm |
| 18mm | 15mm | 15mm | ✅ 13mm | ✅ 13mm | ✅ 12.5mm |
| 19mm | 16mm | 16mm | ✅ 13mm | ✅ 13mm | ✅ 12.5mm |
| 25mm | 22mm | 22mm | ✅ 13mm | ✅ 15mm | ✅ 12.5mm |

### Common Hole Patterns

| Application | Diameter | Depth | Spacing | Edge Distance |
|-------------|----------|-------|---------|---------------|
| Shelf Pin | 5mm | 13mm | 32mm | 37mm |
| Dowel | 8mm | 13mm | 32/64mm | 37mm |
| Confirmat Face | 8mm | through | - | 25mm |
| Confirmat Edge | 5mm | 37mm | - | 50mm from end |
| Hinge Cup | 35mm | 12.5mm | - | 3-6mm |
| Minifix Housing | 15mm | 12.5mm | - | 34mm |

---

## สรุป (Conclusion)

เอกสารนี้ครอบคลุมข้อกำหนดทางเทคนิคสำหรับระบบอุปกรณ์และการเจาะทั้งหมดที่ใช้ในการผลิตตู้เฟอร์นิเจอร์

### จุดสำคัญ:

1. **ระบบ 32mm** เป็นมาตรฐานสากล - ใช้ Grid Spacing 32mm และ Edge Distance 37mm
2. **Layer Naming Convention** - ใช้รูปแบบ `DRILL_[Axis]_[Diameter]_[Depth]` สำหรับ DXF
3. **Validation** - ต้องตรวจสอบ Edge Distance, Depth vs Thickness, และ Collision Detection
4. **Hardware Compatibility** - ตรวจสอบความเข้ากันได้ของอุปกรณ์กับความหนาแผ่น

---

**เอกสารอ้างอิง:**
- Blum Technical Documentation
- Hettich Product Catalog
- Häfele Furniture Fittings Handbook
- European Kitchen Cabinet Standards (EN 16121)
