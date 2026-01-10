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

## ส่วนที่ 8: Blum Complete Hardware Database (Architecture v14.0)

ส่วนนี้รวบรวม SKU ทั้งหมดของ Blum ที่ยังไม่ได้ครอบคลุมในส่วนก่อนหน้า รวมถึง Lift Systems, Box Systems, และ Hinges รุ่นประหยัด

### 8.1 Master Hardware Database

```typescript
// src/services/hardware/masterDb.ts

export type SystemType =
  // Existing Systems
  | 'BLUM_MOVENTO' | 'BLUM_TANDEM_FULL' | 'BLUM_TANDEM_PART'
  // Lift Systems
  | 'AVENTOS_HS_TOP' | 'AVENTOS_HL_TOP' | 'AVENTOS_HK_TOP' | 'AVENTOS_HK_S'
  // Box Systems
  | 'MERIVOBOX' | 'TANDEMBOX_ANTARO' | 'METABOX_320'
  // Hinges
  | 'HINGE_MODUL';

export interface HardwareItem {
  id: string;
  brand: 'HAFELE' | 'BLUM';
  itemNo: string;
  name: string;
  category: 'LIFT_MECHANISM' | 'DRAWER_SIDE' | 'HINGE_CUP' | 'ACCESSORY';
  specs: {
    // Lift Specs
    powerFactorMin?: number;
    powerFactorMax?: number;
    minCabinetHeight?: number;
    rodDeduction?: number;     // ค่าลบสำหรับตัดเหล็กโยง (LW - X)

    // Drawer Specs
    nominalLength?: number;
    cutlist?: {
      bottomWidthDed: number;  // ค่าลบความกว้างพื้น (LW - X)
      bottomDepthDed: number;  // ค่าลบความลึกพื้น (NL - Y)
      backWidthDed: number;    // ค่าลบความกว้างหลัง (LW - Z)
    };
    drillPattern?: 'MERIVO_M' | 'TANDEM_STD' | 'METABOX';

    // Hinge Specs
    openingAngle?: number;
  };
}
```

### 8.2 Lift Systems (AVENTOS HS, HL, HK top, HK-S)

```typescript
export const LIFT_SYSTEMS = {
  // =================================================================
  // AVENTOS HS top (Up & Over) - Requires Stabilizer Rod
  // =================================================================
  hs_top_set: {
    id: 'hs_top_b', brand: 'BLUM', itemNo: '22S2500',
    name: 'HS top Set B',
    category: 'LIFT_MECHANISM',
    specs: {
      minCabinetHeight: 526,
      rodDeduction: 129  // สูตรตัดเหล็กโยง: LW - 129mm
    }
  },

  // =================================================================
  // AVENTOS HL top (Lift Up) - Requires Stabilizer Rod
  // =================================================================
  hl_top_set: {
    id: 'hl_top_25', brand: 'BLUM', itemNo: '22L2500',
    name: 'HL top Set 25',
    category: 'LIFT_MECHANISM',
    specs: {
      minCabinetHeight: 390,
      rodDeduction: 129  // สูตรตัดเหล็กโยง: LW - 129mm
    }
  },

  // =================================================================
  // AVENTOS HK top (Stay Lift - Modern Standard)
  // =================================================================
  hk_top_27: {
    id: 'hk_top_27', brand: 'BLUM', itemNo: '22K2700',
    name: 'HK top Medium',
    category: 'LIFT_MECHANISM',
    specs: {
      powerFactorMin: 1730,
      powerFactorMax: 5200
    }
  },

  // =================================================================
  // AVENTOS HK-S (Small Stay Lift)
  // =================================================================
  hks_weak: {
    id: 'hks_20k2', brand: 'BLUM', itemNo: '20K2B00',
    name: 'HK-S Weak',
    category: 'LIFT_MECHANISM',
    specs: {
      powerFactorMin: 220,
      powerFactorMax: 500
    }
  },

  // =================================================================
  // Cross Stabilizer Rod (สำหรับ HS/HL)
  // =================================================================
  rod_oval: {
    id: 'rod_1061', brand: 'BLUM', itemNo: '20Q1061',
    name: 'Cross Stabilizer Rod',
    category: 'ACCESSORY',
    specs: {}
  },
};
```

### 8.3 Box Systems (MERIVOBOX, TANDEMBOX, METABOX)

```typescript
export const BOX_SYSTEMS = {
  // =================================================================
  // MERIVOBOX (Platform) - Bottom: LW-51
  // =================================================================
  merivo_m: {
    id: 'meri_m_500', brand: 'BLUM', itemNo: '470M5002',
    name: 'MERIVOBOX M NL500',
    category: 'DRAWER_SIDE',
    specs: {
      nominalLength: 500,
      cutlist: {
        bottomWidthDed: 51,  // Bottom = LW - 51mm
        bottomDepthDed: 26,  // Bottom Depth = NL - 26mm
        backWidthDed: 51     // Back = LW - 51mm
      },
      drillPattern: 'MERIVO_M'
    }
  },

  // =================================================================
  // TANDEMBOX antaro (Classic) - Bottom: LW-75 (16mm)
  // =================================================================
  antaro_m: {
    id: 'antaro_m_500', brand: 'BLUM', itemNo: '378M5002',
    name: 'TANDEMBOX antaro M NL500',
    category: 'DRAWER_SIDE',
    specs: {
      nominalLength: 500,
      cutlist: {
        bottomWidthDed: 75,  // Bottom = LW - 75mm
        bottomDepthDed: 24,  // Bottom Depth = NL - 24mm
        backWidthDed: 87     // Back = LW - 87mm
      },
      drillPattern: 'TANDEM_STD'
    }
  },

  // =================================================================
  // METABOX (Economy) - Bottom: LW-31
  // =================================================================
  meta_m: {
    id: 'meta_320_500', brand: 'BLUM', itemNo: '320M5000',
    name: 'METABOX 320M NL500',
    category: 'DRAWER_SIDE',
    specs: {
      nominalLength: 500,
      cutlist: {
        bottomWidthDed: 31,  // Bottom = LW - 31mm
        bottomDepthDed: 2,   // Bottom Depth = NL - 2mm
        backWidthDed: 31     // Back = LW - 31mm
      },
      drillPattern: 'METABOX'
    }
  },
};
```

### 8.4 MODUL Hinge (Economy)

```typescript
export const HINGE_SYSTEMS = {
  // =================================================================
  // MODUL HINGE (Page 2) - Economy Option
  // =================================================================
  modul_100: {
    id: 'mod_100', brand: 'BLUM', itemNo: '91M2550',
    name: 'MODUL 100° Slide-on',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 100
    }
  },
};
```

### 8.5 Box Systems Comparison

| Feature | MERIVOBOX | TANDEMBOX antaro | METABOX |
|---------|-----------|------------------|---------|
| **Profile Shape** | Straight L | Curved | Sloped |
| **Bottom Deduction** | LW - 51mm | LW - 75mm | LW - 31mm |
| **Back Deduction** | LW - 51mm | LW - 87mm | LW - 31mm |
| **Depth Deduction** | NL - 26mm | NL - 24mm | NL - 2mm |
| **Drill Pattern** | MERIVO_M | TANDEM_STD | METABOX |
| **Price Level** | Premium | Standard | Economy |
| **Visual Style** | Modern | Classic Rounded | Industrial |

### 8.6 Lift Engineering Engine

```typescript
// src/services/engineering/finalEngine.ts

export const calculateFinalLift = (
  kh: number,       // Cabinet Height
  width: number,    // Internal Width
  weight: number,   // Front Weight
  system: SystemType
) => {
  const db = LIFT_SYSTEMS;
  const LF = kh * weight; // Lift Factor

  let mech: HardwareItem | undefined;
  let rodLength: number | undefined;

  switch (system) {
    case 'AVENTOS_HK_TOP':
      mech = db.hk_top_27;
      break;
    case 'AVENTOS_HK_S':
      mech = db.hks_weak;
      break;
    case 'AVENTOS_HS_TOP':
    case 'AVENTOS_HL_TOP':
      mech = system === 'AVENTOS_HS_TOP' ? db.hs_top_set : db.hl_top_set;
      // Formula: Rod = Internal Width - Deduction (129mm)
      rodLength = width - (mech.specs.rodDeduction || 129);
      break;
  }

  // Drill Position (from cabinet top)
  let drillY = 0;
  if (system === 'AVENTOS_HK_TOP') drillY = 173;
  else if (system === 'AVENTOS_HK_S') drillY = 100;
  else if (system === 'AVENTOS_HS_TOP') drillY = 240;
  else if (system === 'AVENTOS_HL_TOP') drillY = 150;

  return { isValid: !!mech, mech, rodLength, drillY };
};
```

### 8.7 Box Engineering Engine

```typescript
export const calculateFinalDrawer = (
  lw: number,       // Internal Width
  system: SystemType
) => {
  const db = BOX_SYSTEMS;
  let side: HardwareItem;

  if (system === 'MERIVOBOX') side = db.merivo_m;
  else if (system === 'TANDEMBOX_ANTARO') side = db.antaro_m;
  else if (system === 'METABOX_320') side = db.meta_m;
  else side = db.merivo_m; // Default

  const c = side.specs.cutlist!;

  // CUTLIST FORMULA
  const cutList = {
    bottom: {
      w: lw - c.bottomWidthDed,
      d: side.specs.nominalLength! - c.bottomDepthDed
    },
    back: {
      w: lw - c.backWidthDed,
      h: 84  // Standard M height
    }
  };

  // DRILL PATTERN Y (from Drawer Base)
  let drillY = 32;
  if (side.specs.drillPattern === 'METABOX') drillY = 33;
  else if (side.specs.drillPattern === 'TANDEM_STD') drillY = 33;

  return { isValid: true, side, cutList, drillY };
};
```

### 8.8 CAM Operations Generator

```typescript
// src/services/cam/generators/finalOp.ts

export const generateFinalOps = (opts: any): MachineOp[] => {
  const ops: MachineOp[] = [];

  // === LIFT OPERATIONS ===
  if (opts.type === 'LIFT') {
    const res = calculateFinalLift(opts.kh, opts.lw, opts.weight, opts.system);

    // 1. Mechanism Drill
    if (res.mech) {
      ops.push({
        id: 'lift-mech', type: 'DRILL', face: 'FACE',
        x: 37, y: res.drillY,
        diameter: 5, depth: 13, hardwareId: res.mech.itemNo
      });
    }

    // 2. Cross Stabilizer Rod Cut (สำหรับ HS/HL)
    if (res.rodLength) {
      ops.push({
        id: 'cut-rod', type: 'CUT_METAL',
        params: { length: res.rodLength, material: 'ALU_OVAL' },
        hardwareId: '20Q1061'
      });
    }
  }

  // === DRAWER OPERATIONS ===
  else if (opts.type === 'DRAWER') {
    const res = calculateFinalDrawer(opts.lw, opts.system);

    // Pattern differs by system
    const xPositions = res.side.specs.drillPattern === 'METABOX'
      ? [37, 165]           // 2-hole pattern
      : [37, 224, 256];     // 3-hole pattern

    xPositions.forEach(x => {
      ops.push({
        id: `run-${x}`, type: 'DRILL', face: 'FACE',
        x: x, y: opts.drawerY + res.drillY,
        diameter: 5, depth: 13, hardwareId: res.side.itemNo
      });
    });
  }

  return ops;
};
```

### 8.9 Lift Systems Drilling Reference

```
AVENTOS HS top:
┌─────────────────────────────────────────┐
│                 TOP                      │
├─────────────────────────────────────────┤
│                                         │
│  ○                                   ○  │ ← Mechanism (240mm from top)
│  │                                   │  │
│  │←───── Cross Stabilizer Rod ─────→│  │
│  │       (LW - 129mm)               │  │
│                                         │
│                                         │
└─────────────────────────────────────────┘

AVENTOS HK top:
┌─────────────────────────────────────────┐
│                 TOP                      │
├─────────────────────────────────────────┤
│  ○                                   ○  │ ← Mechanism (173mm from top)
│                                         │
│          (No Rod Required)              │
│                                         │
└─────────────────────────────────────────┘

AVENTOS HK-S:
┌─────────────────────────────────────────┐
│                 TOP                      │
├─────────────────────────────────────────┤
│  ○                                   ○  │ ← Mechanism (100mm from top)
│                                         │
│       (Compact / Small Cabinets)        │
│                                         │
└─────────────────────────────────────────┘
```

### 8.10 Box Systems Drilling Reference

```
MERIVOBOX (3-hole pattern):
┌─────────────────────────────────────────┐
│           CABINET SIDE                  │
│                                         │
│  ○──────────────────○────○              │
│  37mm            224mm  256mm           │
│                                         │
│  Y = Drawer Base + 32mm                 │
└─────────────────────────────────────────┘

TANDEMBOX antaro (3-hole pattern):
┌─────────────────────────────────────────┐
│           CABINET SIDE                  │
│                                         │
│  ○──────────────────○────○              │
│  37mm            224mm  256mm           │
│                                         │
│  Y = Drawer Base + 33mm                 │
└─────────────────────────────────────────┘

METABOX (2-hole pattern):
┌─────────────────────────────────────────┐
│           CABINET SIDE                  │
│                                         │
│  ○────────────○                         │
│  37mm       165mm                       │
│                                         │
│  Y = Drawer Base + 33mm                 │
└─────────────────────────────────────────┘
```

### 8.11 Cutlist Quick Reference

| System | Bottom Width | Bottom Depth | Back Width |
|--------|--------------|--------------|------------|
| MERIVOBOX | LW - 51 | NL - 26 | LW - 51 |
| TANDEMBOX antaro | LW - 75 | NL - 24 | LW - 87 |
| METABOX | LW - 31 | NL - 2 | LW - 31 |
| Wood Drawer (MOVENTO) | LW - 42 | NL - 10 | LW - 42 |

**ตัวอย่าง: Cabinet LW = 500mm, NL = 500mm**

| System | Bottom W | Bottom D | Back W |
|--------|----------|----------|--------|
| MERIVOBOX | 449mm | 474mm | 449mm |
| TANDEMBOX antaro | 425mm | 476mm | 413mm |
| METABOX | 469mm | 498mm | 469mm |
| Wood Drawer | 458mm | 490mm | 458mm |

### 8.12 Cross Stabilizer Rod Cutting Formula

สำหรับ AVENTOS HS top และ HL top ต้องใช้เหล็กโยง (Cross Stabilizer Rod) เพื่อยึดกลไกทั้ง 2 ฝั่ง

```
Rod Length = Internal Cabinet Width - 129mm

ตัวอย่าง:
- Cabinet LW = 900mm → Rod = 900 - 129 = 771mm
- Cabinet LW = 600mm → Rod = 600 - 129 = 471mm
```

```typescript
function calculateRodLength(cabinetLW: number): number {
  const ROD_DEDUCTION = 129; // mm
  return cabinetLW - ROD_DEDUCTION;
}

// CAM Operation for Metal Cutting
function generateRodCutOp(rodLength: number): MachineOp {
  return {
    id: 'cut-rod',
    type: 'CUT_METAL',
    params: {
      length: rodLength,
      material: 'ALU_OVAL',
      stockItem: '20Q1061'
    }
  };
}
```

---

## ส่วนที่ 9: Blum Hinge & HK-XS Linked System (Architecture v11.0)

ส่วนนี้รวบรวมข้อมูลจากไฟล์ Blum 68-197 (ระบบบานพับและบานยก) โดยเน้น **Linked Kinematics** - ความสัมพันธ์ระหว่างบานพับ (Hinge) และโช๊คช่วยยก (HK-XS) ที่ต้องคำนวณร่วมกัน

### 9.1 Engineering Logic Highlights

| Feature | Description |
|---------|-------------|
| **Linked Kinematics** | ตำแหน่งเจาะโช๊ค HK-XS ($H$) อ้างอิงค่า $MD$ และ $K$ จากบานพับที่เลือก |
| **Blum Solver** | สูตร $FA = TB + 10 - MD$ แม่นยำกว่าสูตรทั่วไป |
| **Pattern Recognition** | ระยะเจาะรูสกรู 45/9.5mm (Blum Standard) |

### 9.2 Master Hardware Database (Hinge & Lift)

```typescript
// src/services/hardware/masterDb.ts

export type SystemType =
  | 'MINIFIX_15' | 'SC_8_60'
  // --- BLUM SYSTEMS ---
  | 'BLUM_HK_XS'         // Stay Lift
  | 'BLUM_CLIP_110'      // Standard
  | 'BLUM_CLIP_155'      // Zero Protrusion
  | 'BLUM_CLIP_THIN'     // Thin Door
  | 'BLUM_CLIP_BLIND';   // Blind Corner

export interface HardwareItem {
  id: string;
  brand: 'HAFELE' | 'BLUM';
  itemNo: string;
  name: string;
  category: 'LIFT' | 'HINGE_CUP' | 'HINGE_PLATE' | 'ACCESSORY';
  specs: {
    // Hinge Specs
    cupDepth?: number;       // Standard 13mm
    openingAngle?: number;
    pattern?: string;        // '45/9.5'
    crankConstant?: number;  // ค่าคงที่ของรุ่น (TB3->FA13 => K=10)
    crank?: number;          // 0 (Full), 9.5 (Half), 18 (Inset)

    // Lift Specs
    powerFactorMin?: number; // LF = KH * Weight
    powerFactorMax?: number;

    // Plate Specs
    distance?: number;       // MD (0, 3, 9)
  };
}

export const MASTER_DB = {
  // =================================================================
  // 1. AVENTOS HK-XS (Page 64)
  // =================================================================
  lifts: {
    hkxs_weak: {
      id: 'hkxs_20k1101', brand: 'BLUM', itemNo: '20K1101',
      name: 'HK-XS Weak (LF 200-1000)', category: 'LIFT',
      specs: { powerFactorMin: 200, powerFactorMax: 1000 }
    },
    hkxs_med: {
      id: 'hkxs_20k1301', brand: 'BLUM', itemNo: '20K1301',
      name: 'HK-XS Medium (LF 500-1500)', category: 'LIFT',
      specs: { powerFactorMin: 500, powerFactorMax: 1500 }
    },
    hkxs_strong: {
      id: 'hkxs_20k1501', brand: 'BLUM', itemNo: '20K1501',
      name: 'HK-XS Strong (LF 800-1800)', category: 'LIFT',
      specs: { powerFactorMin: 800, powerFactorMax: 1800 }
    },

    // Brackets
    hkxs_cab: {
      id: 'hkxs_cab', brand: 'BLUM', itemNo: '20K5101',
      name: 'Cabinet Fixing', category: 'ACCESSORY', specs: {}
    },
    hkxs_front: {
      id: 'hkxs_front', brand: 'BLUM', itemNo: '20K4101',
      name: 'Front Fixing', category: 'ACCESSORY', specs: {}
    },
  },

  // =================================================================
  // 2. CLIP TOP BLUMOTION (Page 74-76)
  // =================================================================
  hinges: {
    // Standard 110° (Page 76 - Table)
    // Formula: Overlay = TB + 10 - MD
    b110_full: {
      id: 'b110_full', brand: 'BLUM', itemNo: '71B3550',
      name: 'CLIP top 110° Full', category: 'HINGE_CUP',
      specs: {
        openingAngle: 110, crank: 0, crankConstant: 10,
        cupDepth: 13, pattern: '45/9.5'
      }
    },
    b110_half: {
      id: 'b110_half', brand: 'BLUM', itemNo: '71B3650',
      name: 'CLIP top 110° Half', category: 'HINGE_CUP',
      specs: {
        openingAngle: 110, crank: 9.5, crankConstant: 10,
        cupDepth: 13, pattern: '45/9.5'
      }
    },
    b110_inset: {
      id: 'b110_inset', brand: 'BLUM', itemNo: '71B3750',
      name: 'CLIP top 110° Inset', category: 'HINGE_CUP',
      specs: {
        openingAngle: 110, crank: 18, crankConstant: 10,
        cupDepth: 13, pattern: '45/9.5'
      }
    },

    // Wide Angle 155° (Page 84)
    b155_zero: {
      id: 'b155_zero', brand: 'BLUM', itemNo: '71B7550',
      name: 'CLIP top 155° Zero', category: 'HINGE_CUP',
      specs: {
        openingAngle: 155, crank: 0, crankConstant: 10,
        cupDepth: 11.5, pattern: '45/9.5'
      }
    },
  },

  plates: {
    // Mounting Plates (MD 0, 3, 9) - Page 150
    bp_d0: {
      id: 'bp_d0', brand: 'BLUM', itemNo: '173H7100',
      name: 'Cruciform Plate D0', category: 'HINGE_PLATE',
      specs: { distance: 0 }
    },
    bp_d3: {
      id: 'bp_d3', brand: 'BLUM', itemNo: '173H7130',
      name: 'Cruciform Plate D3', category: 'HINGE_PLATE',
      specs: { distance: 3 }
    },
    bp_d9: {
      id: 'bp_d9', brand: 'BLUM', itemNo: '175H7190',
      name: 'Cruciform Plate D9', category: 'HINGE_PLATE',
      specs: { distance: 9 }
    },
  }
};
```

### 9.3 Blum Engineering Engine

หัวใจสำคัญ: เชื่อมโยงผลลัพธ์การคำนวณ Hinge (MD, Crank) ไปสู่สูตรของ HK-XS

```typescript
// src/services/engineering/blumEngine.ts
import { MASTER_DB, HardwareItem, SystemType } from '../hardware/masterDb';

interface HingeResult {
  cup: HardwareItem;
  plate: HardwareItem;
  bestTB: number; // Drilling Distance (3-7mm)
  bestMD: number; // Plate Spacing
}

// === 1. HINGE SOLVER ===
// คำนวณหาคู่ TB และ MD ที่ดีที่สุดสำหรับระยะทับขอบ (Overlay) ที่ต้องการ
export const calculateBlumHinge = (
  overlay: number,
  system: SystemType
): HingeResult => {
  const db = MASTER_DB.hinges;
  const plates = MASTER_DB.plates;

  // 1.1 Select Arm Type
  let cup = db.b110_full;
  if (system === 'BLUM_CLIP_155') {
    cup = db.b155_zero;
  } else {
    // Auto-select based on Overlay target
    if (overlay >= 11) cup = db.b110_full;      // Full (~14-19mm)
    else if (overlay >= 2) cup = db.b110_half;  // Half (~5-9mm)
    else cup = db.b110_inset;                   // Inset
  }

  // 1.2 Geometry Solver
  // Formula: Overlay = TB + Fixed - Crank - MD
  const Fixed = cup.specs.crankConstant || 10;
  const Crank = cup.specs.crank || 0;

  let bestTB = 5; // Default standard
  let bestMD = 0;
  let minDiff = 999;

  const availTB = [3, 4, 5, 6]; // Blum drilling distances
  const availMD = [0, 3, 9];    // Available plates

  for (const TB of availTB) {
    for (const MD of availMD) {
      const calcOverlay = TB + Fixed - Crank - MD;
      const diff = Math.abs(calcOverlay - overlay);

      if (diff < minDiff) {
        minDiff = diff;
        bestTB = TB;
        bestMD = MD;
      }
    }
  }

  // Map MD to Plate SKU
  let plate = plates.bp_d0;
  if (bestMD === 3) plate = plates.bp_d3;
  if (bestMD === 9) plate = plates.bp_d9;

  return { cup, plate, bestTB, bestMD };
};

// === 2. HK-XS CALCULATOR ===
// สูตรหน้า 64: H = 137 + MD + K + SOB
// ต้องรับค่า MD และ K จากบานพับที่คำนวณได้ข้างบน
export const calculateHKXS = (
  cabinetHeight: number,
  frontWeight: number,
  topThickness: number, // SOB
  hingeInfo: { md: number; crank: number } // ข้อมูลจาก Hinge Result
) => {
  const db = MASTER_DB.lifts;

  // Power Factor
  const LF = cabinetHeight * frontWeight;

  // Mechanism Selection
  let mech = db.hkxs_weak;
  if (LF > 1500) mech = db.hkxs_strong;
  else if (LF > 1000) mech = db.hkxs_med;

  // Calculate Drill Position Y (From Top Edge)
  // H = 137 + MD + K + SOB
  const drillY = 137 + hingeInfo.md + hingeInfo.crank + topThickness;

  return {
    isValid: true,
    mechanism: mech,
    drillY_cabinet: drillY,
    powerFactor: LF
  };
};
```

### 9.4 Blum Overlay Calculation Formula

```
BLUM OVERLAY FORMULA (Page 76):

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Overlay (FA) = TB + Fixed - Crank - MD                        │
│                                                                 │
│   Where:                                                        │
│   • TB    = Drilling Distance (3-6mm from door edge)            │
│   • Fixed = Crank Constant (10 for CLIP top 110°)               │
│   • Crank = Arm Type (0=Full, 9.5=Half, 18=Inset)               │
│   • MD    = Mounting Distance (0, 3, 9mm plate options)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

EXAMPLE CALCULATIONS:

Full Overlay (TB=5, Crank=0, MD=0):
  FA = 5 + 10 - 0 - 0 = 15mm ✓

Half Overlay (TB=5, Crank=9.5, MD=0):
  FA = 5 + 10 - 9.5 - 0 = 5.5mm ✓

Inset (TB=5, Crank=18, MD=0):
  FA = 5 + 10 - 18 - 0 = -3mm (negative = inset)
```

### 9.5 HK-XS Drilling Position Formula

```
HK-XS DRILL POSITION (Page 64):

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   H = 137 + MD + K + SOB                                        │
│                                                                 │
│   Where:                                                        │
│   • 137 = Base constant (mm)                                    │
│   • MD  = Mounting Distance from Hinge Plate                    │
│   • K   = Crank value from Hinge Cup                            │
│   • SOB = Top Panel Thickness (typically 18mm)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

CABINET SIDE VIEW:
┌─────────────────────────────────────────┐
│              TOP (SOB)                   │
├─────────────────────────────────────────┤
│                                         │
│  ○─────────────────────○                │ ← H = 137 + MD + K + SOB
│  │                     │                │
│  │    HK-XS Mechanism  │                │
│  │                     │                │
│                                         │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘

EXAMPLE: Full Overlay Hinge (MD=0, K=0) with 18mm Top:
  H = 137 + 0 + 0 + 18 = 155mm from cabinet top edge
```

### 9.6 CAM Generator for Blum Hinge & HK-XS

```typescript
// src/services/cam/generators/blumOp.ts
import { calculateBlumHinge, calculateHKXS } from '../../engineering/blumEngine';
import { MachineOp } from './types';

export const generateBlumOps = (
  doorId: string,
  cabinetId: string,
  opts: {
    overlay: number;
    hingeSystem: SystemType;
    doorHeight: number;
    cabinetHeight?: number;
    frontWeight?: number;
    topThickness?: number;
    system?: string;
  }
): MachineOp[] => {
  const ops: MachineOp[] = [];

  // 1. คำนวณ Hinge ก่อนเสมอ (เพราะ HK-XS ต้องใช้ค่า MD/Crank)
  const hingeRes = calculateBlumHinge(
    opts.overlay,
    opts.hingeSystem || 'BLUM_CLIP_110'
  );
  const { cup, plate, bestTB } = hingeRes;

  // === HINGE OPERATIONS ===
  // คำนวณจำนวนบานพับตามความสูง (หน้า 75)
  const qty = opts.doorHeight > 900 ? 3 : 2;
  const margin = 100;

  for (let i = 0; i < qty; i++) {
    const y = Math.round(
      margin + ((opts.doorHeight - 2 * margin) / (qty - 1)) * i
    );

    // 1.1 Door Cup (Pattern 45/9.5)
    const cupX = bestTB + 17.5;
    ops.push({
      id: `${doorId}-cup-${i}`,
      type: 'DRILL',
      face: 'FACE',
      x: cupX,
      y: y,
      diameter: 35,
      depth: 13,
      hardwareId: cup.itemNo
    });

    // Screw Holes (45mm spacing, 9.5mm offset)
    [-22.5, 22.5].forEach(offY => {
      ops.push({
        id: `${doorId}-scr-${i}-${offY}`,
        type: 'DRILL',
        face: 'FACE',
        x: cupX - 9.5,
        y: y + offY,
        diameter: 2.5,
        depth: 5 // Pilot Hole
      });
    });

    // 1.2 Cabinet Plate (System 32)
    [-16, 16].forEach(offY => {
      ops.push({
        id: `${cabinetId}-plt-${i}-${offY}`,
        type: 'DRILL',
        face: 'FACE',
        x: 37,
        y: y + offY,
        diameter: 5,
        depth: 13,
        hardwareId: plate.itemNo
      });
    });
  }

  // === AVENTOS HK-XS OPERATIONS ===
  if (opts.system === 'BLUM_HK_XS' && opts.cabinetHeight && opts.frontWeight) {
    // ส่งค่า MD และ Crank จากบานพับเข้าไปคำนวณ
    const liftRes = calculateHKXS(
      opts.cabinetHeight,
      opts.frontWeight,
      opts.topThickness || 18, // SOB
      { md: hingeRes.bestMD, crank: cup.specs.crank || 0 }
    );

    // Cabinet Fixing (3 holes for mechanism)
    const yFromTop = liftRes.drillY_cabinet;

    [0, 32, 64].forEach(offset => {
      ops.push({
        id: `${cabinetId}-hkxs-${offset}`,
        type: 'DRILL',
        face: 'FACE',
        x: 37, // Standard X for Blum Lifts
        y: yFromTop + offset,
        diameter: 5,
        depth: 13,
        hardwareId: liftRes.mechanism.itemNo
      });
    });

    // Front Fixing (Approx 125.5 + MD + K from top of door)
    const frontVal = 125.5 + hingeRes.bestMD + (cup.specs.crank || 0);
    ops.push({
      id: `${doorId}-hkxs-front`,
      type: 'DRILL',
      face: 'FACE',
      x: 50,
      y: frontVal,
      diameter: 5,
      depth: 10
    });
  }

  return ops;
};
```

### 9.7 Hinge Drilling Pattern (45/9.5mm Standard)

```
DOOR PANEL - HINGE CUP DRILLING:

     ┌─────────────────────────────────────────┐
     │                DOOR EDGE                 │
     │                                         │
     │     ○ ←── Screw Hole (2.5mm)            │  ↑
     │     │                                   │  │ 22.5mm
     │ ●───┼─────────────────────────●         │  ↓
     │     │                         ↑         │  ← Cup Center (35mm dia)
     │     ○ ←── Screw Hole          │ 9.5mm   │  ↑
     │                               ↓         │  │ 22.5mm
     │                                         │  ↓
     │     ↑                                   │
     │     TB + 17.5mm (Cup Center X)          │
     │                                         │
     └─────────────────────────────────────────┘
     ←─────────────────────────────────────────→
                    Door Width

Screw Pattern: 45mm total spacing (22.5mm each side of cup center)
Screw Offset:  9.5mm from cup center toward door edge
```

### 9.8 HK-XS Power Factor Selection

| Power Factor (LF) | Mechanism | Item No. | Application |
|-------------------|-----------|----------|-------------|
| 200 - 1000 | HK-XS Weak | 20K1101 | Light fronts |
| 500 - 1500 | HK-XS Medium | 20K1301 | Standard fronts |
| 800 - 1800 | HK-XS Strong | 20K1501 | Heavy fronts |

**Power Factor Formula:**
```
LF = Cabinet Height (mm) × Front Weight (kg)

Example:
- Cabinet Height: 400mm
- Front Weight: 3kg
- LF = 400 × 3 = 1200

→ Select: HK-XS Medium (20K1301)
```

### 9.9 CLIP top Hinge Selection Matrix

| Overlay Target | Arm Type | Crank Value | Item No. | Use Case |
|----------------|----------|-------------|----------|----------|
| 14-19mm | Full | 0 | 71B3550 | Standard full overlay |
| 5-9mm | Half | 9.5 | 71B3650 | Shared partition |
| -3 to 0mm | Inset | 18 | 71B3750 | Flush with frame |
| 14-19mm | 155° Zero | 0 | 71B7550 | Corner cabinets |

### 9.10 Mounting Plate Distance Options

| Plate | Distance (MD) | Item No. | Effect on Overlay |
|-------|---------------|----------|-------------------|
| D0 | 0mm | 173H7100 | Maximum overlay |
| D3 | 3mm | 173H7130 | -3mm from maximum |
| D9 | 9mm | 175H7190 | -9mm from maximum |

### 9.11 Complete Linked Calculation Example

```typescript
// Example: Wall Cabinet with HK-XS Lift + CLIP top Hinges

const cabinetConfig = {
  width: 600,
  height: 400,
  depth: 350,
  topThickness: 18,
  frontWeight: 3  // kg
};

const doorConfig = {
  overlay: 15,  // Full overlay target
  height: 380
};

// Step 1: Calculate Hinge (this determines MD and Crank)
const hingeResult = calculateBlumHinge(doorConfig.overlay, 'BLUM_CLIP_110');

console.log('Hinge Result:');
console.log('  Cup:', hingeResult.cup.itemNo);           // 71B3550
console.log('  Plate:', hingeResult.plate.itemNo);       // 173H7100
console.log('  TB:', hingeResult.bestTB, 'mm');          // 5mm
console.log('  MD:', hingeResult.bestMD, 'mm');          // 0mm
console.log('  Actual Overlay:',
  hingeResult.bestTB + 10 - hingeResult.cup.specs.crank - hingeResult.bestMD
);  // 15mm

// Step 2: Calculate HK-XS using Hinge values
const liftResult = calculateHKXS(
  cabinetConfig.height,
  cabinetConfig.frontWeight,
  cabinetConfig.topThickness,
  { md: hingeResult.bestMD, crank: hingeResult.cup.specs.crank || 0 }
);

console.log('HK-XS Result:');
console.log('  Mechanism:', liftResult.mechanism.itemNo);  // 20K1301
console.log('  Power Factor:', liftResult.powerFactor);    // 1200
console.log('  Drill Y:', liftResult.drillY_cabinet, 'mm'); // 155mm from top

// Step 3: Generate CAM Operations
const ops = generateBlumOps('DOOR-001', 'CAB-001', {
  overlay: doorConfig.overlay,
  hingeSystem: 'BLUM_CLIP_110',
  doorHeight: doorConfig.height,
  cabinetHeight: cabinetConfig.height,
  frontWeight: cabinetConfig.frontWeight,
  topThickness: cabinetConfig.topThickness,
  system: 'BLUM_HK_XS'
});

console.log('Generated Operations:', ops.length);
// Hinges: 2 cups + 4 screws + 4 plates = 10
// HK-XS: 3 cabinet + 1 front = 4
// Total: 14 operations
```

### 9.12 Drilling Reference Diagram

```
COMPLETE WALL CABINET WITH HK-XS + HINGES:

                    ← Cabinet Width (600mm) →
     ┌─────────────────────────────────────────────────────────────┐
     │                    TOP PANEL (18mm)                          │
     ├─────────────────────────────────────────────────────────────┤
     │                                                              │
     │  ○──○──○ ←── HK-XS (H = 137 + MD + K + SOB)                 │
     │                                                              │
     │                                                              │
     │  ○    ○ ←── Hinge Plate #1 (Y = 100mm)                      │
     │  ↑                                                           │
     │  37mm (System 32)                                            │
     │                                                              │
     │                                                              │
     │                                                              │
     │  ○    ○ ←── Hinge Plate #2 (Y = doorHeight - 100mm)         │
     │                                                              │
     │                                                              │
     └─────────────────────────────────────────────────────────────┘
                           CABINET SIDE

DOOR PANEL:
     ┌─────────────────────────────────────────┐
     │                                         │
     │  ○ ←── HK-XS Front Fixing (125.5 + MD + K)
     │                                         │
     │  ○                                      │
     │  ●──○ ←── Hinge Cup #1 + Screws         │
     │  ○                                      │
     │                                         │
     │                                         │
     │  ○                                      │
     │  ●──○ ←── Hinge Cup #2 + Screws         │
     │  ○                                      │
     │                                         │
     └─────────────────────────────────────────┘
```

---

## ส่วนที่ 10: Blum AVENTOS Lift Systems (Architecture v10.0)

ส่วนนี้รวบรวมข้อมูลจากไฟล์ Blum 14-67 (ระบบบานยก AVENTOS) โดยเน้น **Lift Intelligence Engine** ที่คำนวณ Power Factor และเลือกอุปกรณ์อัตโนมัติ

### 10.1 Engineering Logic Highlights

| Feature | Description |
|---------|-------------|
| **Power Factor Physics** | คำนวณค่า $LF = KH \times Weight$ เลือกเบอร์โช๊คที่รับแรงได้พอดี |
| **Structural Milling** | สร้าง Pocket Milling สำหรับ HKi ที่ต้องฝังอุปกรณ์ลงในเนื้อไม้ |
| **Kinematic Safety** | ตรวจสอบความหนาไม้ก่อนอนุญาตใช้รุ่นฝัง (HKi requires ≥16mm) |

### 10.2 Master Hardware Database (Lift Systems)

```typescript
// src/services/hardware/hafeleDb.ts

export type SystemType =
  | 'MINIFIX_15' | 'SC_8_60' | 'TOFIX_25' | 'LAMELLO_P' | 'DOVETAIL_RAIL'
  | 'HINGE_110' | 'HINGE_ALU_105_PUSH'
  // --- BLUM AVENTOS ---
  | 'AVENTOS_HKI'     // รุ่นฝังใน (Integrated)
  | 'AVENTOS_HF_TOP'; // รุ่นบานพับคู่ (Bi-fold)

export interface HardwareItem {
  id: string;
  itemNo: string;
  name: string;
  category: 'LIFT_MECHANISM' | 'LIFT_ARM' | 'LIFT_COVER' | 'HINGE_CUP';
  specs: {
    powerFactorMin?: number;
    powerFactorMax?: number;
    minCabinetHeight?: number;
    maxCabinetHeight?: number;
    isIntegrated?: boolean;          // True = ต้องกัดร่องฝัง
    millSpec?: { w: number; h: number; d: number; r: number }; // Milling Dimensions
  };
}

export const HAFELE_MASTER_DB = {
  lifts: {
    // =================================================================
    // AVENTOS HKi (Integrated) - PDF Page 5
    // Requires Side Panel Milling: ~128x265mm, Depth 12mm (for 16mm panel)
    // =================================================================

    // Weak (420-1610)
    hki_2300: {
      id: 'hki_24k2300', itemNo: '24K2300',
      name: 'AVENTOS HKi (LF 420-1610)',
      category: 'LIFT_MECHANISM',
      specs: {
        powerFactorMin: 420, powerFactorMax: 1610,
        isIntegrated: true,
        millSpec: { w: 128, h: 265, d: 12, r: 4 }
      }
    },
    // Medium (930-2800)
    hki_2500: {
      id: 'hki_24k2500', itemNo: '24K2500',
      name: 'AVENTOS HKi (LF 930-2800)',
      category: 'LIFT_MECHANISM',
      specs: {
        powerFactorMin: 930, powerFactorMax: 2800,
        isIntegrated: true,
        millSpec: { w: 128, h: 265, d: 12, r: 4 }
      }
    },
    // Strong (1730-5200)
    hki_2700: {
      id: 'hki_24k2700', itemNo: '24K2700',
      name: 'AVENTOS HKi (LF 1730-5200)',
      category: 'LIFT_MECHANISM',
      specs: {
        powerFactorMin: 1730, powerFactorMax: 5200,
        isIntegrated: true,
        millSpec: { w: 128, h: 265, d: 12, r: 4 }
      }
    },
    // X-Strong (2600-7800)
    hki_2800: {
      id: 'hki_24k2800', itemNo: '24K2800',
      name: 'AVENTOS HKi (LF 2600-7800)',
      category: 'LIFT_MECHANISM',
      specs: {
        powerFactorMin: 2600, powerFactorMax: 7800,
        isIntegrated: true,
        millSpec: { w: 128, h: 265, d: 12, r: 4 }
      }
    },

    // =================================================================
    // AVENTOS HF top (Bi-Fold) - PDF Page 13
    // =================================================================

    // Mechanisms (Set)
    hf_2500: {
      id: 'hf_22f2500', itemNo: '22F2500',
      name: 'HF top Mech (LF 2700-13500)',
      category: 'LIFT_MECHANISM',
      specs: { powerFactorMin: 2700, powerFactorMax: 13500 }
    },
    hf_2800: {
      id: 'hf_22f2800', itemNo: '22F2800',
      name: 'HF top Mech (LF 10000-19300)',
      category: 'LIFT_MECHANISM',
      specs: { powerFactorMin: 10000, powerFactorMax: 19300 }
    },

    // Telescopic Arms (Selected by Cabinet Height KH)
    hf_arm_35: {
      id: 'hf_arm_35', itemNo: '20F3500',
      name: 'HF Arm (KH 560-710)',
      category: 'LIFT_ARM',
      specs: { minCabinetHeight: 560, maxCabinetHeight: 710 }
    },
    hf_arm_38: {
      id: 'hf_arm_38', itemNo: '20F3800',
      name: 'HF Arm (KH 700-900)',
      category: 'LIFT_ARM',
      specs: { minCabinetHeight: 700, maxCabinetHeight: 900 }
    },
    hf_arm_39: {
      id: 'hf_arm_39', itemNo: '20F3900',
      name: 'HF Arm (KH 760-1040)',
      category: 'LIFT_ARM',
      specs: { minCabinetHeight: 760, maxCabinetHeight: 1040 }
    },

    // Center Hinge (Finger Safety)
    hf_center_hinge: {
      id: 'hf_ctr', itemNo: '78Z5550',
      name: 'CLIP top Center Hinge',
      category: 'HINGE_CUP',
      specs: { cupDia: 35 }
    },
  },

  // Cover Caps
  lift_covers: {
    hki_cover: {
      id: 'hki_cov', itemNo: '24K8000',
      name: 'HKi Cover Set',
      category: 'LIFT_COVER',
      specs: {}
    },
  }
};
```

### 10.3 Lift Intelligence Engine

```typescript
// src/services/engineering/liftEngine.ts
import { HAFELE_MASTER_DB, HardwareItem, SystemType } from '../hardware/hafeleDb';

export interface LiftPlan {
  isValid: boolean;
  powerFactor: number;
  specs: {
    mechanism: HardwareItem;
    arm?: HardwareItem;
    centerHinge?: HardwareItem;
  };
  meta: {
    millPocket?: { x: number; y: number; w: number; h: number; d: number; r: number };
    drillPos?: { x: number; y: number };
  };
  issues: string[];
}

interface Options {
  cabinetHeight: number;       // KH
  frontWeight: number;         // FG (Combined Weight)
  system: SystemType;
  sideThickness: number;       // SWD
}

export const calculateLiftPlan = (opts: Options): LiftPlan => {
  const { cabinetHeight, frontWeight, system, sideThickness } = opts;
  const issues: string[] = [];
  const db = HAFELE_MASTER_DB.lifts;

  // 1. CALCULATE POWER FACTOR (LF)
  // Formula: LF = KH (mm) * FG (kg)
  const LF = cabinetHeight * frontWeight;

  let mechanism: HardwareItem | undefined;
  let arm: HardwareItem | undefined;
  let centerHinge: HardwareItem | undefined;

  // 2. MECHANISM SELECTION
  if (system === 'AVENTOS_HKI') {
    // Validation: Side Panel Thickness (Page 5: min 16mm)
    if (sideThickness < 16) {
      issues.push(
        `AVENTOS HKi requires side panel thickness ≥ 16mm (Current: ${sideThickness}mm)`
      );
    }

    // Select HKi based on LF
    const candidates = [db.hki_2300, db.hki_2500, db.hki_2700, db.hki_2800];
    mechanism = candidates.find(
      m => LF >= m.specs.powerFactorMin! && LF <= m.specs.powerFactorMax!
    );

  } else if (system === 'AVENTOS_HF_TOP') {
    // Select HF based on LF
    if (LF >= 2600 && LF <= 13500) mechanism = db.hf_2500;
    else if (LF > 13500 && LF <= 19300) mechanism = db.hf_2800;

    // Select Arm based on KH
    const arms = [db.hf_arm_35, db.hf_arm_38, db.hf_arm_39];
    arm = arms.find(
      a => cabinetHeight >= a.specs.minCabinetHeight! &&
           cabinetHeight <= a.specs.maxCabinetHeight!
    );

    if (!arm) {
      issues.push(`No telescopic arm found for Cabinet Height ${cabinetHeight}mm`);
    }

    centerHinge = db.hf_center_hinge;
  }

  if (!mechanism) {
    issues.push(`Power Factor ${Math.round(LF)} out of range for ${system}`);
  }

  // 3. MANUFACTURING META
  let millPocket = undefined;
  let drillPos = undefined;

  if (mechanism && mechanism.specs.isIntegrated) {
    // === HKi MILLING (Page 6) ===
    // Y Position: Approx 22mm from top inner edge
    // X Position: 12mm from front edge (approx)
    const m = mechanism.specs.millSpec!;
    millPocket = {
      x: 50, // Offset for CNC origin
      y: 22, // Offset from Top
      w: m.w, h: m.h, d: m.d, r: m.r
    };
  } else if (mechanism) {
    // === HF DRILLING (Page 20) ===
    // Top pin 47mm from top edge, 37mm from front
    drillPos = { x: 37, y: 47 };
  }

  return {
    isValid: issues.length === 0 && !!mechanism,
    powerFactor: LF,
    specs: { mechanism: mechanism!, arm, centerHinge },
    meta: { millPocket, drillPos },
    issues
  };
};
```

### 10.4 Power Factor Calculation Formula

```
POWER FACTOR FORMULA:

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   LF = KH × FG                                                  │
│                                                                 │
│   Where:                                                        │
│   • LF = Power Factor (Lift Factor)                             │
│   • KH = Cabinet Height (mm)                                    │
│   • FG = Front Weight (kg) - Combined weight of all panels      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

EXAMPLE:
- Cabinet Height (KH): 600mm
- Front Weight (FG): 4kg (single door)
- LF = 600 × 4 = 2400

→ Select: AVENTOS HKi 24K2500 (LF 930-2800)
```

### 10.5 AVENTOS HKi Power Factor Selection

| Item No. | Power Factor Range | Application |
|----------|-------------------|-------------|
| 24K2300 | 420 - 1610 | Light fronts |
| 24K2500 | 930 - 2800 | Standard fronts |
| 24K2700 | 1730 - 5200 | Heavy fronts |
| 24K2800 | 2600 - 7800 | Extra heavy fronts |

### 10.6 AVENTOS HF top Configuration

| Component | Item No. | Range/Specification |
|-----------|----------|---------------------|
| **Mechanism (Light)** | 22F2500 | LF 2700-13500 |
| **Mechanism (Heavy)** | 22F2800 | LF 10000-19300 |
| **Arm 35** | 20F3500 | KH 560-710mm |
| **Arm 38** | 20F3800 | KH 700-900mm |
| **Arm 39** | 20F3900 | KH 760-1040mm |
| **Center Hinge** | 78Z5550 | Door-to-door connection |

### 10.7 CAM Generator for Lift Systems

```typescript
// src/services/cam/generators/liftOp.ts
import { calculateLiftPlan } from '../../engineering/liftEngine';
import { MachineOp } from './types';

export const generateLiftOps = (
  sideId: string,
  doorId: string,
  opts: {
    cabinetHeight: number;
    frontWeight: number;
    system: SystemType;
    sideThickness: number;
  }
): MachineOp[] => {
  const plan = calculateLiftPlan(opts);
  if (!plan.isValid) return [];

  const ops: MachineOp[] = [];
  const { mechanism, centerHinge } = plan.specs;

  // === A. AVENTOS HKi (POCKET MILLING) ===
  if (plan.meta.millPocket) {
    const m = plan.meta.millPocket;

    // Side Panel Milling
    ops.push({
      id: `${sideId}-hki-pocket`,
      type: 'MILL_POCKET',
      face: 'FACE', // Inner Face
      x: m.x,
      y: m.y,
      params: {
        length: m.h, // 265mm
        width: m.w,  // 128mm
        depth: m.d,  // 12mm (Leave 4mm skin on 16mm panel)
        cornerR: m.r // 4mm corner radius
      },
      hardwareId: mechanism.itemNo
    });

    // Front Fixing Bracket
    ops.push({
      id: `${doorId}-hki-bracket`,
      type: 'DRILL',
      face: 'FACE',
      x: 50,
      y: 150,
      diameter: 5,
      depth: 10,
      hardwareId: 'HKI-BRACKET'
    });
  }

  // === B. AVENTOS HF TOP (SURFACE DRILLING) ===
  else if (plan.meta.drillPos) {
    const d = plan.meta.drillPos;

    // 1. Side Panel Mechanism (2 pins)
    [0, 32].forEach(off => {
      ops.push({
        id: `${sideId}-hf-mech-${off}`,
        type: 'DRILL',
        face: 'FACE',
        x: d.x,
        y: d.y + off,
        diameter: 5,
        depth: 13,
        hardwareId: mechanism.itemNo
      });
    });

    // 2. Center Hinge (Door-to-Door)
    if (centerHinge) {
      ops.push({
        id: `${doorId}-hf-center`,
        type: 'DRILL',
        face: 'FACE',
        x: 21.5,
        y: 30, // Standard Hinge Position
        diameter: 35,
        depth: 12,
        hardwareId: centerHinge.itemNo
      });
    }
  }

  return ops;
};
```

### 10.8 HKi Milling Specification

```
AVENTOS HKi POCKET MILLING (Page 6):

┌─────────────────────────────────────────────────────────────────┐
│                    CABINET SIDE PANEL                           │
│                                                                 │
│    ┌──────────────────────────────────────┐                     │
│    │                                      │ ← 22mm from top     │
│    │    ┌────────────────────────────┐    │                     │
│    │    │                            │    │                     │
│    │    │      POCKET AREA           │    │                     │
│    │    │      128mm × 265mm         │    │                     │
│    │    │      Depth: 12mm           │    │                     │
│    │    │      Corner R: 4mm         │    │                     │
│    │    │                            │    │                     │
│    │    └────────────────────────────┘    │                     │
│    │                                      │                     │
│    └──────────────────────────────────────┘                     │
│                                                                 │
│    ← 50mm from front edge                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

CRITICAL: Side Panel Thickness must be ≥ 16mm
         Pocket depth 12mm leaves 4mm skin
```

### 10.9 HF top Drilling Reference

```
AVENTOS HF top DRILLING (Page 20):

CABINET SIDE PANEL:
┌─────────────────────────────────────────────────────────────────┐
│                         TOP                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ○ ←── 47mm from top                                            │
│  │                                                               │
│  ○ ←── 47mm + 32mm = 79mm from top                              │
│  ↑                                                               │
│  37mm from front edge                                            │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

DOOR PANEL (Bi-Fold Center Hinge):
┌─────────────────────────────────────────┐
│           TOP DOOR (Bottom Edge)        │
│                                         │
│    ●──────────●──────────●              │ ← Center Hinge Cups
│   21.5mm    Center     21.5mm           │    35mm diameter
│                                         │
└─────────────────────────────────────────┘
```

### 10.10 Lift System Comparison

| Feature | AVENTOS HKi | AVENTOS HF top |
|---------|-------------|----------------|
| **Type** | Integrated (Hidden) | Bi-Fold (Surface) |
| **Installation** | Pocket Milling | Surface Mounting |
| **Min Panel Thickness** | 16mm | 16mm |
| **Power Factor Range** | 420-7800 | 2700-19300 |
| **Arm Type** | Integrated | Telescopic |
| **Door Configuration** | Single | Bi-Fold (2 doors) |
| **Aesthetics** | Premium (Hidden) | Standard |
| **Price Level** | Premium | Standard |

### 10.11 Complete Implementation Example

```typescript
// Example: Wall Cabinet with AVENTOS HKi

const cabinetConfig = {
  width: 900,
  height: 600,
  depth: 350,
  sideThickness: 18  // 18mm panel (≥16mm required)
};

const frontWeight = 4; // kg

// Generate Lift Plan
const liftPlan = calculateLiftPlan({
  cabinetHeight: cabinetConfig.height,
  frontWeight: frontWeight,
  system: 'AVENTOS_HKI',
  sideThickness: cabinetConfig.sideThickness
});

console.log('Lift Plan:');
console.log('  Power Factor:', liftPlan.powerFactor);        // 2400
console.log('  Mechanism:', liftPlan.specs.mechanism.itemNo); // 24K2500
console.log('  Valid:', liftPlan.isValid);                   // true

// Generate CAM Operations
const ops = generateLiftOps('SIDE-L', 'DOOR-001', {
  cabinetHeight: cabinetConfig.height,
  frontWeight: frontWeight,
  system: 'AVENTOS_HKI',
  sideThickness: cabinetConfig.sideThickness
});

console.log('Operations:', ops.length);  // 2 (pocket + bracket)
console.log('Pocket Milling:', ops[0].params);
// { length: 265, width: 128, depth: 12, cornerR: 4 }
```

### 10.12 Safety Validation Rules

```typescript
// Validation rules for lift systems

function validateLiftConfiguration(opts: LiftOptions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Panel Thickness Check (HKi only)
  if (opts.system === 'AVENTOS_HKI' && opts.sideThickness < 16) {
    errors.push('HKi requires minimum 16mm side panel thickness');
  }

  // 2. Power Factor Range Check
  const LF = opts.cabinetHeight * opts.frontWeight;
  if (opts.system === 'AVENTOS_HKI') {
    if (LF < 420) errors.push('Power Factor too low for HKi (min: 420)');
    if (LF > 7800) errors.push('Power Factor too high for HKi (max: 7800)');
  } else if (opts.system === 'AVENTOS_HF_TOP') {
    if (LF < 2700) errors.push('Power Factor too low for HF (min: 2700)');
    if (LF > 19300) errors.push('Power Factor too high for HF (max: 19300)');
  }

  // 3. Cabinet Height Range (HF Arm Selection)
  if (opts.system === 'AVENTOS_HF_TOP') {
    if (opts.cabinetHeight < 560) {
      errors.push('Cabinet too short for HF (min: 560mm)');
    }
    if (opts.cabinetHeight > 1040) {
      errors.push('Cabinet too tall for HF (max: 1040mm)');
    }
  }

  // 4. Weight Warning
  if (opts.frontWeight > 15) {
    warnings.push('Front weight exceeds 15kg - consider reinforcement');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## ส่วนที่ 11: Advanced Mounting Engine - Häfele Metalla 510 & Mounting Plates (Architecture v9.0)

ระบบ **Advanced Mounting Engine** รองรับบานพับ Häfele Metalla 510 Push สำหรับเฟรมอลูมิเนียม และ Mounting Plates หลากหลายรูปแบบ (Linear/Cruciform, Screw/Euro, Zinc/Steel)

### 11.1 Engineering Logic Highlights

1. **Aluminium Frame Support**: ระบบเจาะสำหรับเฟรมอลูมิเนียม 17-24mm (ไม่เจาะถ้วย 35mm)
2. **Plate Strategy**: เลือกฐานรองได้ละเอียด (Linear vs Cruciform, Zinc vs Steel, Screw vs Euro)
3. **Extended Distance**: รองรับระยะ D สูงสุด 12mm สำหรับงานแก้ปัญหาหน้างาน
4. **Push Mechanism**: รองรับบานพับ Push สำหรับงานออกแบบไร้มือจับ
5. **Fixing Method Intelligence**: แยกแยะ Euro Screw (5mm) และ Chipboard Screw (3mm)

### 11.2 Master Hardware Database

```typescript
// src/services/hardware/hafeleDb.ts

export type SystemType =
  | 'MINIFIX_15' | 'SC_8_60' | 'U_12_10' | 'TOFIX_25' | 'LAMELLO_P' | 'DOVETAIL_RAIL'
  // --- STANDARD HINGES ---
  | 'HINGE_110' | 'HINGE_155' | 'HINGE_165' | 'HINGE_THIN' | 'HINGE_BLIND_SM' | 'HINGE_BLIND_LG'
  | 'HINGE_PROFILE_94' | 'HINGE_REBATED_110' | 'HINGE_CORNER_70' | 'HINGE_FRIDGE'
  | 'HINGE_ANGLE_VAR'
  // --- ALUMINIUM FRAME (Selection 17) ---
  | 'HINGE_ALU_105_PUSH';

export type PlateType = 'LINEAR' | 'CRUCIFORM';
export type PlateMaterial = 'STEEL' | 'ZINC';
export type FixingMethod = 'SCREW' | 'EURO';

export interface HardwareItem {
  id: string;
  itemNo: string;
  name: string;
  category: 'HINGE_CUP' | 'HINGE_PLATE' | 'ACCESSORY';
  specs: {
    // Hinge Specs
    cupDepth?: number;
    cupDia?: number;
    openingAngle?: number;
    crankConstant?: number;
    pattern?: string;        // '48/6', 'ALU_FRAME'
    isPush?: boolean;

    // Plate Specs
    distance?: number;       // D (0, 2, 3, 6, 9, 12)
    type?: PlateType;
    material?: PlateMaterial;
    fixing?: FixingMethod;
  };
}

export const HAFELE_MASTER_DB = {
  hinges: {
    // =================================================================
    // ALUMINIUM FRAME HINGES (Selection 17 - Page 1)
    // =================================================================
    // Metalla 510 Push สำหรับเฟรมอลูมิเนียมกว้าง 17-24mm
    // Note: รุ่น Push ต้องใช้คู่กับตัวกดกระเด้ง (สั่งแยก)

    h_alu_full: {
      id: 'h_alu_full',
      itemNo: '329.23.810',
      name: 'Metalla 510 Alu Push Full Overlay',
      category: 'HINGE_CUP',
      specs: {
        openingAngle: 105,
        crankConstant: 18,  // K = 18 (Full Overlay)
        pattern: 'ALU_FRAME',
        cupDepth: 0,        // No cup drilling
        isPush: true
      }
    } as HardwareItem,

    h_alu_half: {
      id: 'h_alu_half',
      itemNo: '329.23.830',
      name: 'Metalla 510 Alu Push Half Overlay',
      category: 'HINGE_CUP',
      specs: {
        openingAngle: 105,
        crankConstant: 9,   // K = 9 (Half Overlay)
        pattern: 'ALU_FRAME',
        cupDepth: 0,
        isPush: true
      }
    } as HardwareItem,

    h_alu_inset: {
      id: 'h_alu_inset',
      itemNo: '329.23.840',
      name: 'Metalla 510 Alu Push Inset',
      category: 'HINGE_CUP',
      specs: {
        openingAngle: 105,
        crankConstant: -2,  // K = -2 (Inset)
        pattern: 'ALU_FRAME',
        cupDepth: 0,
        isPush: true
      }
    } as HardwareItem,
  },

  plates: {
    // =================================================================
    // MOUNTING PLATES EXPANSION (Selection 17 - Page 2-5)
    // =================================================================

    // --- 1. Linear Plates (Zinc) - Page 2 ---
    // Screw Fixing (Chipboard)
    pl_lin_sc_d0: {
      id: 'pl_lin_sc_d0',
      itemNo: '329.67.040',
      name: 'Linear Zinc Screw D0',
      category: 'HINGE_PLATE',
      specs: { distance: 0, type: 'LINEAR', material: 'ZINC', fixing: 'SCREW' }
    } as HardwareItem,

    pl_lin_sc_d3: {
      id: 'pl_lin_sc_d3',
      itemNo: '329.67.043',
      name: 'Linear Zinc Screw D3',
      category: 'HINGE_PLATE',
      specs: { distance: 3, type: 'LINEAR', material: 'ZINC', fixing: 'SCREW' }
    } as HardwareItem,

    // Euro Fixing
    pl_lin_eu_d0: {
      id: 'pl_lin_eu_d0',
      itemNo: '329.67.000',
      name: 'Linear Zinc Euro D0',
      category: 'HINGE_PLATE',
      specs: { distance: 0, type: 'LINEAR', material: 'ZINC', fixing: 'EURO' }
    } as HardwareItem,

    // --- 2. Cruciform Plates (Zinc) - Page 3 & 5 ---
    // Screw Fixing - Standard Distance
    pl_crux_zn_sc_d0: {
      id: 'pl_crux_zn_sc_d0',
      itemNo: '329.71.500',
      name: 'Cruciform Zinc Screw D0',
      category: 'HINGE_PLATE',
      specs: { distance: 0, type: 'CRUCIFORM', material: 'ZINC', fixing: 'SCREW' }
    } as HardwareItem,

    pl_crux_zn_sc_d2: {
      id: 'pl_crux_zn_sc_d2',
      itemNo: '329.71.502',
      name: 'Cruciform Zinc Screw D2',
      category: 'HINGE_PLATE',
      specs: { distance: 2, type: 'CRUCIFORM', material: 'ZINC', fixing: 'SCREW' }
    } as HardwareItem,

    // High Distance (Page 5 - For Blind Corner/Thick Door)
    pl_crux_zn_sc_d9: {
      id: 'pl_crux_zn_sc_d9',
      itemNo: '329.73.608',
      name: 'Cruciform Zinc Screw D9',
      category: 'HINGE_PLATE',
      specs: { distance: 9, type: 'CRUCIFORM', material: 'ZINC', fixing: 'SCREW' }
    } as HardwareItem,

    pl_crux_zn_sc_d12: {
      id: 'pl_crux_zn_sc_d12',
      itemNo: '329.73.609',
      name: 'Cruciform Zinc Screw D12',
      category: 'HINGE_PLATE',
      specs: { distance: 12, type: 'CRUCIFORM', material: 'ZINC', fixing: 'SCREW' }
    } as HardwareItem,

    // Euro Fixing (Page 3)
    pl_crux_zn_eu_d0: {
      id: 'pl_crux_zn_eu_d0',
      itemNo: '329.71.510',
      name: 'Cruciform Zinc Euro D0',
      category: 'HINGE_PLATE',
      specs: { distance: 0, type: 'CRUCIFORM', material: 'ZINC', fixing: 'EURO' }
    } as HardwareItem,

    // --- 3. Cruciform Plates (Steel) - Page 4 ---
    pl_crux_st_sc_d0: {
      id: 'pl_crux_st_sc_d0',
      itemNo: '329.68.000',
      name: 'Cruciform Steel Screw D0',
      category: 'HINGE_PLATE',
      specs: { distance: 0, type: 'CRUCIFORM', material: 'STEEL', fixing: 'SCREW' }
    } as HardwareItem,
  },

  accessories: {
    // Screw for Alu Frame (Page 1)
    screw_alu: {
      id: 'scr_alu',
      itemNo: '028.01.062',
      name: 'Screw for Alu Frame',
      category: 'ACCESSORY',
      specs: {}
    } as HardwareItem
  }
};
```

### 11.3 Overlay Formula for Aluminium Frame Hinges

```
OVERLAY CALCULATION (Metalla 510 Alu):

Overlay = E + K - D

Where:
- E = Cup Distance (3-7mm for Alu Frame)
- K = Crank Constant (Full=18, Half=9, Inset=-2)
- D = Plate Distance (0, 2, 3, 6, 9, 12mm)

┌─────────────────────────────────────────────────────────────────┐
│  Crank Type   │   K    │  Overlay Range*  │   Use Case         │
├───────────────┼────────┼──────────────────┼────────────────────┤
│  Full Overlay │  +18   │   14-19mm        │  Standard Cabinets │
│  Half Overlay │   +9   │    5-10mm        │  Two-Door Meeting  │
│  Inset        │   -2   │    0-3mm         │  Flush Doors       │
└───────────────┴────────┴──────────────────┴────────────────────┘

*With E=4mm (standard), D=0mm
```

### 11.4 Plate Selection Matrix

```
PLATE SELECTION GUIDE:

┌─────────────────────────────────────────────────────────────────────────┐
│  Type        │  Material  │  Fixing  │  Distance  │  Item No      │ Use │
├──────────────┼────────────┼──────────┼────────────┼───────────────┼─────┤
│  Linear      │  Zinc      │  Screw   │  D0        │  329.67.040   │  A  │
│  Linear      │  Zinc      │  Screw   │  D3        │  329.67.043   │  A  │
│  Linear      │  Zinc      │  Euro    │  D0        │  329.67.000   │  B  │
├──────────────┼────────────┼──────────┼────────────┼───────────────┼─────┤
│  Cruciform   │  Zinc      │  Screw   │  D0        │  329.71.500   │  C  │
│  Cruciform   │  Zinc      │  Screw   │  D2        │  329.71.502   │  C  │
│  Cruciform   │  Zinc      │  Screw   │  D9        │  329.73.608   │  D  │
│  Cruciform   │  Zinc      │  Screw   │  D12       │  329.73.609   │  D  │
│  Cruciform   │  Zinc      │  Euro    │  D0        │  329.71.510   │  E  │
├──────────────┼────────────┼──────────┼────────────┼───────────────┼─────┤
│  Cruciform   │  Steel     │  Screw   │  D0        │  329.68.000   │  F  │
└──────────────┴────────────┴──────────┴────────────┴───────────────┴─────┘

Use Cases:
A = Narrow space, visible edge (Linear)
B = Pre-drilled Euro holes (Linear)
C = Standard application (most common)
D = Thick doors, blind corners, site adjustment
E = Pre-drilled Euro holes (Cruciform)
F = Heavy-duty, steel cabinet
```

### 11.5 Advanced Hinge Engine

```typescript
// src/services/engineering/hingeEngine.ts

import { HAFELE_MASTER_DB, HardwareItem, SystemType, FixingMethod, PlateType } from '../hardware/hafeleDb';

export interface HingePlan {
  isValid: boolean;
  quantity: number;
  positions: number[];
  specs: {
    cup: HardwareItem;
    plate: HardwareItem;
    accessory?: HardwareItem
  };
  meta: {
    cupDistanceE: number;
    plateDistanceD: number;
    fixing: FixingMethod;
    pattern: string;
    actualOverlay: number;
  };
}

interface HingeOptions {
  doorHeight: number;
  doorWeight: number;
  overlay: number;
  system: SystemType;
  preferredFixing?: FixingMethod;   // 'SCREW' (Default) or 'EURO'
  preferredPlateType?: PlateType;   // 'CRUCIFORM' (Default) or 'LINEAR'
}

/**
 * Smart Hardware Selection with Overlay Solver
 */
const selectHardware = (
  system: SystemType,
  overlay: number,
  fixing: FixingMethod,
  plateType: PlateType
) => {
  const db = HAFELE_MASTER_DB.hinges;
  const plates = HAFELE_MASTER_DB.plates;

  // 1. SELECT CUP based on system and overlay
  let cup: HardwareItem;
  let accessory: HardwareItem | undefined;

  if (system === 'HINGE_ALU_105_PUSH') {
    // Aluminium Frame Hinge Selection
    if (overlay >= 14) {
      cup = db.h_alu_full;       // Full Overlay (14-19mm)
    } else if (overlay >= 5) {
      cup = db.h_alu_half;       // Half Overlay (5-10mm)
    } else {
      cup = db.h_alu_inset;      // Inset (0-3mm)
    }

    // Alu frame requires special screws
    accessory = HAFELE_MASTER_DB.accessories.screw_alu;
  } else {
    // Standard hinge selection (fallback)
    cup = db.h_alu_full; // Would normally select from 110/155 etc.
  }

  // 2. SOLVER: Find best E and D combination
  // Formula: Overlay = E + K - D
  const K = cup.specs.crankConstant || 0;

  let bestE = 4;      // Default cup distance
  let bestD = 0;      // Default plate distance
  let minDiff = 999;

  const availPlates = [0, 2, 3, 6, 9, 12];
  const availE = [3, 4, 5, 6, 7];  // Alu Frame E range

  for (const E of availE) {
    for (const D of availPlates) {
      const calcOverlay = E + K - D;
      const diff = Math.abs(calcOverlay - overlay);

      // Preference: Smaller D is better, Standard E (4-5) is better
      if (diff < minDiff || (diff === minDiff && D < bestD)) {
        minDiff = diff;
        bestE = E;
        bestD = D;
      }
    }
  }

  // 3. MATCH PLATE SKU from database
  const allPlates = Object.values(plates);
  let plate = allPlates.find(p =>
    p.specs.distance === bestD &&
    p.specs.fixing === fixing &&
    p.specs.type === plateType
  );

  // Fallback if exact match not found
  if (!plate) {
    plate = allPlates.find(p =>
      p.specs.distance === bestD &&
      p.specs.fixing === fixing
    ) || plates.pl_crux_zn_sc_d0;
  }

  return { cup, plate, accessory, bestD, bestE };
};

/**
 * Calculate complete hinge plan
 */
export const calculateHingePlan = (opts: HingeOptions): HingePlan => {
  const {
    doorHeight,
    doorWeight,
    system,
    overlay,
    preferredFixing = 'SCREW',
    preferredPlateType = 'CRUCIFORM'
  } = opts;

  // 1. Hardware Selection
  const selection = selectHardware(system, overlay, preferredFixing, preferredPlateType);
  const { cup, plate, accessory, bestD, bestE } = selection;

  // 2. Quantity Calculation (Same as standard hinges)
  const qty = (doorHeight > 2100 || doorWeight > 17) ? 5 :
              (doorHeight > 1600 || doorWeight > 12) ? 4 :
              (doorHeight > 900  || doorWeight > 6)  ? 3 : 2;

  // 3. Position Calculation (System 32 aligned)
  const positions: number[] = [];
  const margin = 96;  // 3 × 32mm from edge
  const span = doorHeight - (2 * margin);

  for (let i = 0; i < qty; i++) {
    positions.push(Math.round(margin + (span / (qty - 1)) * i));
  }

  // 4. Calculate actual overlay achieved
  const actualOverlay = bestE + (cup.specs.crankConstant || 0) - bestD;

  return {
    isValid: true,
    quantity: qty,
    positions,
    specs: {
      cup,
      plate,
      accessory
    },
    meta: {
      cupDistanceE: bestE,
      plateDistanceD: bestD,
      actualOverlay,
      fixing: preferredFixing,
      pattern: cup.specs.pattern || '48/6'
    }
  };
};
```

### 11.6 CAM Generator for Advanced Mounting

```typescript
// src/services/cam/generators/hingeOp.ts

import { calculateHingePlan, HingePlan } from '../../engineering/hingeEngine';

export interface MachineOp {
  id: string;
  type: 'DRILL' | 'MILL';
  face: 'FACE' | 'EDGE' | 'BACK';
  x: number;
  y: number;
  diameter: number;
  depth: number;
  hardwareId: string;
}

/**
 * Generate drilling operations for hinges
 * Supports both standard cups and aluminium frame mounting
 */
export const generateHingeOps = (
  doorId: string,
  cabinetId: string,
  opts: any
): MachineOp[] => {
  const plan = calculateHingePlan(opts);
  if (!plan.isValid) return [];

  const ops: MachineOp[] = [];
  const { cup, plate, accessory } = plan.specs;

  // Determine Plate Drill Diameter based on fixing method
  // Euro uses 5mm, Chipboard Screw uses 3mm pilot
  const plateHoleDia = plan.meta.fixing === 'EURO' ? 5 : 3;

  plan.positions.forEach((yPos, i) => {

    // === 1. DOOR OPERATIONS ===
    if (plan.meta.pattern === 'ALU_FRAME') {
      // ⚠️ ALUMINIUM FRAME: NO 35mm CUP HOLE!
      // Drill pilot holes for frame screws instead
      const screwCenterX = 20.5;  // Per Häfele spec

      [-24, 24].forEach(offsetY => {
        ops.push({
          id: `${doorId}-alu-pilot-${i}-${offsetY}`,
          type: 'DRILL',
          face: 'FACE',
          x: screwCenterX,
          y: yPos + offsetY,
          diameter: 3.0,  // Pilot hole for Alu Screw
          depth: 10,
          hardwareId: accessory?.itemNo || 'ALU-SCREW'
        });
      });
    } else {
      // STANDARD 35mm CUP HOLE
      const cupCenterX = plan.meta.cupDistanceE + 17.5;

      ops.push({
        id: `${doorId}-cup-${i}`,
        type: 'DRILL',
        face: 'FACE',
        x: cupCenterX,
        y: yPos,
        diameter: 35,
        depth: cup.specs.cupDepth || 12,
        hardwareId: cup.itemNo
      });

      // Screw Holes (48/6 pattern)
      [-24, 24].forEach(offsetY => {
        ops.push({
          id: `${doorId}-cup-scr-${i}-${offsetY}`,
          type: 'DRILL',
          face: 'FACE',
          x: cupCenterX - 6,
          y: yPos + offsetY,
          diameter: 2.5,
          depth: 5,
          hardwareId: 'HINGE-SCREW'
        });
      });
    }

    // === 2. CABINET OPERATIONS (PLATE) ===
    // Drill 2 holes spaced 32mm apart (Offset Y ±16)
    [-16, 16].forEach(offsetY => {
      ops.push({
        id: `${cabinetId}-plt-${i}-${offsetY}`,
        type: 'DRILL',
        face: 'FACE',
        x: 37,  // System 32 edge distance
        y: yPos + offsetY,
        diameter: plateHoleDia,  // ✅ Dynamic: 3mm vs 5mm
        depth: 13,
        hardwareId: plate.itemNo
      });
    });
  });

  return ops;
};
```

### 11.7 Drilling Pattern Diagrams

```
ALUMINIUM FRAME HINGE (Metalla 510 Push):

DOOR PANEL (Alu Frame 17-24mm):
┌─────────────────────────────────────────┐
│                                         │
│     No 35mm cup hole!                   │
│                                         │
│         ●  ← Pilot 3mm @ Y+24           │
│        20.5mm from edge                 │
│         ●  ← Pilot 3mm @ Y-24           │
│                                         │
│     Screw spacing: 48mm (24+24)         │
│                                         │
└─────────────────────────────────────────┘

CABINET SIDE PANEL:
┌─────────────────────────────────────────┐
│                                         │
│         ●  ← Plate hole @ Y+16          │
│   37mm  │                               │
│   from  │  Diameter: 5mm (Euro)         │
│   edge  │            3mm (Screw)        │
│         ●  ← Plate hole @ Y-16          │
│                                         │
│     Hole spacing: 32mm (16+16)          │
│                                         │
└─────────────────────────────────────────┘


STANDARD HINGE (35mm Cup):

DOOR PANEL:
┌─────────────────────────────────────────┐
│                                         │
│         ●  ← Screw 2.5mm @ Y+24         │
│                                         │
│     ◯──────── 35mm Cup @ E+17.5mm       │
│                                         │
│         ●  ← Screw 2.5mm @ Y-24         │
│                                         │
│     Cup center = E + 17.5mm from edge   │
│     Screw offset = -6mm from cup center │
│                                         │
└─────────────────────────────────────────┘
```

### 11.8 Plate Geometry Comparison

```
LINEAR PLATE (Narrow):
┌────┐
│    │
│ ●  │  Width: 12mm
│    │  For narrow spaces
│ ●  │  Visible edge applications
│    │
└────┘

CRUCIFORM PLATE (Standard):
┌────────────┐
│            │
│  ●    ●    │  Width: 35mm
│            │  Most common
│  ●    ●    │  Better stability
│            │
└────────────┘

Distance Options:
┌─────────────────────────────────────────────────────┐
│  D0   │  D2   │  D3   │  D6   │  D9   │  D12  │
├───────┼───────┼───────┼───────┼───────┼───────┤
│  0mm  │  2mm  │  3mm  │  6mm  │  9mm  │  12mm │
│       │       │       │       │       │       │
│ Std   │ Minor │ Minor │ Med   │ Thick │ Max   │
│       │ adj.  │ adj.  │ adj.  │ door  │ adj.  │
└───────┴───────┴───────┴───────┴───────┴───────┘
```

### 11.9 Visual Component

```typescript
// src/components/3d/hardware/MasterHinge.tsx

import React, { useMemo } from 'react';
import { calculateHingePlan } from '../../../services/engineering/hingeEngine';

const mm = (v: number) => v / 1000;

interface MasterHingeProps {
  doorHeight: number;
  doorWeight: number;
  overlay: number;
  system: 'HINGE_ALU_105_PUSH' | 'HINGE_110' | string;
  preferredFixing?: 'SCREW' | 'EURO';
  preferredPlateType?: 'LINEAR' | 'CRUCIFORM';
}

export const MasterHinge: React.FC<MasterHingeProps> = (props) => {
  const plan = useMemo(() => calculateHingePlan(props as any), [props]);

  if (!plan?.isValid) return null;

  const { cup, plate } = plan.specs;

  return (
    <group>
      {plan.positions.map((y, i) => (
        <group key={i} position={[0, mm(y), 0]}>

          {/* CUP Visual */}
          <group position={[mm(21.5), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            {plan.meta.pattern === 'ALU_FRAME' ? (
              // Aluminium Frame Hinge Visual (No Cup)
              <mesh position={[0, mm(-2), 0]}>
                <boxGeometry args={[mm(40), mm(15), mm(3)]} />
                <meshStandardMaterial color="#90A4AE" metalness={0.8} />
              </mesh>
            ) : (
              // Standard Cup Visual
              <mesh>
                <cylinderGeometry args={[mm(17.5), mm(17.5), mm(2), 32]} />
                <meshStandardMaterial color="#CFD8DC" />
              </mesh>
            )}
          </group>

          {/* PLATE Visual */}
          <group position={[mm(-20), 0, mm(15)]}>
            <mesh position={[mm(-25), 0, mm(-5)]}>
              {/* Shape changes based on Plate Type */}
              {plate.specs.type === 'LINEAR' ? (
                // Linear Plate (Narrow)
                <boxGeometry args={[
                  mm(12),
                  mm(48),
                  mm((plate.specs.distance || 0) + 2)
                ]} />
              ) : (
                // Cruciform Plate (Wide)
                <boxGeometry args={[
                  mm(35),
                  mm(48),
                  mm((plate.specs.distance || 0) + 2)
                ]} />
              )}
              <meshStandardMaterial
                color={plate.specs.material === 'STEEL' ? "#B0BEC5" : "#CFD8DC"}
              />
            </mesh>
          </group>

        </group>
      ))}
    </group>
  );
};
```

### 11.10 Quick Reference Tables

**Metalla 510 Alu Push Hinges:**

| Model | Item No | Crank K | Overlay Range | Application |
|-------|---------|---------|---------------|-------------|
| Full Overlay | 329.23.810 | +18 | 14-19mm | Standard cabinets |
| Half Overlay | 329.23.830 | +9 | 5-10mm | Two doors meeting |
| Inset | 329.23.840 | -2 | 0-3mm | Flush doors |

**Mounting Plates Summary:**

| Type | Material | Fixing | Distances Available |
|------|----------|--------|---------------------|
| Linear | Zinc | Screw | D0, D3 |
| Linear | Zinc | Euro | D0 |
| Cruciform | Zinc | Screw | D0, D2, D9, D12 |
| Cruciform | Zinc | Euro | D0 |
| Cruciform | Steel | Screw | D0 |

**Drilling Diameter by Fixing Method:**

| Fixing Method | Cabinet Hole Ø | Door Hole Ø | Notes |
|---------------|----------------|-------------|-------|
| Screw (Chipboard) | 3mm pilot | 35mm cup / 3mm pilot | Most common |
| Euro (Pre-drilled) | 5mm | 35mm cup / 3mm pilot | System cabinets |
| Alu Frame | 3mm pilot (cabinet) | 3mm pilot (frame) | No cup hole |

### 11.11 Complete Implementation Example

```typescript
// Example: Aluminium frame door on standard cabinet

const aluDoorConfig = {
  doorHeight: 700,
  doorWeight: 4,
  overlay: 16,
  system: 'HINGE_ALU_105_PUSH' as const,
  preferredFixing: 'SCREW' as const,
  preferredPlateType: 'CRUCIFORM' as const
};

// Generate plan
const plan = calculateHingePlan(aluDoorConfig);

console.log('=== Aluminium Frame Hinge Plan ===');
console.log('Hinge:', plan.specs.cup.name);          // 'Metalla 510 Alu Push Full'
console.log('Plate:', plan.specs.plate.name);        // 'Cruciform Zinc Screw D0'
console.log('Accessory:', plan.specs.accessory?.name); // 'Screw for Alu Frame'
console.log('Quantity:', plan.quantity);              // 2
console.log('Positions:', plan.positions);            // [96, 604]
console.log('Actual Overlay:', plan.meta.actualOverlay); // 22mm (E=4 + K=18 - D=0)
console.log('Pattern:', plan.meta.pattern);           // 'ALU_FRAME'

// Generate CAM operations
const ops = generateHingeOps('DOOR-001', 'CAB-001', aluDoorConfig);

console.log('\n=== CAM Operations ===');
console.log('Total operations:', ops.length);  // 8 (4 door pilots + 4 plate holes)

// Door operations (Alu Frame - pilot holes only)
const doorOps = ops.filter(op => op.id.includes('DOOR'));
console.log('Door ops:', doorOps.length);      // 4 (2 positions × 2 pilots each)
console.log('Door hole Ø:', doorOps[0].diameter); // 3mm (pilot)

// Cabinet operations (plate holes)
const cabOps = ops.filter(op => op.id.includes('CAB'));
console.log('Cabinet ops:', cabOps.length);    // 4 (2 positions × 2 holes each)
console.log('Cabinet hole Ø:', cabOps[0].diameter); // 3mm (Screw fixing)
```

---

## ส่วนที่ 12: Hinge Specialist Engine - Specialty Hinges (Architecture v8.0)

ระบบ **Hinge Specialist Engine** รองรับบานพับพิเศษครบทุกรูปแบบ จาก Häfele Selection 16 รวมถึง Profile Doors, Rebated Doors, Blind Corner, Angled Applications และ Refrigerator Hinges

### 12.1 Engineering Logic Highlights

1. **Complex Geometry**: รองรับตู้เข้ามุมทุกรูปแบบ (15° ถึง 70° Bi-fold) และ Blind Corner
2. **Material Intelligence**: ปรับความลึกเจาะอัตโนมัติ (9mm บานบังใบ / 13mm บานหนา Profile)
3. **Pattern Awareness**: รองรับระยะรูเจาะสกรูพิเศษ (52/7.5 และ 45/9.5)
4. **Hardware Safety**: บังคับใช้ Plate D=9mm สำหรับ Small Blind Corner

### 12.2 Master Hardware Database - Specialty Hinges

```typescript
// src/services/hardware/hafeleDb.ts

export type SystemType =
  | 'MINIFIX_15' | 'SC_8_60' | 'U_12_10' | 'TOFIX_25' | 'LAMELLO_P' | 'DOVETAIL_RAIL'
  // --- STANDARD ---
  | 'HINGE_110' | 'HINGE_155' | 'HINGE_165' | 'HINGE_THIN'
  // --- SPECIALTY (Selection 16) ---
  | 'HINGE_PROFILE_94'   // บานหนา/บานคิ้ว (เจาะลึก 13mm)
  | 'HINGE_REBATED_110'  // บานบังใบ (เจาะตื้น 9mm)
  | 'HINGE_BLIND_SM'     // Blind Corner เล็ก (ใช้ Plate D9)
  | 'HINGE_BLIND_LG'     // Blind Corner ใหญ่
  | 'HINGE_CORNER_70'    // บานพับตู้เข้ามุม (Bi-fold)
  | 'HINGE_ANGLE_15'     // หน้าบานเอียง +15°
  | 'HINGE_ANGLE_24'     // หน้าบานเอียง +24°
  | 'HINGE_ANGLE_30'     // หน้าบานเอียง +30°
  | 'HINGE_ANGLE_37'     // หน้าบานเอียง +37°
  | 'HINGE_ANGLE_45'     // หน้าบานเอียง +45°
  | 'HINGE_FRIDGE';      // ตู้เย็น (Flat Design)

export interface HardwareItem {
  id: string;
  itemNo: string;
  name: string;
  category: 'HINGE_CUP' | 'HINGE_PLATE';
  specs: {
    cupDepth: number;       // ความลึกเจาะถ้วย (Critical Spec)
    cupDia: number;         // 35mm
    openingAngle: number;
    crankConstant?: number; // ค่า K
    pattern?: string;       // '48/6' (Std), '52/7.5' (Profile), '45/9.5' (Fridge)
    distance?: number;      // Plate Distance
  };
}

export const HAFELE_SPECIALTY_HINGES = {
  // =================================================================
  // 9.1 PROFILE / THICK DOORS (Selection 16 - Page 1-2)
  // =================================================================
  // ⚠️ Critical: เจาะลึก 13mm | Pattern 52/7.5
  // สำหรับบานหนา >24mm หรือบานคิ้ว (Profile Door)

  h_prof_full: {
    id: 'h_prof_full',
    itemNo: '329.05.605',
    name: 'Profile 94° Full Overlay',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 94,
      cupDepth: 13.0,      // Deep drilling
      cupDia: 35,
      pattern: '52/7.5',   // Special screw pattern
      crankConstant: 19    // K = 19 (Full)
    }
  } as HardwareItem,

  h_prof_half: {
    id: 'h_prof_half',
    itemNo: '329.05.614',
    name: 'Profile 94° Half Overlay',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 94,
      cupDepth: 13.0,
      cupDia: 35,
      pattern: '52/7.5',
      crankConstant: 8     // K = 8 (Half)
    }
  } as HardwareItem,

  h_prof_inset: {
    id: 'h_prof_inset',
    itemNo: '329.05.632',
    name: 'Profile 94° Inset',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 94,
      cupDepth: 13.0,
      cupDia: 35,
      pattern: '52/7.5',
      crankConstant: -1    // K = -1 (Inset)
    }
  } as HardwareItem,

  // =================================================================
  // 9.2 REBATED DOORS (Selection 16 - Page 3)
  // =================================================================
  // ⚠️ Critical: เจาะตื้น 9mm สำหรับบานบังใบ/กระจก

  h_rebated: {
    id: 'h_rebated',
    itemNo: '329.26.611',
    name: 'Rebated 110° Full',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 110,
      cupDepth: 9.0,       // Shallow drilling!
      cupDia: 35,
      pattern: '48/6',     // Standard pattern
      crankConstant: 13
    }
  } as HardwareItem,

  // =================================================================
  // 9.3 BLIND CORNER (Selection 16 - Page 5-6)
  // =================================================================
  // Small Blind requires D=9 Plate (Mandatory)

  h_blind_sm: {
    id: 'h_blind_sm',
    itemNo: '329.34.601',
    name: 'Blind Corner Small 94°',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 94,
      cupDepth: 11.0,
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,

  h_blind_lg: {
    id: 'h_blind_lg',
    itemNo: '329.35.600',
    name: 'Blind Corner Large 110°',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 110,
      cupDepth: 11.0,
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,

  // =================================================================
  // 9.4 CORNER UNIT / BI-FOLD (Selection 16 - Page 7)
  // =================================================================

  h_corner_70: {
    id: 'h_corner_70',
    itemNo: '329.19.700',
    name: 'Bi-fold Corner 70°',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 70,
      cupDepth: 11.0,
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,

  // =================================================================
  // 9.5 ANGLED APPLICATIONS (Selection 16 - Page 9-10)
  // =================================================================
  // For angled cabinet faces (diagonal corners, end panels)

  h_angle_15: {
    id: 'h_angle_15',
    itemNo: '329.96.600',
    name: 'Angle Hinge +15°',
    category: 'HINGE_CUP',
    specs: { openingAngle: 94, cupDepth: 11.0, cupDia: 35, pattern: '48/6' }
  } as HardwareItem,

  h_angle_24: {
    id: 'h_angle_24',
    itemNo: '329.96.601',
    name: 'Angle Hinge +24°',
    category: 'HINGE_CUP',
    specs: { openingAngle: 94, cupDepth: 11.0, cupDia: 35, pattern: '48/6' }
  } as HardwareItem,

  h_angle_30: {
    id: 'h_angle_30',
    itemNo: '329.96.602',
    name: 'Angle Hinge +30°',
    category: 'HINGE_CUP',
    specs: { openingAngle: 94, cupDepth: 11.0, cupDia: 35, pattern: '48/6' }
  } as HardwareItem,

  h_angle_37: {
    id: 'h_angle_37',
    itemNo: '329.96.604',
    name: 'Angle Hinge +37°',
    category: 'HINGE_CUP',
    specs: { openingAngle: 94, cupDepth: 11.0, cupDia: 35, pattern: '48/6' }
  } as HardwareItem,

  h_angle_45: {
    id: 'h_angle_45',
    itemNo: '329.96.605',
    name: 'Angle Hinge +45°',
    category: 'HINGE_CUP',
    specs: { openingAngle: 94, cupDepth: 11.0, cupDia: 35, pattern: '48/6' }
  } as HardwareItem,

  // =================================================================
  // 9.6 REFRIGERATOR (Selection 16 - Page 11)
  // =================================================================
  // ⚠️ Pattern 45/9.5 (Special screw spacing)

  h_fridge: {
    id: 'h_fridge',
    itemNo: '329.23.600',
    name: 'Refrigerator 94° Flat',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 94,
      cupDepth: 11.0,
      cupDia: 35,
      pattern: '45/9.5'    // Unique screw pattern!
    }
  } as HardwareItem
};

// Special Plates for Blind Corner
export const SPECIALTY_PLATES = {
  d0: {
    id: 'pl_d0',
    itemNo: '329.67.060',
    name: 'Plate D=0',
    category: 'HINGE_PLATE',
    specs: { distance: 0 }
  } as HardwareItem,

  d2: {
    id: 'pl_d2',
    itemNo: '329.67.062',
    name: 'Plate D=2',
    category: 'HINGE_PLATE',
    specs: { distance: 2 }
  } as HardwareItem,

  d3: {
    id: 'pl_d3',
    itemNo: '329.67.063',
    name: 'Plate D=3',
    category: 'HINGE_PLATE',
    specs: { distance: 3 }
  } as HardwareItem,

  // ✅ MANDATORY for Small Blind Corner (Page 6)
  d9_blind: {
    id: 'pl_d9',
    itemNo: '329.88.609',
    name: 'Blind Corner Plate D=9',
    category: 'HINGE_PLATE',
    specs: { distance: 9 }
  } as HardwareItem
};
```

### 12.3 Drilling Depth by Hinge Type

```
CRITICAL DRILLING DEPTHS:

┌─────────────────────────────────────────────────────────────────────────┐
│  Hinge Type         │  Cup Depth  │  Pattern   │  Min Door Thick  │ Use │
├─────────────────────┼─────────────┼────────────┼──────────────────┼─────┤
│  Standard 110/155   │   11mm      │   48/6     │     16mm         │  A  │
│  Profile 94°        │   13mm      │   52/7.5   │     24mm         │  B  │
│  Rebated 110°       │    9mm      │   48/6     │     14mm         │  C  │
│  Blind Corner       │   11mm      │   48/6     │     16mm         │  D  │
│  Angle 15°-45°      │   11mm      │   48/6     │     16mm         │  E  │
│  Bi-fold 70°        │   11mm      │   48/6     │     16mm         │  F  │
│  Refrigerator       │   11mm      │   45/9.5   │     16mm         │  G  │
└─────────────────────┴─────────────┴────────────┴──────────────────┴─────┘

Use Cases:
A = Standard overlay doors (most common)
B = Thick doors >24mm, profile/framed doors
C = Rebated/rabbeted doors, glass frame doors
D = L-shaped corner cabinets
E = Diagonal corner, angled end panels
F = Corner unit bi-fold doors
G = Built-in refrigerator cabinets


⚠️ SAFETY RULE:
Maximum drill depth = Door Thickness - 2mm
(Never drill through the door face!)
```

### 12.4 Screw Pattern Variations

```
SCREW HOLE PATTERNS:

STANDARD (48/6) - Most Hinges:
┌─────────────────────────────────────┐
│                                     │
│         ●  ← Screw @ Y+24           │
│         │                           │
│     ◯───┤  ← 35mm Cup               │
│         │   (6mm offset from center)│
│         ●  ← Screw @ Y-24           │
│                                     │
│   Total spacing: 48mm (24+24)       │
│   X offset: 6mm from cup center     │
└─────────────────────────────────────┘


PROFILE (52/7.5) - Thick Door Hinges:
┌─────────────────────────────────────┐
│                                     │
│         ●  ← Screw @ Y+26           │
│         │                           │
│     ◯───┤  ← 35mm Cup               │
│         │   (7.5mm offset)          │
│         ●  ← Screw @ Y-26           │
│                                     │
│   Total spacing: 52mm (26+26)       │
│   X offset: 7.5mm from cup center   │
└─────────────────────────────────────┘


REFRIGERATOR (45/9.5) - Fridge Hinges:
┌─────────────────────────────────────┐
│                                     │
│         ●  ← Screw @ Y+22.5         │
│         │                           │
│     ◯───┤  ← 35mm Cup               │
│         │   (9.5mm offset)          │
│         ●  ← Screw @ Y-22.5         │
│                                     │
│   Total spacing: 45mm (22.5+22.5)   │
│   X offset: 9.5mm from cup center   │
└─────────────────────────────────────┘
```

### 12.5 Specialty Hinge Selection Engine

```typescript
// src/services/engineering/hingeEngine.ts

import {
  HAFELE_SPECIALTY_HINGES,
  SPECIALTY_PLATES,
  HardwareItem,
  SystemType
} from '../hardware/hafeleDb';

export interface HingePlan {
  isValid: boolean;
  quantity: number;
  positions: number[];
  specs: {
    cup: HardwareItem;
    plate: HardwareItem;
  };
  meta: {
    cupDistanceE: number;
    plateDistanceD: number;
    drillDepth: number;
    pattern: string;
  };
}

interface HingeOptions {
  doorHeight: number;
  doorWeight: number;
  doorThickness: number;
  overlay: number;
  system: SystemType;
}

/**
 * Select specialty hardware based on application
 */
const selectSpecialtyHardware = (
  system: SystemType,
  overlay: number,
  thickness: number
): { cup: HardwareItem; plate: HardwareItem } | null => {
  const db = HAFELE_SPECIALTY_HINGES;
  const plates = SPECIALTY_PLATES;

  switch (system) {
    // === 1. PROFILE / THICK DOOR (>24mm) ===
    case 'HINGE_PROFILE_94':
      if (overlay >= 12) return { cup: db.h_prof_full, plate: plates.d0 };
      if (overlay >= 5)  return { cup: db.h_prof_half, plate: plates.d0 };
      return { cup: db.h_prof_inset, plate: plates.d0 };

    // === 2. REBATED DOOR (Glass/Profile Frame) ===
    case 'HINGE_REBATED_110':
      return { cup: db.h_rebated, plate: plates.d0 };

    // === 3. BLIND CORNER ===
    case 'HINGE_BLIND_SM':
      // ⚠️ MANDATORY: Small Blind requires D=9 Plate!
      return { cup: db.h_blind_sm, plate: plates.d9_blind };
    case 'HINGE_BLIND_LG':
      return { cup: db.h_blind_lg, plate: plates.d3 };

    // === 4. BI-FOLD / CORNER UNIT ===
    case 'HINGE_CORNER_70':
      return { cup: db.h_corner_70, plate: plates.d0 };

    // === 5. ANGLED APPLICATIONS ===
    case 'HINGE_ANGLE_15':
      return { cup: db.h_angle_15, plate: plates.d0 };
    case 'HINGE_ANGLE_24':
      return { cup: db.h_angle_24, plate: plates.d0 };
    case 'HINGE_ANGLE_30':
      return { cup: db.h_angle_30, plate: plates.d0 };
    case 'HINGE_ANGLE_37':
      return { cup: db.h_angle_37, plate: plates.d0 };
    case 'HINGE_ANGLE_45':
      return { cup: db.h_angle_45, plate: plates.d0 };

    // === 6. REFRIGERATOR ===
    case 'HINGE_FRIDGE':
      return { cup: db.h_fridge, plate: plates.d0 };

    default:
      return null; // Not a specialty hinge
  }
};

/**
 * Calculate complete hinge plan for specialty applications
 */
export const calculateSpecialtyHingePlan = (opts: HingeOptions): HingePlan => {
  const { doorHeight, doorWeight, system, overlay, doorThickness } = opts;

  // 1. Select Hardware
  const selection = selectSpecialtyHardware(system, overlay, doorThickness);

  if (!selection) {
    // Fallback to standard hinges
    return {
      isValid: false,
      quantity: 0,
      positions: [],
      specs: { cup: {} as HardwareItem, plate: {} as HardwareItem },
      meta: { cupDistanceE: 0, plateDistanceD: 0, drillDepth: 0, pattern: '' }
    };
  }

  const { cup, plate } = selection;

  // 2. Calculate Quantity (Weight Graph)
  const qty = (doorHeight > 2100 || doorWeight > 17) ? 5 :
              (doorHeight > 1600 || doorWeight > 12) ? 4 :
              (doorHeight > 900  || doorWeight > 6)  ? 3 : 2;

  // 3. Calculate Positions (System 32 aligned)
  const positions: number[] = [];
  const margin = 96;  // 3 × 32mm from edge
  const span = doorHeight - (2 * margin);

  for (let i = 0; i < qty; i++) {
    positions.push(Math.round(margin + (span / (qty - 1)) * i));
  }

  // 4. Safety Check: Maximum drill depth
  const safeDepth = Math.min(
    cup.specs.cupDepth,
    doorThickness - 2  // Never drill through!
  );

  return {
    isValid: true,
    quantity: qty,
    positions,
    specs: { cup, plate },
    meta: {
      cupDistanceE: 4,  // Standard E
      plateDistanceD: plate.specs.distance || 0,
      drillDepth: safeDepth,
      pattern: cup.specs.pattern || '48/6'
    }
  };
};
```

### 12.6 CAM Generator with Pattern Support

```typescript
// src/services/cam/generators/hingeOp.ts

import { calculateSpecialtyHingePlan, HingePlan } from '../../engineering/hingeEngine';

export interface MachineOp {
  id: string;
  type: 'DRILL' | 'MILL';
  face: 'FACE' | 'EDGE' | 'BACK';
  x: number;
  y: number;
  diameter: number;
  depth: number;
  hardwareId: string;
}

/**
 * Generate drilling operations for specialty hinges
 * Supports multiple screw patterns (48/6, 52/7.5, 45/9.5)
 */
export const generateSpecialtyHingeOps = (
  doorId: string,
  cabinetId: string,
  opts: any
): MachineOp[] => {
  const plan = calculateSpecialtyHingePlan(opts);
  if (!plan.isValid) return [];

  const ops: MachineOp[] = [];
  const { cup, plate } = plan.specs;

  // Safety: Maximum drill depth check
  const safeDepth = Math.min(plan.meta.drillDepth, opts.doorThickness - 2);

  // Pattern-specific screw offsets
  let screwOffsetY = 24;   // Half of spacing (48/2 = 24)
  let screwOffsetX = 6;    // X offset from cup center

  if (plan.meta.pattern === '52/7.5') {
    // Profile Door Pattern
    screwOffsetY = 26;     // 52/2 = 26
    screwOffsetX = 7.5;
  } else if (plan.meta.pattern === '45/9.5') {
    // Refrigerator Pattern
    screwOffsetY = 22.5;   // 45/2 = 22.5
    screwOffsetX = 9.5;
  }

  plan.positions.forEach((yPos, i) => {

    // === 1. DOOR CUP HOLE ===
    const cupCenterX = 21.5;  // E + 17.5 (Standard E=4)

    ops.push({
      id: `${doorId}-cup-${i}`,
      type: 'DRILL',
      face: 'FACE',
      x: cupCenterX,
      y: yPos,
      diameter: 35,
      depth: safeDepth,  // ✅ Dynamic depth per hinge type
      hardwareId: cup.itemNo
    });

    // === 2. SCREW HOLES (Dynamic Pattern) ===
    [-1, 1].forEach(dir => {
      ops.push({
        id: `${doorId}-scr-${i}-${dir}`,
        type: 'DRILL',
        face: 'FACE',
        x: cupCenterX - screwOffsetX,  // Offset from cup center
        y: yPos + (screwOffsetY * dir),
        diameter: 2.5,
        depth: 5,
        hardwareId: 'HINGE-SCREW'
      });
    });

    // === 3. CABINET PLATE HOLES (Standard System 32) ===
    [-16, 16].forEach(offsetY => {
      ops.push({
        id: `${cabinetId}-plt-${i}-${offsetY}`,
        type: 'DRILL',
        face: 'FACE',
        x: 37,  // Standard X distance
        y: yPos + offsetY,
        diameter: 5,
        depth: 13,
        hardwareId: plate.itemNo
      });
    });
  });

  return ops;
};
```

### 12.7 Application Selection Diagram

```
SPECIALTY HINGE SELECTION FLOWCHART:

                    ┌─────────────────┐
                    │  Door Type?     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Thick/Profile │   │   Rebated     │   │ Corner/Angled │
│   (>24mm)     │   │ (Glass Frame) │   │               │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        ▼                   ▼                   │
   PROFILE_94          REBATED_110              │
   Depth: 13mm         Depth: 9mm               │
   Pattern: 52/7.5     Pattern: 48/6            │
                                                │
        ┌───────────────────────────────────────┤
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌───────────────┐
│ Blind Corner? │                      │ Angle Needed? │
└───────┬───────┘                      └───────┬───────┘
        │                                      │
   ┌────┴────┐                    ┌────┬────┬────┬────┐
   │         │                    │    │    │    │    │
   ▼         ▼                    ▼    ▼    ▼    ▼    ▼
 Small     Large                 15°  24°  30°  37°  45°
(D=9!)    (D=3)                  └────┴────┴────┴────┘
                                        ANGLE_XX


SPECIAL CASES:
┌─────────────────┐       ┌─────────────────┐
│  Bi-fold Door?  │       │  Refrigerator?  │
│                 │       │                 │
│   CORNER_70     │       │   FRIDGE        │
│   Depth: 11mm   │       │   Depth: 11mm   │
│   Pattern: 48/6 │       │   Pattern: 45/9.5│
└─────────────────┘       └─────────────────┘
```

### 12.8 Visual Component with Depth Indicator

```typescript
// src/components/3d/hardware/MasterHinge.tsx

import React, { useMemo } from 'react';
import { calculateSpecialtyHingePlan } from '../../../services/engineering/hingeEngine';

const mm = (v: number) => v / 1000;

interface MasterHingeProps {
  doorHeight: number;
  doorWeight: number;
  doorThickness: number;
  overlay: number;
  system: string;
}

export const MasterHinge: React.FC<MasterHingeProps> = (props) => {
  const plan = useMemo(() => calculateSpecialtyHingePlan(props as any), [props]);

  if (!plan?.isValid) return null;

  const { cup, plate } = plan.specs;

  // Color Coding for QA Visualization
  // Red = Deep (Profile), Green = Shallow (Rebated), Gray = Standard
  const depthColor = plan.meta.drillDepth > 12
    ? "#EF5350"   // Red - Deep (Profile)
    : (plan.meta.drillDepth < 10
      ? "#66BB6A" // Green - Shallow (Rebated)
      : "#B0BEC5" // Gray - Standard
    );

  return (
    <group>
      {plan.positions.map((y, i) => (
        <group key={i} position={[0, mm(y), 0]}>

          {/* CUP Visual */}
          <group position={[mm(21.5), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            {/* Cup Ring */}
            <mesh>
              <cylinderGeometry args={[mm(17.5), mm(17.5), mm(1), 32]} />
              <meshStandardMaterial color="#CFD8DC" />
            </mesh>

            {/* Depth Visualizer (Color-coded) */}
            <mesh position={[0, 0, mm(-plan.meta.drillDepth / 2)]}>
              <cylinderGeometry args={[
                mm(17),
                mm(17),
                mm(plan.meta.drillDepth),
                32
              ]} />
              <meshStandardMaterial
                color={depthColor}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>

          {/* ARM & PLATE */}
          <group position={[mm(-20), 0, mm(15)]}>
            {/* Hinge Arm */}
            <mesh>
              <boxGeometry args={[mm(60), mm(20), mm(5)]} />
              <meshStandardMaterial color="#90A4AE" />
            </mesh>

            {/* Plate (Height based on D value) */}
            <mesh position={[mm(-25), 0, mm(-5)]}>
              <boxGeometry args={[
                mm(10),
                mm(48),
                mm((plate.specs.distance || 0) + 2)
              ]} />
              <meshStandardMaterial color="#546E7A" />
            </mesh>
          </group>

        </group>
      ))}
    </group>
  );
};
```

### 12.9 Quick Reference Tables

**Specialty Hinges Summary:**

| Type | Item No | Angle | Depth | Pattern | Plate | Application |
|------|---------|-------|-------|---------|-------|-------------|
| Profile Full | 329.05.605 | 94° | 13mm | 52/7.5 | D0 | Thick/Frame doors |
| Profile Half | 329.05.614 | 94° | 13mm | 52/7.5 | D0 | Thick/Frame doors |
| Profile Inset | 329.05.632 | 94° | 13mm | 52/7.5 | D0 | Thick/Frame doors |
| Rebated | 329.26.611 | 110° | 9mm | 48/6 | D0 | Glass frame doors |
| Blind Small | 329.34.601 | 94° | 11mm | 48/6 | **D9** | L-corner (small) |
| Blind Large | 329.35.600 | 110° | 11mm | 48/6 | D3 | L-corner (large) |
| Bi-fold 70° | 329.19.700 | 70° | 11mm | 48/6 | D0 | Corner units |
| Angle +15° | 329.96.600 | 94° | 11mm | 48/6 | D0 | Angled panels |
| Angle +24° | 329.96.601 | 94° | 11mm | 48/6 | D0 | Angled panels |
| Angle +30° | 329.96.602 | 94° | 11mm | 48/6 | D0 | Angled panels |
| Angle +37° | 329.96.604 | 94° | 11mm | 48/6 | D0 | Angled panels |
| Angle +45° | 329.96.605 | 94° | 11mm | 48/6 | D0 | Angled panels |
| Refrigerator | 329.23.600 | 94° | 11mm | 45/9.5 | D0 | Built-in fridge |

**Screw Pattern Reference:**

| Pattern | Y Spacing | X Offset | Cup Dia | Hinge Types |
|---------|-----------|----------|---------|-------------|
| 48/6 | 48mm (±24) | 6mm | 35mm | Standard, Blind, Angle, Corner |
| 52/7.5 | 52mm (±26) | 7.5mm | 35mm | Profile/Thick doors |
| 45/9.5 | 45mm (±22.5) | 9.5mm | 35mm | Refrigerator |

**Minimum Door Thickness:**

| Hinge Type | Min Thickness | Cup Depth | Safety Margin |
|------------|---------------|-----------|---------------|
| Rebated | 14mm | 9mm | 5mm |
| Standard | 16mm | 11mm | 5mm |
| Profile | 24mm | 13mm | 11mm |

### 12.10 Complete Implementation Example

```typescript
// Example: Profile door hinge for thick framed door

const profileDoorConfig = {
  doorHeight: 720,
  doorWeight: 8,
  doorThickness: 28,  // Thick profile door
  overlay: 16,
  system: 'HINGE_PROFILE_94' as const
};

// Generate plan
const plan = calculateSpecialtyHingePlan(profileDoorConfig);

console.log('=== Profile Door Hinge Plan ===');
console.log('Hinge:', plan.specs.cup.name);        // 'Profile 94° Full Overlay'
console.log('Item No:', plan.specs.cup.itemNo);   // '329.05.605'
console.log('Plate:', plan.specs.plate.name);     // 'Plate D=0'
console.log('Quantity:', plan.quantity);           // 3
console.log('Positions:', plan.positions);         // [96, 360, 624]
console.log('Drill Depth:', plan.meta.drillDepth); // 13mm
console.log('Pattern:', plan.meta.pattern);        // '52/7.5'

// Generate CAM operations
const ops = generateSpecialtyHingeOps('DOOR-001', 'CAB-001', profileDoorConfig);

console.log('\n=== CAM Operations ===');
console.log('Total operations:', ops.length);  // 15 (3 cups + 6 screws + 6 plates)

// Verify screw pattern
const screwOps = ops.filter(op => op.id.includes('scr'));
console.log('Screw Y positions:', screwOps.map(op => op.y));
// Profile pattern: Y spacing = 52mm (26 + 26)

// Example: Small Blind Corner (D=9 required)
const blindCornerConfig = {
  doorHeight: 600,
  doorWeight: 5,
  doorThickness: 18,
  overlay: 12,
  system: 'HINGE_BLIND_SM' as const
};

const blindPlan = calculateSpecialtyHingePlan(blindCornerConfig);
console.log('\n=== Blind Corner Plan ===');
console.log('Plate:', blindPlan.specs.plate.name);     // 'Blind Corner Plate D=9'
console.log('Plate D:', blindPlan.meta.plateDistanceD); // 9 (MANDATORY!)
```

---

## ส่วนที่ 13: Hinge Kinematics Engine - Häfele Metalla 510 Standard (Architecture v7.0)

ระบบ **Hinge Kinematics Engine** รองรับบานพับ Häfele Metalla 510 ครบทุก Series (Standard, 155°, 165°, Thin Door, Blind Corner) จาก Selection 15 พร้อมระบบคำนวณอัตโนมัติระดับวิศวกรรม

### 13.1 Engineering Logic Highlights

1. **Smart Balancing**: คำนวณจำนวนบานพับ (2-5 ตัว) อัตโนมัติตามกราฟน้ำหนักและความสูงหน้าบาน
2. **Safety Depth Guard**: ตรวจสอบความหนาบาน หากเป็น Thin Door (<15mm) สลับไปใช้รุ่นถ้วยตื้น 8.0mm
3. **Overlay Solver**: คำนวณหาคู่ระยะเจาะ (Cup E) และฐานรอง (Plate D) จากสูตร `Overlay = E + K - D`
4. **Application Aware**: เลือกรุ่น 155° Zero Protrusion อัตโนมัติเมื่อมีลิ้นชักภายใน

### 13.2 Master Hardware Database - Standard Hinges

```typescript
// src/services/hardware/hafeleDb.ts

export type SystemType =
  | 'MINIFIX_15' | 'SC_8_60' | 'U_12_10' | 'TOFIX_25' | 'LAMELLO_P' | 'DOVETAIL_RAIL'
  // HINGE SYSTEMS
  | 'HINGE_110'      // Standard 110°
  | 'HINGE_155'      // Zero Protrusion (ลิ้นชักใน)
  | 'HINGE_165'      // Wide Angle
  | 'HINGE_THIN'     // Thin Door (เจาะตื้น 8mm)
  | 'HINGE_BLIND';   // Blind Corner

export interface HardwareItem {
  id: string;
  itemNo: string;
  name: string;
  category: 'HINGE_CUP' | 'HINGE_PLATE';
  specs: {
    // Hinge Specs
    cupDepth?: number;       // 11.0-13.5mm (Standard) vs 8.0mm (Thin)
    cupDia?: number;         // 35mm
    openingAngle?: number;   // 110, 155, 165
    crankConstant?: number;  // ค่า K สำหรับคำนวณ Overlay
    pattern?: string;        // "48/6" (Standard Pattern)

    // Plate Specs
    distance?: number;       // ความสูงฐาน D (0, 2, 3)
  };
}

export const HAFELE_STANDARD_HINGES = {
  // =================================================================
  // METALLA 510 HINGES (Selection 15)
  // =================================================================

  // --- 1. Standard 110° Soft Close (Page 14) ---
  // Full Overlay (ทับขอบ) -> K = 13
  h110_full: {
    id: 'h110_full',
    itemNo: '329.17.600',
    name: 'Metalla 510 110° Full Overlay',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 110,
      crankConstant: 13,    // K for Overlay calculation
      cupDepth: 11.0,
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,

  // Half Overlay (กลางขอบ) -> K = 4
  h110_half: {
    id: 'h110_half',
    itemNo: '329.17.602',
    name: 'Metalla 510 110° Half Overlay',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 110,
      crankConstant: 4,
      cupDepth: 11.0,
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,

  // Inset (ฝังใน) -> K = -5
  h110_inset: {
    id: 'h110_inset',
    itemNo: '329.17.603',
    name: 'Metalla 510 110° Inset',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 110,
      crankConstant: -5,
      cupDepth: 11.0,
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,

  // --- 2. Wide Angle 155° Zero Protrusion (Page 12) ---
  // สำหรับตู้ที่มีลิ้นชักภายใน (Internal Drawers)
  h155_full: {
    id: 'h155_full',
    itemNo: '329.29.217',
    name: 'Metalla 510 155° Zero Protrusion',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 155,
      crankConstant: 13,
      cupDepth: 11.5,
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,

  // --- 3. Thin Door 105° (Page 15) ---
  // ⚠️ CRITICAL: เจาะลึกเพียง 8.0mm (สำหรับหน้าบานหนา 10-16mm)
  h_thin_full: {
    id: 'h_thin_full',
    itemNo: '329.28.600',
    name: 'Metalla 510 Thin Door 105°',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 105,
      crankConstant: 13,
      cupDepth: 8.0,        // Shallow drilling!
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,

  // --- 4. Wide Angle 165° (Page 16) ---
  h165_full: {
    id: 'h165_full',
    itemNo: '329.07.700',
    name: 'Metalla 510 165° Full Overlay',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 165,
      crankConstant: 13,
      cupDepth: 11.0,
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,

  // --- 5. Blind Corner (Page 10) ---
  h_blind: {
    id: 'h_blind',
    itemNo: '329.11.705',
    name: 'Metalla 510 Blind Corner',
    category: 'HINGE_CUP',
    specs: {
      openingAngle: 110,
      crankConstant: -99,   // Special (not applicable)
      cupDepth: 11.5,
      cupDia: 35,
      pattern: '48/6'
    }
  } as HardwareItem,
};

// --- MOUNTING PLATES (Page 8) ---
export const STANDARD_PLATES = {
  d0: {
    id: 'plate_d0',
    itemNo: '329.67.060',
    name: 'Mounting Plate D=0',
    category: 'HINGE_PLATE',
    specs: { distance: 0 }
  } as HardwareItem,

  d2: {
    id: 'plate_d2',
    itemNo: '329.67.062',
    name: 'Mounting Plate D=2',
    category: 'HINGE_PLATE',
    specs: { distance: 2 }
  } as HardwareItem,

  d3: {
    id: 'plate_d3',
    itemNo: '329.67.063',
    name: 'Mounting Plate D=3',
    category: 'HINGE_PLATE',
    specs: { distance: 3 }
  } as HardwareItem
};
```

### 13.3 Overlay Calculation Formula

```
OVERLAY FORMULA (Metalla 510 Standard):

Overlay = E + K - D

Where:
- E = Cup Distance from door edge (3-6mm)
- K = Crank Constant (depends on hinge type)
- D = Plate Distance (0, 2, 3mm)

┌─────────────────────────────────────────────────────────────────────────┐
│  Hinge Type          │   K    │  Typical Overlay  │   Application       │
├──────────────────────┼────────┼───────────────────┼─────────────────────┤
│  110° Full Overlay   │  +13   │   15-19mm         │  Standard cabinets  │
│  110° Half Overlay   │   +4   │    6-10mm         │  Two doors meeting  │
│  110° Inset          │   -5   │   -2 to +2mm      │  Flush doors        │
│  155° Zero Protrusion│  +13   │   15-19mm         │  Internal drawers   │
│  165° Wide Angle     │  +13   │   15-19mm         │  Corner access      │
│  105° Thin Door      │  +13   │   15-19mm         │  Thin panels <15mm  │
└──────────────────────┴────────┴───────────────────┴─────────────────────┘


SOLVER EXAMPLE:
Target Overlay = 16mm
Using 110° Full (K=13)

Try E=3, D=0: Overlay = 3 + 13 - 0 = 16mm ✅ Perfect!
Try E=5, D=2: Overlay = 5 + 13 - 2 = 16mm ✅ Also works!
```

### 13.4 Hinge Quantity Graph

```
HINGE QUANTITY BY HEIGHT & WEIGHT (Page 1):

┌─────────────────────────────────────────────────────────────────────────┐
│  Door Height (mm)    │  ≤6kg  │  ≤12kg  │  ≤17kg  │  >17kg  │
├──────────────────────┼────────┼─────────┼─────────┼─────────┤
│  ≤900mm              │   2    │    2    │    3    │    3    │
│  ≤1200mm             │   2    │    3    │    3    │    4    │
│  ≤1600mm             │   3    │    3    │    4    │    4    │
│  ≤2100mm             │   3    │    4    │    4    │    5    │
│  >2100mm             │   4    │    4    │    5    │    5    │
└──────────────────────┴────────┴─────────┴─────────┴─────────┘

Formula (Simplified):
qty = (height > 2100 || weight > 17) ? 5 :
      (height > 1600 || weight > 12) ? 4 :
      (height > 900  || weight > 6)  ? 3 : 2;
```

### 13.5 Hinge Kinematics Engine

```typescript
// src/services/engineering/hingeEngine.ts

import {
  HAFELE_STANDARD_HINGES,
  STANDARD_PLATES,
  HardwareItem,
  SystemType
} from '../hardware/hafeleDb';

export interface HingePlan {
  isValid: boolean;
  quantity: number;
  positions: number[];  // Y positions from bottom edge
  specs: {
    cup: HardwareItem;
    plate: HardwareItem;
  };
  meta: {
    cupDistanceE: number;    // 3-6mm
    plateDistanceD: number;  // 0, 2, 3mm
    actualOverlay: number;
  };
}

interface HingeOptions {
  doorHeight: number;
  doorWeight: number;       // kg
  doorThickness: number;    // mm
  overlay: number;          // Target overlay (e.g., 16mm)
  system?: SystemType;
  isInternalDrawer?: boolean;
}

/**
 * Calculate hinge quantity based on height and weight graph
 */
const getHingeCount = (height: number, weight: number): number => {
  if (height > 2100 || weight > 17) return 5;
  if (height > 1600 || weight > 12) return 4;
  if (height > 900  || weight > 6)  return 3;
  return 2;
};

/**
 * Select appropriate hinge based on application
 */
const selectHinge = (
  system: SystemType,
  overlay: number,
  isThinDoor: boolean,
  hasInternalDrawer: boolean
): HardwareItem => {
  const db = HAFELE_STANDARD_HINGES;

  // ✅ Safety: Force Thin Door Hinge (8mm depth) for thin panels
  if (isThinDoor) return db.h_thin_full;

  // Application-specific selection
  if (hasInternalDrawer || system === 'HINGE_155') return db.h155_full;
  if (system === 'HINGE_165') return db.h165_full;
  if (system === 'HINGE_BLIND') return db.h_blind;

  // Standard 110° selection based on overlay
  if (overlay >= 10) return db.h110_full;   // Full Overlay
  if (overlay >= 0)  return db.h110_half;   // Half Overlay
  return db.h110_inset;                      // Inset
};

/**
 * Calculate complete hinge plan with Overlay Solver
 */
export const calculateStandardHingePlan = (opts: HingeOptions): HingePlan => {
  const {
    doorHeight,
    doorWeight,
    doorThickness,
    overlay,
    system = 'HINGE_110',
    isInternalDrawer = false
  } = opts;

  // 1. Check Thin Door condition (<15mm = thin)
  const isThinDoor = doorThickness < 15;

  // 2. Calculate quantity from graph
  const qty = getHingeCount(doorHeight, doorWeight);

  // 3. Select hardware
  const cup = selectHinge(system, overlay, isThinDoor, isInternalDrawer);
  const K = cup.specs.crankConstant || 0;

  // 4. SOLVER: Find best E (3-6mm) and D (0,2,3) combination
  // Formula: Overlay = E + K - D
  let bestE = 3;
  let bestD = 0;
  let minDiff = 999;

  const availPlates = [0, 2, 3];
  const availE = [3, 4, 5, 6];

  for (const E of availE) {
    for (const D of availPlates) {
      const calcOverlay = E + K - D;
      const diff = Math.abs(calcOverlay - overlay);

      if (diff < minDiff) {
        minDiff = diff;
        bestE = E;
        bestD = D;
      }
    }
  }

  // 5. Map D to Plate item
  let plate = STANDARD_PLATES.d0;
  if (bestD === 2) plate = STANDARD_PLATES.d2;
  if (bestD === 3) plate = STANDARD_PLATES.d3;

  // 6. Calculate positions (System 32 aligned)
  const positions: number[] = [];
  const margin = 96;  // 32 × 3mm from edges

  if (qty === 2) {
    positions.push(margin, doorHeight - margin);
  } else {
    const span = doorHeight - (2 * margin);
    const step = span / (qty - 1);

    for (let i = 0; i < qty; i++) {
      const rawY = margin + (step * i);
      positions.push(Math.round(rawY));
    }
  }

  return {
    isValid: minDiff <= 2.5,  // Accept up to 2.5mm error (adjustable on-site)
    quantity: qty,
    positions,
    specs: { cup, plate },
    meta: {
      cupDistanceE: bestE,
      plateDistanceD: bestD,
      actualOverlay: bestE + K - bestD
    }
  };
};
```

### 13.6 CAM Generator for Standard Hinges

```typescript
// src/services/cam/generators/hingeOp.ts

import { calculateStandardHingePlan, HingePlan } from '../../engineering/hingeEngine';

export interface MachineOp {
  id: string;
  type: 'DRILL' | 'MILL';
  face: 'FACE' | 'EDGE' | 'BACK';
  x: number;
  y: number;
  diameter: number;
  depth: number;
  hardwareId: string;
}

/**
 * Generate drilling operations for standard hinges
 * Pattern 48/6 for all Metalla 510 series
 */
export const generateStandardHingeOps = (
  doorId: string,
  cabinetId: string,
  opts: any
): MachineOp[] => {
  const plan = calculateStandardHingePlan(opts);
  if (!plan.isValid) return [];

  const ops: MachineOp[] = [];
  const { cup, plate } = plan.specs;

  plan.positions.forEach((yPos, i) => {

    // === 1. DOOR OPERATIONS (CUP) ===
    // Center X = Cup Distance E + Radius (17.5mm)
    const cupCenterX = plan.meta.cupDistanceE + 17.5;

    // 1.1 Main Cup Hole (35mm diameter)
    ops.push({
      id: `${doorId}-cup-${i}`,
      type: 'DRILL',
      face: 'FACE',
      x: cupCenterX,
      y: yPos,
      diameter: 35,
      // ✅ CRITICAL: Use depth from spec (8mm for Thin, 11mm for Standard)
      depth: cup.specs.cupDepth || 11,
      hardwareId: cup.itemNo
    });

    // 1.2 Screw Holes (Pattern 48/6)
    // 48mm apart (Y ±24mm), Offset 6mm from center X
    const screwX = cupCenterX - 6;
    [-24, 24].forEach(offsetY => {
      ops.push({
        id: `${doorId}-cup-screw-${i}-${offsetY}`,
        type: 'DRILL',
        face: 'FACE',
        x: screwX,
        y: yPos + offsetY,
        diameter: 2.5,  // Pilot hole
        depth: 5,
        hardwareId: 'HINGE-SCREW'
      });
    });

    // === 2. CABINET OPERATIONS (PLATE) ===
    // System 32 mounting, X = 37mm from front edge
    const plateX = 37;
    [-16, 16].forEach(offsetY => {
      ops.push({
        id: `${cabinetId}-plate-${i}-${offsetY}`,
        type: 'DRILL',
        face: 'FACE',
        x: plateX,
        y: yPos + offsetY,
        diameter: 5,  // System 32 hole
        depth: 13,
        hardwareId: plate.itemNo
      });
    });
  });

  return ops;
};
```

### 13.7 Drilling Pattern Diagram

```
STANDARD HINGE DRILLING (Pattern 48/6):

DOOR PANEL (Face View):
┌─────────────────────────────────────────┐
│                                         │
│         ●  ← Screw 2.5mm @ Y+24         │
│         │     (X = E + 17.5 - 6)        │
│         │                               │
│     ◯───┴───── 35mm Cup                 │
│         │      (X = E + 17.5mm)         │
│         │      Depth = 8mm (Thin)       │
│         │             or 11mm (Std)     │
│         ●  ← Screw 2.5mm @ Y-24         │
│                                         │
│   E = Cup distance from edge (3-6mm)    │
│   Pattern spacing: 48mm (24+24)         │
│   Screw offset: 6mm from cup center     │
└─────────────────────────────────────────┘


CABINET SIDE PANEL (Face View):
┌─────────────────────────────────────────┐
│                                         │
│         ●  ← Plate hole @ Y+16          │
│   37mm  │     (5mm dia, 13mm deep)      │
│   from  │                               │
│   edge  │                               │
│         │                               │
│         ●  ← Plate hole @ Y-16          │
│                                         │
│   Plate spacing: 32mm (16+16)           │
│   Standard System 32 pattern            │
└─────────────────────────────────────────┘
```

### 13.8 Thin Door Safety System

```
THIN DOOR DETECTION & SAFETY:

┌─────────────────────────────────────────────────────────────────────────┐
│  Door Thickness  │  Hinge Type       │  Cup Depth  │  Safety Status     │
├──────────────────┼───────────────────┼─────────────┼────────────────────┤
│  <10mm           │  NOT SUPPORTED    │    N/A      │  ⛔ Error          │
│  10-14mm         │  THIN DOOR 105°   │   8.0mm     │  ✅ Auto-selected  │
│  15-17mm         │  STANDARD 110°    │  11.0mm     │  ✅ Normal         │
│  18-24mm         │  STANDARD 110°    │  11.0mm     │  ✅ Normal         │
│  >24mm           │  PROFILE (v8.0)   │  13.0mm     │  ✅ See Section 12 │
└──────────────────┴───────────────────┴─────────────┴────────────────────┘


SAFETY RULE:
If doorThickness < 15mm:
  → Force select THIN DOOR hinge (8mm cup depth)
  → Prevents drilling through door face!

MINIMUM CLEARANCE:
- Thin Door: 10mm panel - 8mm cup = 2mm clearance ✅
- Standard:  16mm panel - 11mm cup = 5mm clearance ✅

⚠️ NEVER drill cup depth > (doorThickness - 2mm)
```

### 13.9 Visual Component

```typescript
// src/components/3d/hardware/MasterHinge.tsx

import React, { useMemo } from 'react';
import { calculateStandardHingePlan } from '../../../services/engineering/hingeEngine';

const mm = (v: number) => v / 1000;

interface MasterHingeProps {
  doorHeight: number;
  doorWeight: number;
  doorThickness: number;
  overlay: number;
  system?: string;
  isInternalDrawer?: boolean;
}

export const MasterHinge: React.FC<MasterHingeProps> = (props) => {
  const plan = useMemo(() => calculateStandardHingePlan(props as any), [props]);

  if (!plan?.isValid) return null;

  const { cup, plate } = plan.specs;

  // Color coding: Orange = Thin Door (warning), Gray = Standard
  const cupColor = cup.specs.cupDepth! < 10 ? "#FF9800" : "#CFD8DC";

  return (
    <group>
      {plan.positions.map((y, i) => (
        <group key={i} position={[0, mm(y), 0]}>

          {/* 1. Cup on Door */}
          <group
            position={[mm(plan.meta.cupDistanceE + 17.5), 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            {/* Cup Ring */}
            <mesh>
              <cylinderGeometry args={[mm(17.5), mm(17.5), mm(2), 32]} />
              <meshStandardMaterial color={cupColor} metalness={0.6} />
            </mesh>

            {/* Cup Body (shows depth) */}
            <mesh position={[0, mm(-cup.specs.cupDepth! / 2), 0]}>
              <cylinderGeometry args={[
                mm(17),
                mm(17),
                mm(cup.specs.cupDepth!),
                32
              ]} />
              <meshStandardMaterial color="#90A4AE" />
            </mesh>
          </group>

          {/* 2. Arm & Plate on Cabinet */}
          <group position={[mm(-20), 0, mm(15)]}>
            {/* Hinge Arm */}
            <mesh>
              <boxGeometry args={[mm(60), mm(20), mm(5)]} />
              <meshStandardMaterial color="#B0BEC5" />
            </mesh>

            {/* Mounting Plate */}
            <mesh position={[mm(-25), 0, mm(-5)]}>
              <boxGeometry args={[
                mm(10),
                mm(45),
                mm((plate.specs.distance || 0) + 2)
              ]} />
              <meshStandardMaterial color="#78909C" />
            </mesh>
          </group>

        </group>
      ))}
    </group>
  );
};
```

### 13.10 Quick Reference Tables

**Metalla 510 Standard Hinges:**

| Type | Item No | Angle | K | Depth | Application |
|------|---------|-------|---|-------|-------------|
| 110° Full | 329.17.600 | 110° | +13 | 11mm | Standard full overlay |
| 110° Half | 329.17.602 | 110° | +4 | 11mm | Two doors meeting |
| 110° Inset | 329.17.603 | 110° | -5 | 11mm | Flush doors |
| 155° Zero | 329.29.217 | 155° | +13 | 11.5mm | Internal drawers |
| 165° Wide | 329.07.700 | 165° | +13 | 11mm | Corner access |
| 105° Thin | 329.28.600 | 105° | +13 | 8mm | Thin doors <15mm |
| Blind Corner | 329.11.705 | 110° | N/A | 11.5mm | L-shaped corners |

**Standard Mounting Plates:**

| Plate | Item No | Distance D | Use Case |
|-------|---------|------------|----------|
| D=0 | 329.67.060 | 0mm | Standard (most common) |
| D=2 | 329.67.062 | 2mm | Fine overlay adjustment |
| D=3 | 329.67.063 | 3mm | Reduced overlay |

**Overlay Quick Calculator:**

| E (mm) | K | D (mm) | Overlay Result |
|--------|---|--------|----------------|
| 3 | +13 | 0 | 16mm (Full) |
| 4 | +13 | 0 | 17mm (Full) |
| 5 | +13 | 2 | 16mm (Full) |
| 3 | +4 | 0 | 7mm (Half) |
| 5 | +4 | 2 | 7mm (Half) |
| 3 | -5 | 0 | -2mm (Inset) |
| 6 | -5 | 3 | -2mm (Inset) |

### 13.11 Complete Implementation Example

```typescript
// Example: Standard cabinet door with hinge plan

const standardDoorConfig = {
  doorHeight: 720,
  doorWeight: 8,
  doorThickness: 18,
  overlay: 16,
  system: 'HINGE_110' as const,
  isInternalDrawer: false
};

// Generate plan
const plan = calculateStandardHingePlan(standardDoorConfig);

console.log('=== Standard Hinge Plan ===');
console.log('Hinge:', plan.specs.cup.name);        // 'Metalla 510 110° Full Overlay'
console.log('Item No:', plan.specs.cup.itemNo);   // '329.17.600'
console.log('Plate:', plan.specs.plate.name);     // 'Mounting Plate D=0'
console.log('Quantity:', plan.quantity);           // 3
console.log('Positions:', plan.positions);         // [96, 360, 624]
console.log('Cup Depth:', plan.specs.cup.specs.cupDepth); // 11mm
console.log('Actual Overlay:', plan.meta.actualOverlay);   // 16mm

// Generate CAM operations
const ops = generateStandardHingeOps('DOOR-001', 'CAB-001', standardDoorConfig);

console.log('\n=== CAM Operations ===');
console.log('Total operations:', ops.length);  // 15 (3 cups + 6 screws + 6 plates)

// Verify cup depth
const cupOps = ops.filter(op => op.id.includes('cup-') && !op.id.includes('screw'));
console.log('Cup depth:', cupOps[0].depth);  // 11mm (Standard)


// Example: Thin door (auto-safety switch)
const thinDoorConfig = {
  doorHeight: 600,
  doorWeight: 3,
  doorThickness: 12,  // Thin door!
  overlay: 16,
  system: 'HINGE_110' as const
};

const thinPlan = calculateStandardHingePlan(thinDoorConfig);

console.log('\n=== Thin Door Plan ===');
console.log('Hinge:', thinPlan.specs.cup.name);  // 'Metalla 510 Thin Door 105°'
console.log('Cup Depth:', thinPlan.specs.cup.specs.cupDepth); // 8mm (SAFETY!)
console.log('Clearance:', thinDoorConfig.doorThickness - thinPlan.specs.cup.specs.cupDepth!);
// Output: 4mm clearance ✅


// Example: Cabinet with internal drawers (155° Zero Protrusion)
const drawerCabinetConfig = {
  doorHeight: 720,
  doorWeight: 6,
  doorThickness: 18,
  overlay: 16,
  system: 'HINGE_155' as const,
  isInternalDrawer: true
};

const drawerPlan = calculateStandardHingePlan(drawerCabinetConfig);

console.log('\n=== Drawer Cabinet Plan ===');
console.log('Hinge:', drawerPlan.specs.cup.name);  // 'Metalla 510 155° Zero Protrusion'
console.log('Angle:', drawerPlan.specs.cup.specs.openingAngle);  // 155°
// Zero protrusion allows drawers to fully extend!
```

---

## ส่วนที่ 14: Dovetail Linear Engine (Architecture v6.0)

ระบบ **Ixconnect Dovetail** ของ Häfele เป็นระบบยึดแผ่นชั้นแบบ "รางลิ้นราง" (Dovetail Slot) ที่ให้ความแข็งแรงสูงและถอดประกอบง่าย เหมาะสำหรับชั้นวางของที่รับน้ำหนักมาก

### 14.1 Advanced Linear Logic

ระบบ Dovetail มีความซับซ้อนกว่าระบบ Connector แบบจุด เพราะต้องจัดการ 2 มิติ:

```
DUAL INSTALLATION MODES:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  MODE 1a: RAIL SYSTEM (DOVETAIL_RAIL)                          │
│  ─────────────────────────────────────                          │
│  ฝังรางอลูมิเนียมในร่องที่กัดไว้                                │
│                                                                 │
│  ┌────────────────────────────────────┐                        │
│  │  ╔══════════════════════════════╗  │ ← Aluminium Rail       │
│  │  ║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║  │   (261.30.030)         │
│  │  ╚══════════════════════════════╝  │                        │
│  │           SHELF EDGE               │                        │
│  └────────────────────────────────────┘                        │
│                                                                 │
│  MODE 1b: DIRECT SYSTEM (DOVETAIL_DIRECT)                      │
│  ─────────────────────────────────────────                      │
│  กัดร่อง Dovetail ลงบนไม้โดยตรง (ไม่ใช้ราง)                    │
│                                                                 │
│  ┌────────────────────────────────────┐                        │
│  │  ╲══════════════════════════════╱  │ ← Routed Groove        │
│  │   ╲▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓╱   │   (Direct in Wood)     │
│  │    ╲════════════════════════╱    │                        │
│  │           SHELF EDGE               │                        │
│  └────────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

DYNAMIC SPACING:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Rail Fixing Screws: ทุก 200mm ตลอดความยาวราง               │
│     ├──200mm──├──200mm──├──200mm──├──200mm──┤                  │
│     ●         ●         ●         ●         ●                   │
│                                                                 │
│  2. Sleeve Distribution: 6 ตัว/เมตร (กระจายอัตโนมัติ)          │
│     ├───166mm───├───166mm───├───166mm───├───166mm───┤          │
│     ▣           ▣           ▣           ▣           ▣           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 14.2 Hardware Database

```typescript
// src/services/hardware/hafeleDb.ts

export type SystemType =
  | 'MINIFIX_15' | 'MINIFIX_12' | 'MAXIFIX_35'
  | 'SC_8_60' | 'U_12_10' | 'CC_8_5_30' | 'TOFIX_25'
  | 'LAMELLO_P'
  | 'DOVETAIL_RAIL'    // แบบฝังรางอลูมิเนียม (Installation 1a)
  | 'DOVETAIL_DIRECT'; // แบบกัดร่องไม้โดยตรง (Installation 1b)

export interface HardwareItem {
  id: string;
  itemNo: string;
  name: string;
  category: 'CONNECTOR_DOVETAIL' | 'RAIL_DOVETAIL' | string;
  specs: {
    drillDepth: number;
    width?: number;          // ความกว้างร่อง/ฐาน
    height?: number;         // ความลึกร่อง
    length?: number;         // ความยาวตัว
    dowelCount?: number;     // จำนวนเดือยนำศูนย์ (0, 1, 2)
    dowelSpacing?: number;   // ระยะห่างเดือย (32mm)
    screwInterval?: number;  // ระยะแนะนำการยิงสกรูราง (200mm)
    isLinear?: boolean;      // เป็นสินค้าเส้นยาว
  };
}

export const DOVETAIL_HARDWARE = {
  // =================================================================
  // 1. RAIL (ตัวผู้ - ฝังที่ชั้นวาง)
  // =================================================================
  rail_alu_raw: {
    id: 'dt_rail_raw',
    itemNo: '261.30.030',
    name: 'Alu Dovetail Rail (3000mm)',
    category: 'RAIL_DOVETAIL',
    specs: {
      isLinear: true,
      width: 12,          // กว้าง 12mm
      height: 10.5,       // ลึก 10.5mm
      length: 3000,
      screwInterval: 200, // ยิงสกรูทุกๆ 200mm
      drillDepth: 10.5
    }
  } as HardwareItem,

  // =================================================================
  // 2. SLEEVES (ตัวเมีย - ติดที่แผงข้าง)
  // =================================================================

  // 2.1 Short Sleeve (Standard) - ยิงสกรูผิวหน้า
  sleeve_std: {
    id: 'dt_sleeve_std',
    itemNo: '261.30.790',
    name: 'Dovetail Sleeve (Short)',
    category: 'CONNECTOR_DOVETAIL',
    specs: {
      length: 9,
      width: 9,
      drillDepth: 0,      // Surface Mount
      dowelCount: 0
    }
  } as HardwareItem,

  // 2.2 Long Sleeve (41mm) - Variant 1: ไม่มีเดือย
  sleeve_long_0d: {
    id: 'dt_long_0d',
    itemNo: '261.30.780',
    name: 'Long Sleeve 41mm (No Dowel)',
    category: 'CONNECTOR_DOVETAIL',
    specs: {
      length: 41,
      width: 9,
      drillDepth: 0,
      dowelCount: 0
    }
  } as HardwareItem,

  // 2.3 Long Sleeve (41mm) - Variant 2: มีเดือยกลาง 1 ตัว
  sleeve_long_1d: {
    id: 'dt_long_1d',
    itemNo: '261.30.781',
    name: 'Long Sleeve 41mm (1 Dowel)',
    category: 'CONNECTOR_DOVETAIL',
    specs: {
      length: 41,
      width: 9,
      drillDepth: 5,
      dowelCount: 1,
      dowelSpacing: 0
    }
  } as HardwareItem,

  // 2.4 Long Sleeve (41mm) - Variant 3: มีเดือย 2 ตัว (นิยมสุด)
  sleeve_long_2d: {
    id: 'dt_long_2d',
    itemNo: '261.30.782',
    name: 'Long Sleeve 41mm (2 Dowels)',
    category: 'CONNECTOR_DOVETAIL',
    specs: {
      length: 41,
      width: 9,
      drillDepth: 5,
      dowelCount: 2,
      dowelSpacing: 32
    }
  } as HardwareItem
};
```

### 14.3 Dovetail Engineering Engine

```typescript
// src/services/engineering/dovetailEngine.ts
import { DOVETAIL_HARDWARE, HardwareItem, SystemType } from '../hardware/hafeleDb';

export interface DovetailPlan {
  isValid: boolean;
  system: SystemType;
  specs: {
    rail: HardwareItem;    // Rail (ตัวผู้)
    sleeve: HardwareItem;  // Sleeve (ตัวเมีย)
  };
  sleevePositions: {
    x: number;
    rotationY: number;
    dowelOffsets: number[]
  }[];
  meta: {
    railLength: number;
    railFixingPoints: number[]; // จุดยิงสกรูยึดราง
    grooveSpec: { w: number; d: number; l: number };
    sleeveCount: number;
    minThickness: number;
  };
}

export type SleeveVariant = 'SHORT' | 'LONG_0D' | 'LONG_1D' | 'LONG_2D';

interface DovetailOptions {
  length: number;           // ความยาวชั้นวาง
  thickness: number;        // ความหนาชั้นวาง
  system: SystemType;       // DOVETAIL_RAIL หรือ DOVETAIL_DIRECT
  sleeveVariant?: SleeveVariant;
}

/**
 * Dovetail Joinery Calculator
 *
 * Key Formulas:
 * - Sleeve Count = ceil(length × 6 / 1000) with minimum 2
 * - Screw Count = ceil(length / 200)
 * - Margin = 50mm from each edge
 */
export function calculateDovetailPlan(opts: DovetailOptions): DovetailPlan {
  const {
    length,
    thickness,
    system,
    sleeveVariant = 'SHORT'
  } = opts;

  // =================================================================
  // 1. VALIDATION (Min Thickness 19mm per Häfele spec)
  // =================================================================
  if (thickness < 19) {
    return {
      isValid: false,
      system,
      specs: {} as any,
      sleevePositions: [],
      meta: {
        railLength: 0,
        railFixingPoints: [],
        grooveSpec: { w: 0, d: 0, l: 0 },
        sleeveCount: 0,
        minThickness: 19
      }
    };
  }

  // =================================================================
  // 2. HARDWARE SELECTION
  // =================================================================
  const rail = DOVETAIL_HARDWARE.rail_alu_raw;

  let sleeve: HardwareItem;
  switch (sleeveVariant) {
    case 'LONG_0D': sleeve = DOVETAIL_HARDWARE.sleeve_long_0d; break;
    case 'LONG_1D': sleeve = DOVETAIL_HARDWARE.sleeve_long_1d; break;
    case 'LONG_2D': sleeve = DOVETAIL_HARDWARE.sleeve_long_2d; break;
    default:        sleeve = DOVETAIL_HARDWARE.sleeve_std;
  }

  // =================================================================
  // 3. SLEEVE DISTRIBUTION (6 Sleeves per Meter)
  // =================================================================
  const sleeveDensity = 6 / 1000; // 6 per meter
  const sleeveCount = Math.max(2, Math.ceil(length * sleeveDensity));

  // กระจายตำแหน่งโดยเว้นขอบ (Margin 50mm)
  const margin = 50;
  const workingSpan = length - (margin * 2);
  const sleeveStep = workingSpan / (sleeveCount - 1);

  const sleevePositions: DovetailPlan['sleevePositions'] = [];
  for (let i = 0; i < sleeveCount; i++) {
    const x = margin + (sleeveStep * i);

    // Calculate dowel offsets based on variant
    const dowelOffsets: number[] = [];
    if (sleeve.specs.dowelCount === 2) {
      const offset = sleeve.specs.dowelSpacing! / 2; // 16mm
      dowelOffsets.push(-offset, offset);
    } else if (sleeve.specs.dowelCount === 1) {
      dowelOffsets.push(0);
    }

    sleevePositions.push({
      x,
      rotationY: 0,
      dowelOffsets
    });
  }

  // =================================================================
  // 4. RAIL FIXING SCREWS (เฉพาะ DOVETAIL_RAIL)
  // =================================================================
  const railFixingPoints: number[] = [];
  if (system === 'DOVETAIL_RAIL') {
    const screwInterval = rail.specs.screwInterval!; // 200mm
    const screwCount = Math.ceil(length / screwInterval);
    const screwStep = length / (screwCount + 1);

    for (let i = 1; i <= screwCount; i++) {
      railFixingPoints.push(Math.round(screwStep * i));
    }
  }

  return {
    isValid: true,
    system,
    specs: { rail, sleeve },
    sleevePositions,
    meta: {
      railLength: length,
      railFixingPoints,
      grooveSpec: {
        w: rail.specs.width!,   // 12mm
        d: rail.specs.height!,  // 10.5mm
        l: length
      },
      sleeveCount,
      minThickness: 19
    }
  };
}
```

### 14.4 CAM Generator for Dovetail

```typescript
// src/services/cam/generators/dovetailOp.ts
import { calculateDovetailPlan, DovetailPlan } from '../../engineering/dovetailEngine';

export interface DovetailMachineOp {
  id: string;
  type: 'MILL_FULL_SLOT' | 'DRILL';
  face: 'EDGE' | 'FACE';
  x: number;
  y: number;
  params?: {
    length: number;
    width: number;
    depth: number;
    toolProfile: string;
  };
  diameter?: number;
  depth?: number;
  hardwareRef: string;
}

/**
 * Generate CNC operations for Dovetail shelf mounting
 *
 * Operations:
 * 1. SHELF EDGE: Mill dovetail groove (full length)
 * 2. SHELF EDGE: Rail fixing screws (every 200mm)
 * 3. SIDE PANEL: Sleeve mounting holes
 */
export function generateDovetailOps(
  partId: string,
  opts: Parameters<typeof calculateDovetailPlan>[0]
): DovetailMachineOp[] {
  const plan = calculateDovetailPlan(opts);
  if (!plan.isValid) return [];

  const ops: DovetailMachineOp[] = [];
  const { rail, sleeve } = plan.specs;

  // =================================================================
  // 1. SHELF EDGE: MILL DOVETAIL GROOVE (กัดร่องยาวตลอดแนว)
  // =================================================================
  ops.push({
    id: `${partId}-dt-groove`,
    type: 'MILL_FULL_SLOT',
    face: 'EDGE',
    x: 0,
    y: 0, // Center of edge
    params: {
      length: plan.meta.railLength,
      width: plan.meta.grooveSpec.w,   // 12mm
      depth: plan.meta.grooveSpec.d,   // 10.5mm
      toolProfile: 'DOVETAIL-CUTTER-12'
    },
    hardwareRef: rail.itemNo
  });

  // =================================================================
  // 2. SHELF EDGE: RAIL FIXING SCREWS (เฉพาะแบบใส่ราง)
  // =================================================================
  if (plan.system === 'DOVETAIL_RAIL') {
    plan.meta.railFixingPoints.forEach((pos, i) => {
      ops.push({
        id: `${partId}-dt-rail-screw-${i}`,
        type: 'DRILL',
        face: 'EDGE',
        x: pos,
        y: 0,
        diameter: 3,  // Pilot Hole 3mm
        depth: 10,
        hardwareRef: 'SCREW-3x13'
      });
    });
  }

  // =================================================================
  // 3. SIDE PANEL: SLEEVE MOUNTING
  // =================================================================
  plan.sleevePositions.forEach((set, i) => {

    // 3.1 Long Sleeve with 2 Dowels (รุ่นยอดนิยม 261.30.782)
    if (sleeve.specs.dowelCount === 2) {
      set.dowelOffsets.forEach((offset, j) => {
        ops.push({
          id: `${partId}-dt-sleeve-${i}-d${j}`,
          type: 'DRILL',
          face: 'FACE',
          x: set.x + offset,
          y: 37, // System 32 distance from front
          diameter: 5,
          depth: sleeve.specs.drillDepth,
          hardwareRef: sleeve.itemNo
        });
      });
    }

    // 3.2 Long Sleeve with 1 Dowel
    else if (sleeve.specs.dowelCount === 1) {
      ops.push({
        id: `${partId}-dt-sleeve-${i}-d0`,
        type: 'DRILL',
        face: 'FACE',
        x: set.x,
        y: 37,
        diameter: 5,
        depth: sleeve.specs.drillDepth,
        hardwareRef: sleeve.itemNo
      });
    }

    // 3.3 Short Sleeve / No Dowel (Screw Only)
    else {
      ops.push({
        id: `${partId}-dt-sleeve-${i}-pilot`,
        type: 'DRILL',
        face: 'FACE',
        x: set.x,
        y: 37,
        diameter: 3, // Pilot Hole
        depth: 5,
        hardwareRef: sleeve.itemNo
      });
    }
  });

  return ops;
}
```

### 14.5 Visual Component

```typescript
// src/components/3d/hardware/DovetailConnector.tsx
import React, { useMemo } from 'react';
import { calculateDovetailPlan } from '../../../services/engineering/dovetailEngine';

const mm = (v: number) => v / 1000;

interface DovetailConnectorProps {
  length: number;
  thickness: number;
  system: 'DOVETAIL_RAIL' | 'DOVETAIL_DIRECT';
  sleeveVariant?: 'SHORT' | 'LONG_0D' | 'LONG_1D' | 'LONG_2D';
}

export const DovetailConnector: React.FC<DovetailConnectorProps> = (props) => {
  const plan = useMemo(() => calculateDovetailPlan(props), [props]);

  if (!plan.isValid) return null;

  const { system, specs, meta } = plan;

  return (
    <group>
      {/* 1. Rail / Groove (ยาวตลอดแนว) */}
      <mesh
        position={[mm(meta.railLength / 2), 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <boxGeometry args={[
          mm(meta.grooveSpec.d),  // 10.5mm height
          mm(meta.railLength),    // Full length
          mm(meta.grooveSpec.w)   // 12mm width
        ]} />
        {system === 'DOVETAIL_RAIL' ? (
          // Aluminium rail appearance
          <meshStandardMaterial
            color="#E0E0E0"
            metalness={0.8}
            roughness={0.2}
          />
        ) : (
          // Empty groove (wood visible)
          <meshBasicMaterial
            color="#3E2723"
            wireframe
            opacity={0.3}
            transparent
          />
        )}
      </mesh>

      {/* 2. Sleeves */}
      {plan.sleevePositions.map((set, i) => (
        <group
          key={i}
          position={[mm(set.x), mm(-8), 0]}
          rotation={[0, 0, Math.PI]}
        >
          <mesh>
            {/* Shape differs by variant (Short vs Long) */}
            {specs.sleeve.specs.length! > 20 ? (
              <boxGeometry args={[mm(41), mm(8), mm(9)]} />
            ) : (
              <cylinderGeometry args={[mm(4), mm(3), mm(8), 4]} />
            )}
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>

          {/* Visual Dowels (if 2-dowel variant) */}
          {specs.sleeve.specs.dowelCount === 2 && (
            <>
              <mesh position={[mm(16), mm(4), 0]}>
                <cylinderGeometry args={[mm(2.5), mm(2.5), mm(5)]} />
                <meshBasicMaterial color="#333" />
              </mesh>
              <mesh position={[mm(-16), mm(4), 0]}>
                <cylinderGeometry args={[mm(2.5), mm(2.5), mm(5)]} />
                <meshBasicMaterial color="#333" />
              </mesh>
            </>
          )}

          {/* Visual Dowel (if 1-dowel variant) */}
          {specs.sleeve.specs.dowelCount === 1 && (
            <mesh position={[0, mm(4), 0]}>
              <cylinderGeometry args={[mm(2.5), mm(2.5), mm(5)]} />
              <meshBasicMaterial color="#333" />
            </mesh>
          )}
        </group>
      ))}

      {/* 3. Rail Fixing Screw Indicators (Rail mode only) */}
      {system === 'DOVETAIL_RAIL' && meta.railFixingPoints.map((pos, i) => (
        <mesh key={`screw-${i}`} position={[mm(pos), mm(-2), 0]}>
          <cylinderGeometry args={[mm(1.5), mm(1.5), mm(4)]} />
          <meshStandardMaterial color="#666" metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
};
```

### 14.6 Sleeve Variant Comparison

| Variant | Item No | Length | Dowels | Dowel Spacing | Use Case |
|---------|---------|--------|--------|---------------|----------|
| **Short** | 261.30.790 | 9mm | 0 | - | Quick install, screw mount |
| **Long 0D** | 261.30.780 | 41mm | 0 | - | Extended grip, no positioning |
| **Long 1D** | 261.30.781 | 41mm | 1 | Center | Center alignment |
| **Long 2D** | 261.30.782 | 41mm | 2 | 32mm | System 32 compatible (recommended) |

### 14.7 Installation Mode Comparison

| Feature | DOVETAIL_RAIL | DOVETAIL_DIRECT |
|---------|---------------|-----------------|
| **Rail** | Aluminium 261.30.030 | None (routed groove) |
| **Groove Width** | 12mm | 12mm |
| **Groove Depth** | 10.5mm | 10.5mm |
| **Rail Screws** | Every 200mm | N/A |
| **Min Thickness** | 19mm | 19mm |
| **Strength** | Higher (metal rail) | Standard |
| **Cost** | Higher (rail + sleeves) | Lower (sleeves only) |
| **Removable** | Yes | Yes |
| **Best For** | Heavy-duty shelving | Standard shelving |

### 14.8 Drilling Pattern Diagram

```
SHELF EDGE (Side View):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ╔══════════════════════════════════════════════════════╗    │
│    ║  DOVETAIL GROOVE (12mm W × 10.5mm D)                 ║    │
│    ╚══════════════════════════════════════════════════════╝    │
│         ↑         ↑         ↑         ↑         ↑              │
│       Screw     Screw     Screw     Screw     Screw            │
│       (200mm intervals - RAIL mode only)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

SIDE PANEL (Face View):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  50mm    166mm    166mm    166mm    166mm    166mm    50mm     │
│   ├───────┼────────┼────────┼────────┼────────┼───────┤        │
│   ▣       ▣        ▣        ▣        ▣        ▣       ▣        │
│   │       │        │        │        │        │       │        │
│   └───────┴────────┴────────┴────────┴────────┴───────┘        │
│              ↑ SLEEVE POSITIONS (6 per meter)                  │
│                                                                 │
│              Y = 37mm from front edge (System 32)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

SLEEVE DETAIL (2-Dowel Variant):
┌─────────────────────────────────────┐
│                                     │
│      ●────── 32mm ──────●          │
│     5mm                 5mm         │
│     dia                 dia         │
│                                     │
│   ┌─────────────────────────┐      │
│   │        SLEEVE           │      │ 41mm length
│   │       (261.30.782)      │      │
│   └─────────────────────────┘      │
│                                     │
└─────────────────────────────────────┘
```

### 14.9 Calculation Examples

```typescript
// Example 1: Standard shelf 600mm with Rail System
const shelfPlan = calculateDovetailPlan({
  length: 600,
  thickness: 19,
  system: 'DOVETAIL_RAIL',
  sleeveVariant: 'LONG_2D'
});

console.log('=== Dovetail Plan (600mm Shelf) ===');
console.log('Valid:', shelfPlan.isValid);           // true
console.log('Sleeve Count:', shelfPlan.meta.sleeveCount);  // 4
console.log('Sleeve Positions:', shelfPlan.sleevePositions.map(s => s.x));
// [50, 216.67, 383.33, 550]

console.log('Rail Screws:', shelfPlan.meta.railFixingPoints);
// [150, 300, 450] (every 200mm, distributed)

console.log('Groove:', shelfPlan.meta.grooveSpec);
// { w: 12, d: 10.5, l: 600 }


// Example 2: Long shelf 1200mm with Direct System
const longShelfPlan = calculateDovetailPlan({
  length: 1200,
  thickness: 25,
  system: 'DOVETAIL_DIRECT',
  sleeveVariant: 'SHORT'
});

console.log('\n=== Dovetail Plan (1200mm Shelf) ===');
console.log('Sleeve Count:', longShelfPlan.meta.sleeveCount);  // 8
console.log('Rail Screws:', longShelfPlan.meta.railFixingPoints);
// [] (empty - Direct mode has no rail screws)


// Example 3: Invalid - Too thin
const thinPlan = calculateDovetailPlan({
  length: 600,
  thickness: 16,  // < 19mm minimum!
  system: 'DOVETAIL_RAIL'
});

console.log('\n=== Thin Panel Plan ===');
console.log('Valid:', thinPlan.isValid);  // false
console.log('Min Thickness:', thinPlan.meta.minThickness);  // 19mm


// Example 4: Generate CAM operations
const ops = generateDovetailOps('SHELF-001', {
  length: 600,
  thickness: 19,
  system: 'DOVETAIL_RAIL',
  sleeveVariant: 'LONG_2D'
});

console.log('\n=== CAM Operations ===');
console.log('Total operations:', ops.length);
// 1 groove + 3 rail screws + 8 dowel holes = 12 operations

const grooveOp = ops.find(op => op.type === 'MILL_FULL_SLOT');
console.log('Groove tool:', grooveOp?.params?.toolProfile);
// 'DOVETAIL-CUTTER-12'

const screwOps = ops.filter(op => op.id.includes('rail-screw'));
console.log('Rail screws:', screwOps.length);  // 3

const dowelOps = ops.filter(op => op.id.includes('sleeve'));
console.log('Sleeve dowel holes:', dowelOps.length);  // 8 (4 sleeves × 2 dowels)
```

### 14.10 Technical Reference Table

| Parameter | Value | Unit | Description |
|-----------|-------|------|-------------|
| **Groove Width** | 12 | mm | Dovetail slot width |
| **Groove Depth** | 10.5 | mm | Dovetail slot depth |
| **Min Panel Thickness** | 19 | mm | Minimum shelf thickness |
| **Sleeve Density** | 6 | per meter | Standard sleeve distribution |
| **Screw Interval** | 200 | mm | Rail fixing screw spacing |
| **Edge Margin** | 50 | mm | Distance from shelf edge to first sleeve |
| **System 32 Y** | 37 | mm | Sleeve Y position from front edge |
| **Dowel Diameter** | 5 | mm | Positioning dowel diameter |
| **Dowel Depth** | 5 | mm | Dowel hole depth |
| **Pilot Hole** | 3 | mm | Screw pilot hole diameter |
| **Rail Length** | 3000 | mm | Standard aluminium rail length |

---

## ส่วนที่ 15: Lamello P-System Engine (Architecture v5.5)

ระบบ **Lamello P-System** (Clamex P-14, P-10, Medius) เป็นระบบข้อต่อแบบ T-Slot ที่ให้ความแข็งแรงสูงและถอดประกอบได้ ใช้กลไก Lever Lock ที่ยึดแน่นเพียงหมุนด้วยไขควงปากแบน

### 15.1 Medius Intelligence System

ระบบ Medius ถูกออกแบบมาเพื่อแก้ปัญหา "Back-to-Back Installation" บนแผงกลาง (Center Panel) โดยใช้ความลึกร่องต่างกันทั้งสองด้าน:

```
MEDIUS CONCEPT (Center Panel Back-to-Back):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STANDARD P-14 (Both sides same depth):                        │
│  ─────────────────────────────────────                          │
│                                                                 │
│  ┌─────────┬────────────────────┬─────────┐                    │
│  │ SHELF L │   CENTER PANEL     │ SHELF R │                    │
│  │         │    (16mm thick)    │         │                    │
│  │  ◀───   │   14.7 + 14.7 = 29.4mm       │   ───▶  │                    │
│  │  14.7mm │   ❌ COLLISION!    │  14.7mm │                    │
│  └─────────┴────────────────────┴─────────┘                    │
│                                                                 │
│  MEDIUS P-14/10 (Different depths):                            │
│  ───────────────────────────────────                            │
│                                                                 │
│  ┌─────────┬────────────────────┬─────────┐                    │
│  │ SHELF L │   CENTER PANEL     │ SHELF R │                    │
│  │         │    (16mm thick)    │         │                    │
│  │  ◀───   │   10 + 10 = 20mm  │   ───▶  │                    │
│  │  14.7mm │   ✅ Safe gap!    │  14.7mm │                    │
│  └─────────┴────────────────────┴─────────┘                    │
│                                                                 │
│  Edge (Shelf): 14.7mm depth (Lever side)                       │
│  Face (Center): 10mm depth (Anchor side)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 15.2 Hardware Database

```typescript
// src/services/hardware/hafeleDb.ts

export type SystemType =
  | 'MINIFIX_15' | 'MINIFIX_12' | 'MAXIFIX_35'
  | 'SC_8_60' | 'U_12_10' | 'CC_8_5_30' | 'TOFIX_25'
  | 'LAMELLO_P'      // Lamello P-System
  | 'DOVETAIL_RAIL'
  | 'DOVETAIL_DIRECT';

export type BoardThickness = 12 | 13 | 15 | 16 | 18 | 19 | 22 | 23 | 25 | 26 | 29 | 34;

export interface LamelloItem {
  id: string;
  itemNo: string;
  name: string;
  category: 'CONNECTOR_LAMELLO';
  specs: {
    drillDepth: number;      // Edge groove depth (Lever side)
    faceDepth: number;       // Face groove depth (Anchor side)
    diameter: number;        // T-Slot width (7mm)
    length: number;          // Arc length (66mm / 52mm)
    accessDia: number;       // Access hole diameter (6mm)
    accessDist: number;      // Access hole distance from edge
    minThickness: number;    // Minimum board thickness
    toolProfile: string;     // CNC tool profile code
  };
}

export const LAMELLO_HARDWARE = {
  // =================================================================
  // Clamex P-14 (Standard for >= 16mm panels)
  // =================================================================
  p14: {
    id: 'clamex_p14',
    itemNo: '267.91.136',
    name: 'Lamello Clamex P-14',
    category: 'CONNECTOR_LAMELLO',
    specs: {
      drillDepth: 14.7,    // Edge depth 14.7mm (standard)
      faceDepth: 14.7,     // Face depth same
      diameter: 7,         // T-Slot width 7mm
      length: 66,          // Arc length 66mm
      accessDia: 6,        // Access hole 6mm
      accessDist: 6,       // 6mm from edge
      minThickness: 16,
      toolProfile: 'P-SYSTEM-14'
    }
  } as LamelloItem,

  // =================================================================
  // Clamex P-10 (Thin Panels >= 13mm)
  // =================================================================
  p10: {
    id: 'clamex_p10',
    itemNo: '267.91.130',
    name: 'Lamello Clamex P-10',
    category: 'CONNECTOR_LAMELLO',
    specs: {
      drillDepth: 10,      // Edge depth 10mm
      faceDepth: 10,       // Face depth same
      diameter: 7,
      length: 52,          // Shorter arc (52mm)
      accessDia: 6,
      accessDist: 6,
      minThickness: 13,
      toolProfile: 'P-SYSTEM-10'
    }
  } as LamelloItem,

  // =================================================================
  // Clamex P Medius 14/10 (Center Panel - Back-to-Back)
  // =================================================================
  medius: {
    id: 'clamex_medius',
    itemNo: '267.91.138',
    name: 'Lamello Clamex P Medius 14/10',
    category: 'CONNECTOR_LAMELLO',
    specs: {
      drillDepth: 14.7,    // Edge (Lever side): 14.7mm
      faceDepth: 10,       // Face (Anchor side): 10mm ONLY!
      diameter: 7,
      length: 66,
      accessDia: 6,
      accessDist: 6,
      minThickness: 16,    // Center panel min 16mm
      toolProfile: 'P-SYSTEM-MEDIUS'
    }
  } as LamelloItem
};
```

### 15.3 Lamello Engineering Engine

```typescript
// src/services/engineering/lamelloEngine.ts
import { LAMELLO_HARDWARE, LamelloItem } from '../hardware/hafeleDb';

export interface LamelloPlan {
  isValid: boolean;
  system: 'LAMELLO_P';
  specs: {
    connector: LamelloItem;
  };
  positions: {
    x: number;
    rotationY: number;
  }[];
  meta: {
    edgeGrooveDepth: number;  // Lever side depth
    faceGrooveDepth: number;  // Anchor side depth
    isMedius: boolean;
    slotLength: number;
    accessHole: { dia: number; dist: number };
  };
}

interface LamelloOptions {
  length: number;           // Panel length
  thickness: number;        // Panel thickness
  isCenterPanel?: boolean;  // Flag for center panel (Medius)
}

/**
 * Lamello P-System Joinery Calculator
 *
 * Selection Logic:
 * - Center Panel (back-to-back): Use Medius (Edge=14.7, Face=10)
 * - Standard >= 16mm: Use P-14 (Edge=14.7, Face=14.7)
 * - Thin 13-15mm: Use P-10 (Edge=10, Face=10)
 * - < 13mm: Invalid
 */
export function calculateLamelloPlan(opts: LamelloOptions): LamelloPlan {
  const { length, thickness, isCenterPanel = false } = opts;

  // =================================================================
  // 1. CONNECTOR SELECTION
  // =================================================================
  let connector: LamelloItem;

  if (isCenterPanel) {
    // Center panel: Use Medius for back-to-back installation
    if (thickness < 16) {
      return createInvalidPlan('Center panel requires min 16mm thickness');
    }
    connector = LAMELLO_HARDWARE.medius;
  } else if (thickness >= 16) {
    // Standard thick panel: Use P-14
    connector = LAMELLO_HARDWARE.p14;
  } else if (thickness >= 13) {
    // Thin panel: Use P-10
    connector = LAMELLO_HARDWARE.p10;
  } else {
    // Too thin for Lamello
    return createInvalidPlan('Panel too thin for Lamello (min 13mm)');
  }

  // =================================================================
  // 2. POSITION CALCULATION
  // =================================================================
  const margin = 60; // Lamello needs 50-80mm from edge for tool access
  const positions: LamelloPlan['positions'] = [];

  // Left position
  positions.push({ x: margin, rotationY: 0 });

  // Right position
  positions.push({ x: length - margin, rotationY: Math.PI });

  // Center position (for long panels > 600mm)
  if (length > 600) {
    positions.push({ x: length / 2, rotationY: 0 });
  }

  // Extra positions for very long panels
  if (length > 1200) {
    positions.push({ x: length / 3, rotationY: 0 });
    positions.push({ x: (length / 3) * 2, rotationY: Math.PI });
  }

  return {
    isValid: true,
    system: 'LAMELLO_P',
    specs: { connector },
    positions,
    meta: {
      edgeGrooveDepth: connector.specs.drillDepth,
      faceGrooveDepth: connector.specs.faceDepth,
      isMedius: isCenterPanel,
      slotLength: connector.specs.length,
      accessHole: {
        dia: connector.specs.accessDia,
        dist: connector.specs.accessDist
      }
    }
  };
}

function createInvalidPlan(reason: string): LamelloPlan {
  return {
    isValid: false,
    system: 'LAMELLO_P',
    specs: {} as any,
    positions: [],
    meta: {
      edgeGrooveDepth: 0,
      faceGrooveDepth: 0,
      isMedius: false,
      slotLength: 0,
      accessHole: { dia: 0, dist: 0 }
    }
  };
}
```

### 15.4 CAM Generator for Lamello

```typescript
// src/services/cam/generators/lamelloOp.ts
import { calculateLamelloPlan, LamelloPlan } from '../../engineering/lamelloEngine';

export interface LamelloMachineOp {
  id: string;
  type: 'MILL_T_SLOT' | 'DRILL';
  face: 'EDGE' | 'FACE';
  x: number;
  y: number;
  params?: {
    length: number;
    depth: number;
    width: number;
    toolProfile: string;
  };
  diameter?: number;
  depth?: number;
  hardwareRef: string;
}

/**
 * Generate CNC operations for Lamello P-System
 *
 * Operations per connector:
 * 1. SHELF EDGE: T-Slot milling (Lever side)
 * 2. SHELF FACE: Access hole drilling (6mm)
 * 3. SIDE PANEL FACE: T-Slot milling (Anchor side) - separate function
 */
export function generateLamelloShelfOps(
  partId: string,
  opts: Parameters<typeof calculateLamelloPlan>[0]
): LamelloMachineOp[] {
  const plan = calculateLamelloPlan(opts);
  if (!plan.isValid) return [];

  const ops: LamelloMachineOp[] = [];
  const { connector } = plan.specs;

  plan.positions.forEach((pos, i) => {
    // =================================================================
    // 1. EDGE T-SLOT (Shelf edge - Lever side)
    // =================================================================
    ops.push({
      id: `${partId}-lamello-edge-${i}`,
      type: 'MILL_T_SLOT',
      face: 'EDGE',
      x: pos.x,
      y: 0, // Center of edge thickness
      params: {
        length: connector.specs.length,      // 66mm or 52mm
        depth: connector.specs.drillDepth,   // 14.7mm or 10mm
        width: connector.specs.diameter,     // 7mm
        toolProfile: connector.specs.toolProfile
      },
      hardwareRef: connector.itemNo
    });

    // =================================================================
    // 2. ACCESS HOLE (Shelf face - for screwdriver)
    // =================================================================
    ops.push({
      id: `${partId}-lamello-access-${i}`,
      type: 'DRILL',
      face: 'FACE',
      x: pos.x,
      y: connector.specs.accessDist, // 6mm from edge
      diameter: connector.specs.accessDia,   // 6mm
      depth: connector.specs.drillDepth,     // Through to T-Slot
      hardwareRef: `${connector.itemNo}-ACCESS`
    });
  });

  return ops;
}

/**
 * Generate T-Slot operations for mating panel (Side panel face)
 * Uses faceGrooveDepth which differs for Medius (10mm vs 14.7mm)
 */
export function generateLamelloMatingOps(
  partId: string,
  shelfY: number,  // Y position of shelf on side panel
  plan: LamelloPlan
): LamelloMachineOp[] {
  if (!plan.isValid) return [];

  const ops: LamelloMachineOp[] = [];
  const { connector } = plan.specs;

  plan.positions.forEach((pos, i) => {
    // FACE T-SLOT (Side panel - Anchor side)
    // Note: Uses faceGrooveDepth (10mm for Medius, 14.7mm for standard)
    ops.push({
      id: `${partId}-lamello-face-${i}`,
      type: 'MILL_T_SLOT',
      face: 'FACE',
      x: pos.x,
      y: shelfY,
      params: {
        length: connector.specs.length,
        depth: plan.meta.faceGrooveDepth,  // KEY: Different for Medius!
        width: connector.specs.diameter,
        toolProfile: connector.specs.toolProfile
      },
      hardwareRef: connector.itemNo
    });
  });

  return ops;
}
```

### 15.5 Visual Component

```typescript
// src/components/3d/hardware/LamelloConnector.tsx
import React, { useMemo } from 'react';
import { calculateLamelloPlan } from '../../../services/engineering/lamelloEngine';

const mm = (v: number) => v / 1000;

interface LamelloConnectorProps {
  length: number;
  thickness: number;
  isCenterPanel?: boolean;
}

export const LamelloConnector: React.FC<LamelloConnectorProps> = (props) => {
  const plan = useMemo(() => calculateLamelloPlan(props), [props]);

  if (!plan.isValid) return null;

  const { connector } = plan.specs;

  return (
    <group>
      {plan.positions.map((pos, i) => (
        <group
          key={i}
          position={[mm(pos.x), 0, 0]}
          rotation={[0, pos.rotationY, 0]}
        >
          {/* 1. T-Slot Body (Capsule/Biscuit Shape) */}
          <mesh position={[0, mm(connector.specs.drillDepth / 2), 0]}>
            <boxGeometry args={[
              mm(connector.specs.length),    // 66mm or 52mm
              mm(connector.specs.drillDepth), // 14.7mm or 10mm
              mm(7)                           // 7mm width
            ]} />
            <meshStandardMaterial color="#263238" /> {/* Black plastic */}
          </mesh>

          {/* 2. Zinc Lever (Locking Mechanism) */}
          <mesh position={[0, mm(connector.specs.drillDepth / 2), 0]}>
            <cylinderGeometry args={[mm(4), mm(4), mm(connector.specs.drillDepth), 16]} />
            <meshStandardMaterial color="#B0BEC5" metalness={0.8} roughness={0.3} />
          </mesh>

          {/* 3. Access Hole Indicator (Red marker) */}
          <mesh
            position={[0, mm(connector.specs.accessDist), mm(5)]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[mm(3), mm(3), mm(10), 16]} />
            <meshBasicMaterial color="#EF5350" wireframe transparent opacity={0.7} />
          </mesh>

          {/* 4. Medius Indicator (Green for special depth) */}
          {plan.meta.isMedius && (
            <mesh position={[mm(20), mm(5), 0]}>
              <sphereGeometry args={[mm(3), 8, 8]} />
              <meshBasicMaterial color="#4CAF50" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};
```

### 15.6 Connector Variant Comparison

| Variant | Item No | Edge Depth | Face Depth | Slot Length | Min Thickness | Use Case |
|---------|---------|------------|------------|-------------|---------------|----------|
| **P-14** | 267.91.136 | 14.7mm | 14.7mm | 66mm | 16mm | Standard panels |
| **P-10** | 267.91.130 | 10mm | 10mm | 52mm | 13mm | Thin panels |
| **Medius** | 267.91.138 | 14.7mm | 10mm | 66mm | 16mm | Center panel (back-to-back) |

### 15.7 T-Slot Milling Diagram

```
T-SLOT PROFILE (Cross Section):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    EDGE VIEW (Shelf side - Lever):                             │
│    ────────────────────────────────                             │
│                                                                 │
│    ┌─────────────────────────────────────┐                     │
│    │           SHELF PANEL               │                     │
│    │                                     │                     │
│    │    ╔═════════════════════════╗     │                     │
│    │    ║    T-SLOT GROOVE        ║     │ ← 14.7mm or 10mm    │
│    │    ║    (7mm wide)           ║     │                     │
│    │    ╚═════════════════════════╝     │                     │
│    │              ↑                      │                     │
│    │         66mm / 52mm                 │                     │
│    └──────────────────────────────────────┘                     │
│              │                                                  │
│              │                                                  │
│              ▼                                                  │
│    ┌──────────────────────────────────────┐                    │
│    │         SIDE PANEL (Face)           │                     │
│    │                                      │                     │
│    │    ╔═════════════════════════╗      │                     │
│    │    ║   MATING T-SLOT         ║      │ ← faceDepth        │
│    │    ║   (Anchor side)         ║      │   (10mm for Medius)│
│    │    ╚═════════════════════════╝      │                     │
│    │                                      │                     │
│    └──────────────────────────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

ACCESS HOLE POSITION:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│         SHELF PANEL (Top View):                                │
│         ───────────────────────                                 │
│                                                                 │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │                                                         │ │
│    │    ○ ← Access Hole (6mm dia, 6mm from edge)            │ │
│    │    │                                                    │ │
│    │    │                                                    │ │
│    │    ▼                                                    │ │
│    │   ╔══════════════════════════════════════════╗         │ │
│    │   ║           T-SLOT (66mm long)             ║ ← EDGE  │ │
│    │   ╚══════════════════════════════════════════╝         │ │
│    │                                                         │ │
│    └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│    Access hole allows screwdriver to rotate the lever          │
│    and lock the connector                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 15.8 Position Layout

```
LAMELLO POSITION DISTRIBUTION:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Short Panel (≤600mm): 2 connectors                            │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  60mm                                          60mm   │     │
│  │   ├──┐                                      ┌──┤      │     │
│  │   ◆  │                                      │  ◆      │     │
│  │      │          SHELF (600mm)               │         │     │
│  │      │                                      │         │     │
│  └──────┴──────────────────────────────────────┴─────────┘     │
│                                                                 │
│  Medium Panel (600-1200mm): 3 connectors                       │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  60mm              center                     60mm    │     │
│  │   ├──┐               ◆                     ┌──┤       │     │
│  │   ◆  │                                     │  ◆       │     │
│  │      │           SHELF (900mm)             │          │     │
│  └──────┴──────────────────────────────────────┴─────────┘     │
│                                                                 │
│  Long Panel (>1200mm): 5 connectors                            │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  60mm    1/3       center       2/3          60mm     │     │
│  │   ├──┐    ◆          ◆          ◆         ┌──┤        │     │
│  │   ◆  │                                    │  ◆        │     │
│  │      │          SHELF (1500mm)            │           │     │
│  └──────┴──────────────────────────────────────┴─────────┘     │
│                                                                 │
│  ◆ = Lamello P-System connector                                │
│  Margin: 60mm from edge (tool access requirement)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 15.9 Calculation Examples

```typescript
// Example 1: Standard shelf on 18mm panel
const standardPlan = calculateLamelloPlan({
  length: 800,
  thickness: 18,
  isCenterPanel: false
});

console.log('=== Standard Shelf Plan ===');
console.log('Valid:', standardPlan.isValid);           // true
console.log('Connector:', standardPlan.specs.connector.name);
// 'Lamello Clamex P-14'
console.log('Edge Depth:', standardPlan.meta.edgeGrooveDepth);  // 14.7mm
console.log('Face Depth:', standardPlan.meta.faceGrooveDepth);  // 14.7mm
console.log('Is Medius:', standardPlan.meta.isMedius);          // false
console.log('Positions:', standardPlan.positions.length);       // 3 (>600mm)


// Example 2: Center panel (back-to-back)
const centerPanelPlan = calculateLamelloPlan({
  length: 600,
  thickness: 16,
  isCenterPanel: true  // KEY: Triggers Medius selection
});

console.log('\n=== Center Panel Plan (Medius) ===');
console.log('Connector:', centerPanelPlan.specs.connector.name);
// 'Lamello Clamex P Medius 14/10'
console.log('Edge Depth:', centerPanelPlan.meta.edgeGrooveDepth);  // 14.7mm
console.log('Face Depth:', centerPanelPlan.meta.faceGrooveDepth);  // 10mm (DIFFERENT!)
console.log('Is Medius:', centerPanelPlan.meta.isMedius);          // true


// Example 3: Thin panel (13mm)
const thinPanelPlan = calculateLamelloPlan({
  length: 500,
  thickness: 13,
  isCenterPanel: false
});

console.log('\n=== Thin Panel Plan ===');
console.log('Connector:', thinPanelPlan.specs.connector.name);
// 'Lamello Clamex P-10'
console.log('Slot Length:', thinPanelPlan.meta.slotLength);  // 52mm (shorter)
console.log('Edge Depth:', thinPanelPlan.meta.edgeGrooveDepth);  // 10mm


// Example 4: Too thin (invalid)
const invalidPlan = calculateLamelloPlan({
  length: 500,
  thickness: 12,  // < 13mm minimum!
  isCenterPanel: false
});

console.log('\n=== Invalid Plan ===');
console.log('Valid:', invalidPlan.isValid);  // false


// Example 5: Generate CAM operations
const shelfOps = generateLamelloShelfOps('SHELF-001', {
  length: 800,
  thickness: 18
});

console.log('\n=== CAM Operations ===');
console.log('Total shelf ops:', shelfOps.length);  // 6 (3 positions × 2 ops)

const tSlotOps = shelfOps.filter(op => op.type === 'MILL_T_SLOT');
console.log('T-Slot operations:', tSlotOps.length);  // 3

const accessOps = shelfOps.filter(op => op.type === 'DRILL');
console.log('Access hole operations:', accessOps.length);  // 3
console.log('Access hole diameter:', accessOps[0].diameter);  // 6mm


// Example 6: Generate mating panel operations (Side panel)
const matingOps = generateLamelloMatingOps('SIDE-001', 300, standardPlan);

console.log('\n=== Mating Panel Operations ===');
console.log('Face T-Slot ops:', matingOps.length);  // 3
console.log('Face depth:', matingOps[0].params?.depth);  // 14.7mm (or 10mm for Medius)
```

### 15.10 Technical Reference Table

| Parameter | P-14 | P-10 | Medius | Unit | Description |
|-----------|------|------|--------|------|-------------|
| **Edge Groove Depth** | 14.7 | 10 | 14.7 | mm | Lever side depth |
| **Face Groove Depth** | 14.7 | 10 | 10 | mm | Anchor side depth |
| **Slot Width** | 7 | 7 | 7 | mm | T-Slot width |
| **Slot Length** | 66 | 52 | 66 | mm | Arc length |
| **Access Hole Dia** | 6 | 6 | 6 | mm | Screwdriver access |
| **Access Hole Dist** | 6 | 6 | 6 | mm | Distance from edge |
| **Min Thickness** | 16 | 13 | 16 | mm | Minimum panel thickness |
| **Tool Profile** | P-SYSTEM-14 | P-SYSTEM-10 | P-SYSTEM-MEDIUS | - | CNC cutter code |
| **Edge Margin** | 60 | 60 | 60 | mm | Min distance from panel edge |

### 15.11 CNC Tool Requirements

| Tool | Description | Use |
|------|-------------|-----|
| **Lamello Zeta P2** | Dedicated handheld P-System cutter | Manual/Semi-auto |
| **T-Slot Cutter 7mm** | CNC router bit for T-Slot | CNC machining |
| **6mm Drill Bit** | Standard drill for access hole | CNC/Manual |
| **Flathead Screwdriver** | For lever rotation | Assembly |

---

## ส่วนที่ 16: Ixconnect & Tofix System Engine (Architecture v5.0)

ระบบ **Ixconnect** (SC, U, CC) และ **Tofix** เป็นข้อต่อแบบ One-Piece และ Semi-Concealed ที่รองรับงานที่ซับซ้อนกว่า Minifix ทั่วไป โดยมีคุณสมบัติ Advanced Drilling Logic ที่ต้องเจาะ 2 แกนในจุดเดียว

### 16.1 Advanced Drilling Logic

ระบบนี้รองรับการเจาะหลายแบบที่ซับซ้อน:

```
MULTI-AXIS BORING CONCEPT:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STANDARD MINIFIX (Single Axis per Part):                      │
│  ──────────────────────────────────────                         │
│                                                                 │
│  SIDE PANEL:        SHELF:                                      │
│  ┌─────────┐        ┌─────────────────┐                        │
│  │    ○    │        │        │        │                        │
│  │  Face   │        │   Edge Only     │                        │
│  │  Only   │        │        ↓        │                        │
│  └─────────┘        └─────────────────┘                        │
│                                                                 │
│  IXCONNECT SC/U (Dual Axis - Same Part):                       │
│  ────────────────────────────────────────                       │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │           SHELF PANEL               │                       │
│  │                                      │                       │
│  │    ○ ←── Access Hole (Face)         │ ← 6mm @ distB        │
│  │    │     at 25mm or 45mm            │                       │
│  │    │                                 │                       │
│  │    ▼                                 │                       │
│  │   ══════════════════════════ ← Edge │ ← 8mm or 12mm        │
│  │   Connector Body (60mm deep)        │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  TOFIX (Dynamic Formula):                                       │
│  ────────────────────────                                       │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │           SIDE PANEL                │                       │
│  │                                      │                       │
│  │         ┌───────┐ ← Housing 25mm    │                       │
│  │         │   ○   │   @ A position    │                       │
│  │         └───────┘                    │                       │
│  │              ↑                       │                       │
│  │    A = TopThickness - 1.5mm         │ ← Dynamic!           │
│  │              │                       │                       │
│  │   ═══════════╪══════════════ ← Edge │ ← Neck 7mm           │
│  │              │                       │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 16.2 Hardware Database

```typescript
// src/services/hardware/hafeleDb.ts

export type SystemType =
  | 'MINIFIX_15' | 'MINIFIX_12' | 'MAXIFIX_35'
  | 'SC_8_60'    // Ixconnect One-piece (8mm)
  | 'U_12_10'    // Ixconnect Heavy Duty (12mm)
  | 'CC_8_5_30'  // Claw Connector (Drawer)
  | 'TOFIX_25'   // Tofix (Semi-concealed)
  | 'LAMELLO_P'
  | 'DOVETAIL_RAIL'
  | 'DOVETAIL_DIRECT';

export type BoardThickness = 12 | 13 | 15 | 16 | 18 | 19 | 22 | 23 | 25 | 26 | 29 | 34;

export interface IxconnectItem {
  id: string;
  itemNo: string;
  name: string;
  category: 'CONNECTOR_ONE_PIECE' | 'HOUSING_TOFIX' | 'BOLT';
  specs: {
    drillDepth: number;      // Edge drill depth
    diameter: number;        // Edge drill diameter
    distB?: number;          // Access hole distance from edge
    accessDia?: number;      // Access hole diameter
    matingDia?: number;      // Mating panel drill diameter
    neckDia?: number;        // Neck drill diameter (Tofix)
    length?: number;         // Connector length
  };
}

export const IXCONNECT_HARDWARE = {
  // =================================================================
  // IXCONNECT SC 8/60 (One-Piece Connector)
  // =================================================================
  sc_8_60: {
    id: 'sc_8_60',
    itemNo: '262.11.117',
    name: 'Ixconnect SC 8/60 (Red/Grey)',
    category: 'CONNECTOR_ONE_PIECE',
    specs: {
      diameter: 8,        // Edge drill 8mm
      drillDepth: 60,     // Edge depth 60mm (55mm body + margin)
      accessDia: 6,       // Face access hole 6mm
      distB: 25,          // Access hole 25mm from edge
      matingDia: 8        // Mating panel 8mm
    }
  } as IxconnectItem,

  // =================================================================
  // IXCONNECT U 12/10 (Heavy Duty Spreading)
  // =================================================================
  u_12_10: {
    id: 'u_12_10',
    itemNo: '262.11.600',
    name: 'Ixconnect U 12/10 Spreading',
    category: 'CONNECTOR_ONE_PIECE',
    specs: {
      diameter: 12,       // Edge drill 12mm
      drillDepth: 55,     // Edge depth 55mm (54mm body + margin)
      accessDia: 6,       // Face access hole 6mm
      distB: 45,          // Access hole 45mm from edge
      matingDia: 10       // Mating panel 10mm
    }
  } as IxconnectItem,

  // =================================================================
  // IXCONNECT CC 8/5/30 Claw (Drawer Connector)
  // =================================================================
  cc_8_5_30: {
    id: 'cc_8_5_30',
    itemNo: '262.11.113',
    name: 'Ixconnect CC 8/5/30 Claw',
    category: 'CONNECTOR_ONE_PIECE',
    specs: {
      diameter: 5,        // Edge drill 5mm (drawer side)
      drillDepth: 30,     // Edge depth 30mm
      matingDia: 8,       // Face drill 8mm (drawer front)
      distB: 30           // Installation distance
    }
  } as IxconnectItem
};

export const TOFIX_HARDWARE = {
  // =================================================================
  // TOFIX Housing 25mm
  // =================================================================
  housing_25: {
    id: 'tofix_25',
    itemNo: '261.95.704',
    name: 'Tofix Housing 25mm (White)',
    category: 'HOUSING_TOFIX',
    specs: {
      diameter: 25,       // Face drill 25mm
      drillDepth: 12.5,   // Housing depth
      neckDia: 7          // Edge neck drill 7mm
    }
  } as IxconnectItem,

  // =================================================================
  // TOFIX Bolt
  // =================================================================
  bolt_std: {
    id: 'tofix_bolt',
    itemNo: '261.95.010',
    name: 'Tofix Bolt',
    category: 'BOLT',
    specs: {
      diameter: 5,
      drillDepth: 11
    }
  } as IxconnectItem
};
```

### 16.3 Ixconnect & Tofix Engineering Engine

```typescript
// src/services/engineering/ixconnectEngine.ts
import {
  IXCONNECT_HARDWARE,
  TOFIX_HARDWARE,
  IxconnectItem
} from '../hardware/hafeleDb';

export type IxconnectSystem = 'SC_8_60' | 'U_12_10' | 'CC_8_5_30' | 'TOFIX_25';

export interface IxconnectPlan {
  isValid: boolean;
  system: IxconnectSystem;
  specs: {
    main: IxconnectItem;
    mating?: IxconnectItem;
  };
  positions: {
    x: number;
    yOffset: number;      // Access hole or Housing Y position
    rotationY: number;
    dowelOffsets: number[];
  }[];
  meta: {
    edgeDrill: { dia: number; depth: number };
    faceDrill: { dia: number; depth: number; distB: number };
    useDowels: boolean;
    formula?: string;     // For Tofix: "A = TopThickness - 1.5"
  };
}

interface IxconnectOptions {
  length: number;
  thickness: number;        // Panel thickness
  targetThickness?: number; // Target panel thickness (for Tofix)
  system: IxconnectSystem;
}

/**
 * Ixconnect & Tofix Joinery Calculator
 *
 * Key Features:
 * - SC 8/60: Edge 8mm + Face Access 6mm @ 25mm
 * - U 12/10: Edge 12mm + Face Access 6mm @ 45mm
 * - CC 8/5/30: Edge 5mm (Drawer, no dowels)
 * - TOFIX: Housing 25mm + Neck 7mm with dynamic formula
 */
export function calculateIxconnectPlan(opts: IxconnectOptions): IxconnectPlan {
  const { length, thickness, targetThickness = 19, system } = opts;

  let main: IxconnectItem;
  let mating: IxconnectItem | undefined;
  let yOffset = 0;
  let margin = 50;
  let useDowels = true;
  let formula: string | undefined;

  // =================================================================
  // SYSTEM SELECTION
  // =================================================================
  switch (system) {
    case 'SC_8_60':
      main = IXCONNECT_HARDWARE.sc_8_60;
      yOffset = main.specs.distB!;  // 25mm
      break;

    case 'U_12_10':
      main = IXCONNECT_HARDWARE.u_12_10;
      yOffset = main.specs.distB!;  // 45mm
      break;

    case 'CC_8_5_30':
      main = IXCONNECT_HARDWARE.cc_8_5_30;
      yOffset = main.specs.distB!;  // 30mm
      useDowels = false;  // Claw doesn't use dowels
      margin = 32;        // Drawer standard margin
      break;

    case 'TOFIX_25':
      main = TOFIX_HARDWARE.housing_25;
      mating = TOFIX_HARDWARE.bolt_std;
      // TOFIX FORMULA: A = B - 9 + 7.5 = TargetThickness - 1.5
      yOffset = targetThickness - 1.5;
      formula = `A = ${targetThickness} - 1.5 = ${yOffset}mm`;
      break;

    default:
      return createInvalidPlan(system, 'Unknown system');
  }

  // =================================================================
  // POSITION CALCULATION
  // =================================================================
  const positions: IxconnectPlan['positions'] = [];
  const dowelOffsets = useDowels ? [32] : [];

  // Left position
  positions.push({
    x: margin,
    yOffset,
    rotationY: 0,
    dowelOffsets
  });

  // Right position
  positions.push({
    x: length - margin,
    yOffset,
    rotationY: Math.PI,
    dowelOffsets
  });

  // Center position (for long panels > 600mm, not for Claw)
  if (length > 600 && system !== 'CC_8_5_30') {
    positions.push({
      x: length / 2,
      yOffset,
      rotationY: 0,
      dowelOffsets: useDowels ? [-32, 32] : []
    });
  }

  // =================================================================
  // BUILD META
  // =================================================================
  let faceDrill = { dia: 0, depth: 0, distB: 0 };

  if (system === 'TOFIX_25') {
    faceDrill = {
      dia: main.specs.diameter,    // 25mm
      depth: main.specs.drillDepth, // 12.5mm
      distB: yOffset
    };
  } else if (main.specs.accessDia) {
    faceDrill = {
      dia: main.specs.accessDia,   // 6mm
      depth: 14,                    // Through to edge drill
      distB: main.specs.distB!
    };
  }

  return {
    isValid: true,
    system,
    specs: { main, mating },
    positions,
    meta: {
      edgeDrill: {
        dia: system === 'TOFIX_25' ? main.specs.neckDia! : main.specs.diameter,
        depth: system === 'TOFIX_25' ? yOffset + 13 : main.specs.drillDepth
      },
      faceDrill,
      useDowels,
      formula
    }
  };
}

function createInvalidPlan(system: IxconnectSystem, reason: string): IxconnectPlan {
  return {
    isValid: false,
    system,
    specs: {} as any,
    positions: [],
    meta: {
      edgeDrill: { dia: 0, depth: 0 },
      faceDrill: { dia: 0, depth: 0, distB: 0 },
      useDowels: false
    }
  };
}
```

### 16.4 CAM Generator for Ixconnect & Tofix

```typescript
// src/services/cam/generators/ixconnectOp.ts
import { calculateIxconnectPlan, IxconnectPlan } from '../../engineering/ixconnectEngine';

export interface IxconnectMachineOp {
  id: string;
  type: 'DRILL';
  face: 'EDGE' | 'FACE';
  x: number;
  y: number;
  diameter: number;
  depth: number;
  hardwareRef: string;
}

/**
 * Generate CNC operations for Ixconnect and Tofix systems
 *
 * Operations per connector:
 * - SC/U: Edge drill (8/12mm) + Face access hole (6mm)
 * - CC: Edge drill (5mm) only
 * - TOFIX: Face housing (25mm) + Edge neck (7mm)
 */
export function generateIxconnectOps(
  partId: string,
  opts: Parameters<typeof calculateIxconnectPlan>[0]
): IxconnectMachineOp[] {
  const plan = calculateIxconnectPlan(opts);
  if (!plan.isValid) return [];

  const ops: IxconnectMachineOp[] = [];
  const { main, mating } = plan.specs;

  plan.positions.forEach((pos, i) => {
    const { system } = plan;

    // =================================================================
    // IXCONNECT SC/U/CC - One-Piece Connectors
    // =================================================================
    if (system === 'SC_8_60' || system === 'U_12_10' || system === 'CC_8_5_30') {

      // 1. EDGE DRILL (Connector body)
      ops.push({
        id: `${partId}-conn-edge-${i}`,
        type: 'DRILL',
        face: 'EDGE',
        x: pos.x,
        y: 0,
        diameter: plan.meta.edgeDrill.dia,
        depth: plan.meta.edgeDrill.depth,
        hardwareRef: main.itemNo
      });

      // 2. FACE DRILL (Access hole) - Only for SC and U
      if (plan.meta.faceDrill.dia > 0 && system !== 'CC_8_5_30') {
        ops.push({
          id: `${partId}-access-face-${i}`,
          type: 'DRILL',
          face: 'FACE',
          x: pos.x,
          y: plan.meta.faceDrill.distB,
          diameter: plan.meta.faceDrill.dia,
          depth: plan.meta.faceDrill.depth,
          hardwareRef: `${main.itemNo}-ACCESS`
        });
      }
    }

    // =================================================================
    // TOFIX SYSTEM
    // =================================================================
    else if (system === 'TOFIX_25') {

      // 1. FACE DRILL (Housing 25mm)
      ops.push({
        id: `${partId}-tofix-house-${i}`,
        type: 'DRILL',
        face: 'FACE',
        x: pos.x,
        y: pos.yOffset,  // Calculated from formula
        diameter: plan.meta.faceDrill.dia,
        depth: plan.meta.faceDrill.depth,
        hardwareRef: main.itemNo
      });

      // 2. EDGE DRILL (Neck for bolt access)
      ops.push({
        id: `${partId}-tofix-neck-${i}`,
        type: 'DRILL',
        face: 'EDGE',
        x: pos.x,
        y: 0,
        diameter: plan.meta.edgeDrill.dia,   // 7mm
        depth: plan.meta.edgeDrill.depth,    // yOffset + 13mm
        hardwareRef: main.itemNo
      });
    }

    // =================================================================
    // DOWELS (Common)
    // =================================================================
    if (plan.meta.useDowels) {
      pos.dowelOffsets.forEach((off, j) => {
        const xPos = pos.rotationY ? pos.x - off : pos.x + off;
        ops.push({
          id: `${partId}-dowel-${i}-${j}`,
          type: 'DRILL',
          face: 'EDGE',
          x: xPos,
          y: 0,
          diameter: 8,
          depth: 30,
          hardwareRef: 'DOWEL-8x30'
        });
      });
    }
  });

  return ops;
}
```

### 16.5 Visual Component

```typescript
// src/components/3d/hardware/IxconnectConnector.tsx
import React, { useMemo } from 'react';
import { calculateIxconnectPlan } from '../../../services/engineering/ixconnectEngine';

const mm = (v: number) => v / 1000;

interface IxconnectConnectorProps {
  length: number;
  thickness: number;
  targetThickness?: number;
  system: 'SC_8_60' | 'U_12_10' | 'CC_8_5_30' | 'TOFIX_25';
}

export const IxconnectConnector: React.FC<IxconnectConnectorProps> = (props) => {
  const plan = useMemo(() => calculateIxconnectPlan(props), [props]);

  if (!plan.isValid) return null;

  const { main } = plan.specs;
  const { system } = plan;

  return (
    <group>
      {plan.positions.map((pos, i) => (
        <group
          key={i}
          position={[mm(pos.x), 0, 0]}
          rotation={[0, pos.rotationY, 0]}
        >
          {/* SC 8/60 - Red/Grey connector */}
          {system === 'SC_8_60' && (
            <group>
              {/* Body in edge */}
              <mesh position={[0, mm(plan.meta.edgeDrill.depth / 2), 0]}>
                <cylinderGeometry args={[
                  mm(plan.meta.edgeDrill.dia / 2),
                  mm(plan.meta.edgeDrill.dia / 2),
                  mm(plan.meta.edgeDrill.depth),
                  16
                ]} />
                <meshStandardMaterial color="#D32F2F" />
              </mesh>
              {/* Access hole marker */}
              <mesh
                position={[0, mm(plan.meta.faceDrill.distB), mm(5)]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[mm(3), mm(3), mm(10), 16]} />
                <meshBasicMaterial color="#222" wireframe />
              </mesh>
            </group>
          )}

          {/* U 12/10 - Grey heavy duty connector */}
          {system === 'U_12_10' && (
            <group>
              <mesh position={[0, mm(plan.meta.edgeDrill.depth / 2), 0]}>
                <cylinderGeometry args={[
                  mm(plan.meta.edgeDrill.dia / 2),
                  mm(plan.meta.edgeDrill.dia / 2),
                  mm(plan.meta.edgeDrill.depth),
                  16
                ]} />
                <meshStandardMaterial color="#90A4AE" />
              </mesh>
              <mesh
                position={[0, mm(plan.meta.faceDrill.distB), mm(5)]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[mm(3), mm(3), mm(10), 16]} />
                <meshBasicMaterial color="#222" wireframe />
              </mesh>
            </group>
          )}

          {/* CC 8/5/30 - Claw for drawer */}
          {system === 'CC_8_5_30' && (
            <mesh position={[0, mm(15), 0]}>
              <boxGeometry args={[mm(5), mm(30), mm(12)]} />
              <meshStandardMaterial color="#C0C0C0" metalness={0.6} />
            </mesh>
          )}

          {/* TOFIX - Housing */}
          {system === 'TOFIX_25' && (
            <group
              position={[0, mm(pos.yOffset), 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <mesh>
                <cylinderGeometry args={[mm(12.5), mm(12.5), mm(12.5), 32]} />
                <meshStandardMaterial color="#FFFFFF" />
              </mesh>
              {/* Cap */}
              <mesh position={[0, mm(6.1), 0]}>
                <boxGeometry args={[mm(20), mm(1), mm(5)]} />
                <meshBasicMaterial color="#795548" />
              </mesh>
            </group>
          )}

          {/* Dowels */}
          {pos.dowelOffsets.map((off, j) => (
            <group key={j} position={[mm(off), 0, 0]}>
              <mesh position={[0, mm(15), 0]}>
                <cylinderGeometry args={[mm(4), mm(4), mm(30), 16]} />
                <meshStandardMaterial color="#D7CCC8" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
};
```

### 16.6 System Comparison Table

| Feature | SC 8/60 | U 12/10 | CC 8/5/30 | TOFIX 25 |
|---------|---------|---------|-----------|----------|
| **Item No** | 262.11.117 | 262.11.600 | 262.11.113 | 261.95.704 |
| **Edge Drill** | 8mm × 60mm | 12mm × 55mm | 5mm × 30mm | 7mm × (A+13)mm |
| **Face Drill** | 6mm @ 25mm | 6mm @ 45mm | None | 25mm @ A |
| **Access Dist** | 25mm | 45mm | 30mm | Formula |
| **Use Dowels** | Yes | Yes | No | Yes |
| **Use Case** | Standard | Heavy Duty | Drawer | Top Mount |
| **Color** | Red/Grey | Grey | Silver | White |

### 16.7 Drilling Pattern Diagrams

```
IXCONNECT SC 8/60 (Dual-Axis Drilling):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SHELF PANEL (Top View):                                       │
│  ──────────────────────                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │    ○ ←── Access Hole (6mm dia)                         │   │
│  │    │     25mm from edge                                 │   │
│  │    │                                                    │   │
│  │    ▼                                                    │   │
│  │   ════════════════════════════════════════════ ← EDGE  │   │
│  │   │         Edge Drill: 8mm × 60mm deep                │   │
│  │   ▼                                                    │   │
│  │   ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●  │   │
│  │           Connector Body (55mm)                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ● = Access hole connects to edge drill for screwdriver        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

IXCONNECT U 12/10 (Heavy Duty):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Same concept but:                                              │
│  - Edge: 12mm × 55mm                                           │
│  - Access: 6mm @ 45mm from edge                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                                                         │   │
│  │    ○ ←── 45mm from edge (larger spread for HD)         │   │
│  │    │                                                    │   │
│  │    ▼                                                    │   │
│  │   ════════════════════════════════════════════ ← EDGE  │   │
│  │   │         Edge Drill: 12mm × 55mm deep               │   │
│  │   ▼                                                    │   │
│  │   ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

TOFIX 25 (Dynamic Formula):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SIDE PANEL (Cross Section):                                   │
│  ───────────────────────────                                    │
│                                                                 │
│       TOP PANEL (Thickness = B)                                │
│       ┌────────────────────────────────┐                       │
│       │         ● ← Bolt              │                        │
│       │         │   (5mm × 11mm)       │                        │
│       └─────────┼──────────────────────┘                        │
│                 │                                               │
│  A = B - 1.5mm  │ ← Formula!                                   │
│                 │                                               │
│  SIDE   ┌───────┼───────┐                                      │
│  PANEL  │       │       │                                      │
│         │   ┌───▼───┐   │ ← Housing 25mm @ position A          │
│         │   │   ○   │   │                                      │
│         │   └───────┘   │                                      │
│         │               │                                      │
│   EDGE ═╪═══════════════╪══                                     │
│         │               │                                      │
│         │   ↑           │                                      │
│         │   Neck 7mm    │ ← Depth = A + 13mm                   │
│         │   (for bolt)  │                                      │
│         └───────────────┘                                      │
│                                                                 │
│  Example: If TopThickness = 19mm                               │
│           A = 19 - 1.5 = 17.5mm                                │
│           Neck depth = 17.5 + 13 = 30.5mm                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

IXCONNECT CC 8/5/30 (Drawer Claw):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  DRAWER SIDE (Edge View):                                      │
│  ────────────────────────                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │   DRAWER SIDE PANEL                                     │   │
│  │                                                         │   │
│  │   ════════════════════════════════════════════ ← EDGE  │   │
│  │   │         Edge Drill: 5mm × 30mm                     │   │
│  │   ▼                                                    │   │
│  │   ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●                     │   │
│  │           Claw Connector                               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  - No face drilling required                                    │
│  - No dowels (Claw self-aligns)                                │
│  - Margin: 32mm (drawer standard)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 16.8 Calculation Examples

```typescript
// Example 1: Standard shelf with SC 8/60
const scPlan = calculateIxconnectPlan({
  length: 800,
  thickness: 18,
  system: 'SC_8_60'
});

console.log('=== SC 8/60 Plan ===');
console.log('Valid:', scPlan.isValid);              // true
console.log('Connector:', scPlan.specs.main.name);  // 'Ixconnect SC 8/60'
console.log('Edge Drill:', scPlan.meta.edgeDrill);  // { dia: 8, depth: 60 }
console.log('Face Drill:', scPlan.meta.faceDrill);  // { dia: 6, depth: 14, distB: 25 }
console.log('Positions:', scPlan.positions.length); // 3 (>600mm)
console.log('Uses Dowels:', scPlan.meta.useDowels); // true


// Example 2: Heavy duty with U 12/10
const uPlan = calculateIxconnectPlan({
  length: 600,
  thickness: 18,
  system: 'U_12_10'
});

console.log('\n=== U 12/10 Plan ===');
console.log('Edge Drill:', uPlan.meta.edgeDrill);  // { dia: 12, depth: 55 }
console.log('Access Dist:', uPlan.meta.faceDrill.distB);  // 45mm


// Example 3: Drawer with Claw CC
const clawPlan = calculateIxconnectPlan({
  length: 400,
  thickness: 16,
  system: 'CC_8_5_30'
});

console.log('\n=== CC Claw Plan ===');
console.log('Edge Drill:', clawPlan.meta.edgeDrill);  // { dia: 5, depth: 30 }
console.log('Uses Dowels:', clawPlan.meta.useDowels); // false
console.log('Positions:', clawPlan.positions.length); // 2 (drawer margin 32mm)


// Example 4: Tofix with dynamic formula
const tofixPlan = calculateIxconnectPlan({
  length: 600,
  thickness: 18,
  targetThickness: 25,  // Top panel is 25mm thick
  system: 'TOFIX_25'
});

console.log('\n=== TOFIX 25 Plan ===');
console.log('Formula:', tofixPlan.meta.formula);
// 'A = 25 - 1.5 = 23.5mm'
console.log('Housing Y:', tofixPlan.positions[0].yOffset);  // 23.5mm
console.log('Face Drill:', tofixPlan.meta.faceDrill);
// { dia: 25, depth: 12.5, distB: 23.5 }
console.log('Edge (Neck):', tofixPlan.meta.edgeDrill);
// { dia: 7, depth: 36.5 } (23.5 + 13)


// Example 5: Generate CAM operations
const ops = generateIxconnectOps('SHELF-001', {
  length: 800,
  thickness: 18,
  system: 'SC_8_60'
});

console.log('\n=== CAM Operations ===');
console.log('Total ops:', ops.length);
// 3 connectors × (1 edge + 1 face + 1 dowel) = 9 ops

const edgeOps = ops.filter(op => op.face === 'EDGE' && !op.id.includes('dowel'));
console.log('Edge drills:', edgeOps.length);  // 3
console.log('Edge dia:', edgeOps[0].diameter); // 8mm

const faceOps = ops.filter(op => op.face === 'FACE');
console.log('Face drills:', faceOps.length);  // 3
console.log('Face Y pos:', faceOps[0].y);     // 25mm
```

### 16.9 Technical Reference Table

| Parameter | SC 8/60 | U 12/10 | CC 8/5/30 | TOFIX 25 | Unit |
|-----------|---------|---------|-----------|----------|------|
| **Edge Diameter** | 8 | 12 | 5 | 7 | mm |
| **Edge Depth** | 60 | 55 | 30 | A+13 | mm |
| **Face Diameter** | 6 | 6 | - | 25 | mm |
| **Face Depth** | 14 | 14 | - | 12.5 | mm |
| **Distance B** | 25 | 45 | 30 | A | mm |
| **Mating Drill** | 8 | 10 | 8 | 5 | mm |
| **Dowel Offset** | 32 | 32 | - | 32 | mm |
| **Edge Margin** | 50 | 50 | 32 | 50 | mm |

### 16.10 Tofix Formula Reference

```
TOFIX DRILLING DIMENSION FORMULA:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Given:                                                         │
│  - B = Top Panel Thickness (targetThickness)                   │
│  - Housing position from catalog = B - 9 + 7.5                 │
│                                                                 │
│  Simplified:                                                    │
│  ┌─────────────────────────────────────┐                       │
│  │                                     │                       │
│  │   A = B - 1.5 mm                    │                       │
│  │                                     │                       │
│  │   Neck Depth = A + 13 mm            │                       │
│  │                                     │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  Examples:                                                      │
│  ┌────────────────┬─────────┬──────────────┐                   │
│  │ Top Thickness  │    A    │  Neck Depth  │                   │
│  ├────────────────┼─────────┼──────────────┤                   │
│  │     16mm       │ 14.5mm  │   27.5mm     │                   │
│  │     18mm       │ 16.5mm  │   29.5mm     │                   │
│  │     19mm       │ 17.5mm  │   30.5mm     │                   │
│  │     22mm       │ 20.5mm  │   33.5mm     │                   │
│  │     25mm       │ 23.5mm  │   36.5mm     │                   │
│  └────────────────┴─────────┴──────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ส่วนที่ 17: Master Joinery System Engine (Architecture v4.5)

ระบบ **Master Joinery** รวมข้อมูลจาก Häfele Catalog ทั้ง 17 หน้า ครอบคลุม Minifix 12/15, Maxifix 35, S100/S200/S300 Bolts, Mitre Joints, Double-ended Bolts และ Dowels

**Key Features:**
- **Correct Engineering Logic**: แยกแยะระหว่าง Distance B (ระยะเจาะจากขอบ) และ Distance A (ระยะกึ่งกลางความหนา)
- **Auto-Selection**: เลือก CAM อัตโนมัติตามความหนาไม้
- **Mitre Intelligence**: คำนวณ Inset F ตามตารางองศา พร้อมลบ 20mm เมื่อใช้ B=24

### 17.1 Master Hardware Database

```typescript
// src/services/hardware/hafeleDb.ts

/**
 * Master Hardware Database for Minifix/Maxifix Joinery Systems
 * Architecture v4.5 - Complete Catalog Integration
 *
 * Critical Distinction:
 * - Distance A (distA): ระยะกึ่งกลางความหนาไม้ - ใช้ตรวจสอบรุ่น CAM
 * - Distance B (distB): ระยะเจาะจากขอบ - ใช้กำหนดตำแหน่งเจาะ Cam Housing บนหน้าบาน
 */

export type SystemType = 'MINIFIX_15' | 'MINIFIX_12' | 'MAXIFIX_35';
export type BoardThickness = 12 | 13 | 15 | 16 | 18 | 19 | 23 | 26 | 29 | 34;
export type JointAngle = 90 | 100 | 110 | 120 | 130 | 135 | 140 | 150 | 160 | 170 | 180;

export interface HardwareItem {
  id: string;
  itemNo: string;       // รหัสสินค้าจริง (BOM)
  name: string;
  category: 'CAM' | 'BOLT' | 'DOWEL' | 'SLEEVE' | 'CAP';
  specs: {
    drillDepth: number;     // ความลึกเจาะ (D)
    diameter: number;       // ขนาดดอกสว่าน (mm)
    distA?: number;         // ระยะกึ่งกลางความหนาไม้ (A) - ใช้ตรวจสอบความหนา
    distB?: number;         // ระยะเจาะจากขอบ (B) - ใช้กำหนดตำแหน่งเจาะ Cam
    length?: number;        // ความยาวตัวสินค้า
    housingDia?: number;    // ขนาดเบ้า Cam (12/15/35)
    thread?: string;        // ประเภทเกลียว (Special, M6, etc.)
  };
}

export const HAFELE_MASTER_DB = {
  // =================================================================
  // 1. HOUSINGS (CAMS) - เลือกตามความหนาไม้ (PDF Page 2-3, 15)
  // =================================================================
  cams: {
    // --- Minifix 15 (Zinc Alloy) ---
    mf15_12: { id: 'mf15_12', itemNo: '262.26.070', name: 'Minifix 15 (12mm)', category: 'CAM', specs: { diameter: 15, drillDepth: 9.5, distA: 6.0 } },
    mf15_13: { id: 'mf15_13', itemNo: '262.26.031', name: 'Minifix 15 (13mm)', category: 'CAM', specs: { diameter: 15, drillDepth: 11.0, distA: 6.5 } },
    mf15_15: { id: 'mf15_15', itemNo: '262.26.032', name: 'Minifix 15 (15mm)', category: 'CAM', specs: { diameter: 15, drillDepth: 12.0, distA: 7.5 } },
    mf15_16: { id: 'mf15_16', itemNo: '262.26.033', name: 'Minifix 15 (16mm)', category: 'CAM', specs: { diameter: 15, drillDepth: 12.5, distA: 8.0 } }, // Standard 16mm
    mf15_18: { id: 'mf15_18', itemNo: '262.26.034', name: 'Minifix 15 (18mm)', category: 'CAM', specs: { diameter: 15, drillDepth: 13.5, distA: 9.0 } },
    mf15_19: { id: 'mf15_19', itemNo: '262.26.035', name: 'Minifix 15 (19mm)', category: 'CAM', specs: { diameter: 15, drillDepth: 14.0, distA: 9.5 } }, // Standard 19mm
    mf15_23: { id: 'mf15_23', itemNo: '262.26.036', name: 'Minifix 15 (23mm)', category: 'CAM', specs: { diameter: 15, drillDepth: 16.5, distA: 11.5 } },
    mf15_29: { id: 'mf15_29', itemNo: '262.26.038', name: 'Minifix 15 (29mm)', category: 'CAM', specs: { diameter: 15, drillDepth: 19.5, distA: 14.5 } },
    mf15_34: { id: 'mf15_34', itemNo: '262.26.081', name: 'Minifix 15 (34mm)', category: 'CAM', specs: { diameter: 15, drillDepth: 22.5, distA: 17.0 } },

    // --- Minifix 12 (Small) ---
    mf12_std: { id: 'mf12_std', itemNo: '262.17.020', name: 'Minifix 12', category: 'CAM', specs: { diameter: 12, drillDepth: 9.5, distA: 6.0 } },

    // --- Maxifix 35 (Heavy Duty) ---
    maxi_35: { id: 'maxi_35', itemNo: '262.87.013', name: 'Maxifix 35 Housing', category: 'CAM', specs: { diameter: 35, drillDepth: 15.5, distA: 9.5 } } // For 19mm+
  },

  // =================================================================
  // 2. CONNECTING BOLTS (แกนยึด) - PDF Page 5-16
  // =================================================================
  bolts: {
    // --- S200 (Standard) ---
    s200_b24: { id: 's200_b24', itemNo: '262.27.670', name: 'S200 Bolt (B=24)', category: 'BOLT', specs: { distB: 24, length: 24, drillDepth: 11, diameter: 5 } },
    s200_b34: { id: 's200_b34', itemNo: '262.28.670', name: 'S200 Bolt (B=34)', category: 'BOLT', specs: { distB: 34, length: 34, drillDepth: 11, diameter: 5 } },

    // --- S100 (Classic) ---
    s100_b24: { id: 's100_b24', itemNo: '262.27.020', name: 'S100 Bolt (B=24)', category: 'BOLT', specs: { distB: 24, length: 24, drillDepth: 8, diameter: 5 } },

    // --- S300 (High Torque) ---
    s300_b24: { id: 's300_b24', itemNo: '262.27.462', name: 'S300 Bolt (B=24)', category: 'BOLT', specs: { distB: 24, length: 24, drillDepth: 11, diameter: 5 } },

    // --- Mitre Joint (ข้อต่อองศา) PDF Page 13 ---
    mitre_b24: { id: 'mitre_b24', itemNo: '262.12.822', name: 'Mitre Bolt (B=24)', category: 'BOLT', specs: { distB: 24, length: 44, drillDepth: 11, diameter: 7 } },
    mitre_b44: { id: 'mitre_b44', itemNo: '262.12.804', name: 'Mitre Bolt (B=44)', category: 'BOLT', specs: { distB: 44, length: 64, drillDepth: 11, diameter: 7 } },

    // --- Double Ended (แผงกลาง) PDF Page 12 ---
    double_b24: { id: 'double_b24', itemNo: '262.27.109', name: 'Double Bolt (B=24)', category: 'BOLT', specs: { distB: 24, length: 48, drillDepth: 0, diameter: 8 } },

    // --- Maxifix Bolts PDF Page 16 ---
    maxi_b35: { id: 'maxi_b35', itemNo: '262.87.931', name: 'Maxifix Bolt (B=35)', category: 'BOLT', specs: { distB: 35, length: 35, drillDepth: 12, diameter: 9 } },
    maxi_b55: { id: 'maxi_b55', itemNo: '262.87.932', name: 'Maxifix Bolt (B=55)', category: 'BOLT', specs: { distB: 55, length: 55, drillDepth: 12, diameter: 9 } },
  },

  // =================================================================
  // 3. DOWELS & SLEEVES - PDF Page 1
  // =================================================================
  dowels: {
    // Standard Fluted
    wd_8x30: { id: 'wd_8x30', itemNo: '267.83.230', name: 'Wood Dowel 8x30', category: 'DOWEL', specs: { diameter: 8, length: 30, drillDepth: 15 } },
    wd_8x35: { id: 'wd_8x35', itemNo: '267.83.235', name: 'Wood Dowel 8x35', category: 'DOWEL', specs: { diameter: 8, length: 35, drillDepth: 18 } },
    wd_8x40: { id: 'wd_8x40', itemNo: '267.83.240', name: 'Wood Dowel 8x40', category: 'DOWEL', specs: { diameter: 8, length: 40, drillDepth: 20 } },
    // Pre-glued
    pg_8x30: { id: 'pg_8x30', itemNo: '267.84.230', name: 'Pre-glued 8x30', category: 'DOWEL', specs: { diameter: 8, length: 30, drillDepth: 15 } },
    // Plastic Exact
    pl_8x30: { id: 'pl_8x30', itemNo: '267.70.700', name: 'Plastic Exact 8x30', category: 'DOWEL', specs: { diameter: 8, length: 30, drillDepth: 15 } }
  },

  sleeves: {
    m6_glue: { id: 'm6_glue', itemNo: '039.33.462', name: 'M6 Glue-in Sleeve', category: 'SLEEVE', specs: { diameter: 8, drillDepth: 11, length: 11 } },
    m6_spread: { id: 'm6_spread', itemNo: '039.00.267', name: 'M6 Spread Sleeve', category: 'SLEEVE', specs: { diameter: 8, drillDepth: 9, length: 9 } }
  }
};
```

### 17.2 CAM Housing Thickness Map

```
MINIFIX 15 CAM SELECTION BY BOARD THICKNESS:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Thickness  │  Item No      │  Drill Depth │  Distance A       │
│  (mm)       │               │  (mm)        │  (mm)             │
├─────────────┼───────────────┼──────────────┼───────────────────┤
│    12       │  262.26.070   │    9.5       │    6.0            │
│    13       │  262.26.031   │   11.0       │    6.5            │
│    15       │  262.26.032   │   12.0       │    7.5            │
│    16       │  262.26.033   │   12.5       │    8.0  ★         │
│    18       │  262.26.034   │   13.5       │    9.0            │
│    19       │  262.26.035   │   14.0       │    9.5  ★         │
│    23       │  262.26.036   │   16.5       │   11.5            │
│    29       │  262.26.038   │   19.5       │   14.5            │
│    34       │  262.26.081   │   22.5       │   17.0            │
│                                                                 │
│  ★ = Most common thicknesses                                   │
│                                                                 │
│  FORMULA: Distance A ≈ Thickness / 2                           │
│           Drill Depth ≈ Thickness × 0.7                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

SYSTEM COMPARISON:
┌─────────────────────────────────────────────────────────────────┐
│  System      │  Housing Dia  │  Min Thickness  │  Use Case      │
├──────────────┼───────────────┼─────────────────┼────────────────┤
│  MINIFIX 12  │    12mm       │     10mm        │  Small/Light   │
│  MINIFIX 15  │    15mm       │     12mm        │  Standard ★    │
│  MAXIFIX 35  │    35mm       │     19mm        │  Heavy Duty    │
└─────────────────────────────────────────────────────────────────┘
```

### 17.3 Joinery Engineering Engine

```typescript
// src/services/engineering/joineryEngine.ts
import { HAFELE_MASTER_DB, HardwareItem, BoardThickness, SystemType, JointAngle } from '../hardware/hafeleDb';

export interface JoineryPlan {
  isValid: boolean;
  issues: string[];
  specs: {
    bolt: HardwareItem;
    cam: HardwareItem;
    dowel: HardwareItem;
    sleeve?: HardwareItem;
  };
  sets: {
    x: number;
    rotationY: number;
    dowelOffsets: number[];
  }[];
  meta: {
    margin: number;
    mitreInset?: number;
    formula?: string;
  };
}

// =================================================================
// MITRE INSET TABLE (PDF Page 13 - For B=44)
// [Angle][Thickness] = Inset F (mm)
// =================================================================
const MITRE_TABLE_B44: Record<number, Record<number, number>> = {
  90:  { 16: 52.0, 19: 53.5, 29: 58.5 },
  100: { 16: 50.4, 19: 51.6, 29: 55.9 },
  110: { 16: 49.4, 19: 50.4, 29: 54.2 },
  120: { 16: 48.6, 19: 49.5, 29: 52.4 },
  130: { 16: 47.9, 19: 48.6, 29: 51.1 },
  135: { 16: 47.3, 19: 47.9, 29: 50.0 },
  140: { 16: 46.9, 19: 47.3, 29: 49.3 },
  150: { 16: 46.0, 19: 46.2, 29: 47.5 },
  160: { 16: 45.2, 19: 45.1, 29: 45.9 },
  170: { 16: 44.5, 19: 44.3, 29: 44.6 },
  180: { 16: 44.0, 19: 44.0, 29: 44.0 }
};

interface JoineryOptions {
  length: number;
  thickness: BoardThickness;
  system?: SystemType;
  angle?: JointAngle;           // 90 = Standard, other = Mitre
  boltType?: 'STANDARD' | 'MITRE' | 'DOUBLE' | 'MAXIFIX';
  boltLength?: 24 | 34 | 44 | 55;   // Drilling Distance B
  dowelType?: string;
}

/**
 * Calculate joinery plan with auto-selection
 *
 * Key Rule (PDF Page 13):
 * "For drilling dim. B 24 mm, 20 mm must be deducted from inset F"
 */
export const calculateJoinery = (opts: JoineryOptions): JoineryPlan => {
  const {
    length,
    thickness,
    system = 'MINIFIX_15',
    angle = 90,
    boltType = 'STANDARD',
    boltLength = 24,
    dowelType = 'wd_8x30'
  } = opts;

  const issues: string[] = [];

  // =================================================================
  // 1. AUTO-SELECT CAM (ตามความหนาไม้)
  // =================================================================
  let cam: HardwareItem;

  if (system === 'MAXIFIX_35') {
    cam = HAFELE_MASTER_DB.cams.maxi_35;
    if (thickness < 19) {
      issues.push(`Maxifix requires minimum 19mm thickness, got ${thickness}mm`);
    }
  } else if (system === 'MINIFIX_12') {
    cam = HAFELE_MASTER_DB.cams.mf12_std;
  } else {
    // MINIFIX_15 Auto-Selection Logic
    const db = HAFELE_MASTER_DB.cams;
    if (thickness <= 12) cam = db.mf15_12;
    else if (thickness === 13) cam = db.mf15_13;
    else if (thickness === 15) cam = db.mf15_15;
    else if (thickness === 16) cam = db.mf15_16;
    else if (thickness === 18) cam = db.mf15_18;
    else if (thickness === 19) cam = db.mf15_19;
    else if (thickness <= 23) cam = db.mf15_23;
    else if (thickness <= 29) cam = db.mf15_29;
    else cam = db.mf15_34;
  }

  // =================================================================
  // 2. AUTO-SELECT BOLT
  // =================================================================
  let bolt: HardwareItem;

  if (system === 'MAXIFIX_35') {
    bolt = boltLength === 55
      ? HAFELE_MASTER_DB.bolts.maxi_b55
      : HAFELE_MASTER_DB.bolts.maxi_b35;
  } else if (boltType === 'MITRE') {
    bolt = boltLength === 24
      ? HAFELE_MASTER_DB.bolts.mitre_b24
      : HAFELE_MASTER_DB.bolts.mitre_b44;
  } else if (boltType === 'DOUBLE') {
    bolt = HAFELE_MASTER_DB.bolts.double_b24;
  } else {
    // Standard S200
    bolt = boltLength === 34
      ? HAFELE_MASTER_DB.bolts.s200_b34
      : HAFELE_MASTER_DB.bolts.s200_b24;
  }

  // =================================================================
  // 3. DOWEL
  // =================================================================
  const dowel = HAFELE_MASTER_DB.dowels[dowelType as keyof typeof HAFELE_MASTER_DB.dowels]
    || HAFELE_MASTER_DB.dowels.wd_8x30;

  // =================================================================
  // 4. MARGIN CALCULATION (Critical for Mitre Joints!)
  // =================================================================
  let margin = bolt.specs.distB!;
  let mitreInset: number | undefined;
  let formula: string | undefined;

  if (boltType === 'MITRE' && angle !== 180) {
    // Mitre Inset F from table (base value for B=44)
    const closestThickness = thickness <= 16 ? 16 : thickness <= 19 ? 19 : 29;
    const fBase = MITRE_TABLE_B44[angle]?.[closestThickness] || 53.5;

    // KEY RULE: If B=24, deduct 20mm from F
    mitreInset = (boltLength === 24) ? fBase - 20 : fBase;
    margin = mitreInset;
    formula = boltLength === 24
      ? `F = ${fBase} - 20 = ${mitreInset}mm (B=24 rule)`
      : `F = ${fBase}mm (B=44)`;
  }

  // =================================================================
  // 5. LAYOUT GENERATION
  // =================================================================
  const sets: JoineryPlan['sets'] = [];
  const dowelSpacing = 32;

  // Left position
  sets.push({
    x: margin,
    rotationY: 0,
    dowelOffsets: [dowelSpacing]
  });

  // Right position
  sets.push({
    x: length - margin,
    rotationY: Math.PI,
    dowelOffsets: [dowelSpacing]
  });

  // Center position for long panels (>450mm)
  if (length > 450) {
    sets.push({
      x: length / 2,
      rotationY: 0,
      dowelOffsets: [-dowelSpacing, dowelSpacing]
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
    specs: { bolt, cam, dowel },
    sets,
    meta: { margin, mitreInset, formula }
  };
};
```

### 17.4 CAM Operation Generator

```typescript
// src/services/cam/generators/masterOp.ts
import { calculateJoinery, JoineryPlan } from '../../engineering/joineryEngine';
import { BoardThickness, SystemType, JointAngle } from '../../hardware/hafeleDb';

export interface MasterMachineOp {
  id: string;
  type: 'DRILL';
  x: number;
  y: number;
  diameter: number;
  depth: number;
  face: 'FACE' | 'EDGE';
  hardwareId: string;
}

/**
 * Generate CNC operations for Minifix/Maxifix joinery
 *
 * Operations per connector set:
 * - Bolt Channel (Edge Boring): Drilled into mating panel edge
 * - CAM Housing (Face Boring): Drilled into receiving panel face
 * - Dowels (Edge Boring): Alignment pins
 *
 * IMPORTANT: CAM Housing Y Position = Bolt's Distance B
 * (NOT the CAM's Distance A - that's for thickness validation only!)
 */
export const generateMasterOps = (
  partId: string,
  length: number,
  thickness: BoardThickness,
  system: SystemType = 'MINIFIX_15',
  angle: JointAngle = 90,
  boltType: 'STANDARD' | 'MITRE' | 'DOUBLE' | 'MAXIFIX' = 'STANDARD',
  boltLength: 24 | 34 | 44 | 55 = 24
): MasterMachineOp[] => {

  const plan = calculateJoinery({
    length,
    thickness,
    system,
    angle,
    boltType,
    boltLength
  });

  if (!plan.isValid) return [];

  const ops: MasterMachineOp[] = [];
  const { bolt, cam, dowel } = plan.specs;

  plan.sets.forEach((set, i) => {

    // =================================================================
    // 1. BOLT CHANNEL (Edge Boring - เจาะสันบาน)
    // This goes into the MATING panel (e.g., shelf edge)
    // =================================================================
    ops.push({
      id: `${partId}-bolt-${i}`,
      type: 'DRILL',
      x: set.x,
      y: 0, // Center of edge
      diameter: bolt.specs.diameter,
      depth: (bolt.specs.length || bolt.specs.distB!) + 1, // เจาะลึกเผื่อ 1mm
      face: 'EDGE',
      hardwareId: bolt.itemNo
    });

    // =================================================================
    // 2. CAM HOUSING (Face Boring - เจาะหน้าบาน)
    // This goes into the RECEIVING panel (e.g., side panel)
    //
    // CRITICAL: Y position = Bolt's Distance B
    // The CAM's distA is for THICKNESS validation, not Y positioning!
    // =================================================================
    ops.push({
      id: `${partId}-cam-${i}`,
      type: 'DRILL',
      x: set.x,
      y: bolt.specs.distB!, // ระยะจากขอบ = Drilling Distance B
      diameter: cam.specs.diameter,
      depth: cam.specs.drillDepth,
      face: 'FACE',
      hardwareId: cam.itemNo
    });

    // =================================================================
    // 3. DOWELS (Edge Boring)
    // Alignment pins on either side of bolt
    // =================================================================
    set.dowelOffsets.forEach((off, j) => {
      const realOffset = set.rotationY !== 0 ? -off : off;
      ops.push({
        id: `${partId}-dowel-${i}-${j}`,
        type: 'DRILL',
        x: set.x + realOffset,
        y: 0, // Center of edge
        diameter: dowel.specs.diameter,
        depth: dowel.specs.drillDepth,
        face: 'EDGE',
        hardwareId: dowel.itemNo
      });
    });

  });

  return ops;
};
```

### 17.5 Visual Component

```typescript
// src/components/visual/hardware/MasterConnector.tsx
import React, { useMemo } from 'react';
import { calculateJoinery } from '../../../services/engineering/joineryEngine';
import { BoardThickness, SystemType, JointAngle } from '../../../services/hardware/hafeleDb';

const mm = (v: number) => v / 1000;

interface Props {
  length: number;
  thickness: BoardThickness;
  system?: SystemType;
  angle?: JointAngle;
  boltType?: 'STANDARD' | 'MITRE' | 'DOUBLE' | 'MAXIFIX';
  boltLength?: 24 | 34 | 44 | 55;
}

export const MasterConnector: React.FC<Props> = ({
  length,
  thickness,
  system = 'MINIFIX_15',
  angle = 90,
  boltType = 'STANDARD',
  boltLength = 24
}) => {

  const plan = useMemo(() =>
    calculateJoinery({ length, thickness, system, angle, boltType, boltLength }),
  [length, thickness, system, angle, boltType, boltLength]);

  if (!plan.isValid) return null;
  const { bolt, cam, dowel } = plan.specs;

  // Color mapping
  const camColor = system === 'MAXIFIX_35' ? '#5D4037' : '#C0C0C0';
  const boltColor = boltType === 'MITRE' ? '#FFD54F' : '#888888';

  return (
    <group>
      {plan.sets.map((set, i) => (
        <group
          key={i}
          position={[mm(set.x), 0, 0]}
          rotation={[0, set.rotationY, 0]}
        >

          {/* === CAM HOUSING === */}
          <group
            position={[0, mm(bolt.specs.distB || 34), 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {/* Main Cylinder */}
            <mesh>
              <cylinderGeometry args={[
                mm(cam.specs.diameter / 2),
                mm(cam.specs.diameter / 2),
                mm(cam.specs.drillDepth),
                32
              ]} />
              <meshStandardMaterial color={camColor} metalness={0.4} />
            </mesh>
            {/* Cam Slot */}
            <mesh position={[0, mm(cam.specs.drillDepth / 2 + 0.1), 0]}>
              <boxGeometry args={[mm(cam.specs.diameter / 1.5), mm(0.5), mm(1)]} />
              <meshBasicMaterial color="#222" />
            </mesh>
          </group>

          {/* === BOLT === */}
          <mesh position={[0, mm((bolt.specs.distB || 34) / 2), 0]}>
            <cylinderGeometry args={[
              mm(bolt.specs.diameter / 2),
              mm(bolt.specs.diameter / 2),
              mm(bolt.specs.distB || 34),
              12
            ]} />
            <meshStandardMaterial color={boltColor} metalness={0.6} />
          </mesh>

          {/* Bolt Head */}
          <mesh position={[0, mm(1), 0]}>
            <cylinderGeometry args={[mm(4), mm(4), mm(2), 6]} />
            <meshStandardMaterial color={boltColor} />
          </mesh>

          {/* === DOWELS === */}
          {set.dowelOffsets.map((off, j) => (
            <group key={j} position={[mm(off), 0, 0]}>
              <mesh position={[0, mm(dowel.specs.length! / 2), 0]}>
                <cylinderGeometry args={[
                  mm(dowel.specs.diameter / 2),
                  mm(dowel.specs.diameter / 2),
                  mm(dowel.specs.length || 30),
                  16
                ]} />
                <meshStandardMaterial color="#D7CCC8" />
              </mesh>
            </group>
          ))}

        </group>
      ))}
    </group>
  );
};
```

### 17.6 Bolt Series Comparison

```
CONNECTING BOLT SERIES:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Series  │  Item No      │  Dist B  │  Drill Dia │  Use Case           │
├──────────┼───────────────┼──────────┼────────────┼─────────────────────┤
│  S100    │  262.27.020   │   24mm   │    5mm     │  Classic, Economy   │
│  S200    │  262.27.670   │   24mm   │    5mm     │  Standard ★         │
│  S200    │  262.28.670   │   34mm   │    5mm     │  Deeper panels      │
│  S300    │  262.27.462   │   24mm   │    5mm     │  High torque        │
│  Mitre   │  262.12.822   │   24mm   │    7mm     │  Angled joints      │
│  Mitre   │  262.12.804   │   44mm   │    7mm     │  Angled joints HD   │
│  Double  │  262.27.109   │   24mm   │    8mm     │  Center panels      │
│  Maxifix │  262.87.931   │   35mm   │    9mm     │  Heavy duty         │
│  Maxifix │  262.87.932   │   55mm   │    9mm     │  Heavy duty deep    │
│                                                                         │
│  ★ = Recommended for most applications                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 17.7 Mitre Joint Drilling Diagram

```
MITRE JOINT DRILLING (PDF Page 13):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  CRITICAL RULE:                                                 │
│  ══════════════                                                 │
│  "For drilling dim. B 24 mm, 20 mm must be deducted from F"    │
│                                                                 │
│           Panel 1                                               │
│           ┌─────────────────────────┐                          │
│           │                    ╲    │                           │
│           │                     ╲   │                           │
│           │                      ╲  │                           │
│           │         ○ ← Cam       ╲ │ ← Mitre cut              │
│           │         │              ╲│                           │
│           │         │               │                           │
│           │         │               │                           │
│           │    F ←──┤               │                           │
│           │         │               │                           │
│           │         │               │                           │
│           ├─────────┼───────────────┤                           │
│           │         │               │                           │
│           │         │               │                           │
│           │         ▼ Bolt          │                           │
│           │         ●               │                           │
│           │        ╱                │                           │
│           │       ╱ Panel 2         │                           │
│           │      ╱                  │                           │
│           └─────────────────────────┘                           │
│                                                                 │
│  INSET F VALUES (B=44 base):                                   │
│  ┌─────────┬────────┬────────┬────────┐                        │
│  │ Angle   │  16mm  │  19mm  │  29mm  │                        │
│  ├─────────┼────────┼────────┼────────┤                        │
│  │   90°   │  52.0  │  53.5  │  58.5  │                        │
│  │  120°   │  48.6  │  49.5  │  52.4  │                        │
│  │  135°   │  47.3  │  47.9  │  50.0  │                        │
│  │  180°   │  44.0  │  44.0  │  44.0  │                        │
│  └─────────┴────────┴────────┴────────┘                        │
│                                                                 │
│  FOR B=24: F = TableValue - 20mm                               │
│  Example: 90° @ 19mm → F = 53.5 - 20 = 33.5mm                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 17.8 Drilling Pattern Diagrams

```
STANDARD JOINT (90°):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SIDE PANEL (Receiving - has CAM housing):                     │
│  ──────────────────────────────────────────                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │    ○ ← CAM Housing (15mm dia)                          │   │
│  │    │   Position Y = Distance B (24/34mm)               │   │
│  │    │                                                    │   │
│  │    ●─●─● ← Dowel holes (8mm)                           │   │
│  │                                                         │   │
│  │    X position = Margin from edge                        │   │
│  │    (24mm for B=24, 34mm for B=34)                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SHELF PANEL (Mating - has bolt channel):                      │
│  ────────────────────────────────────────                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                        SHELF                            │   │
│  │                                                         │   │
│  │   ════════════════════════════════════════════ ← EDGE  │   │
│  │   │         Edge Drill: 5mm dia                        │   │
│  │   ▼         Depth = B + 1mm                            │   │
│  │   ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●  │   │
│  │           Bolt Channel                                  │   │
│  │   ●─●─● ← Dowel holes                                  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

DOUBLE-ENDED BOLT (Center Panel):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│           LEFT          CENTER          RIGHT                   │
│           PANEL         PANEL           PANEL                   │
│           ┌──────┐    ┌──────┐        ┌──────┐                 │
│           │      │    │      │        │      │                 │
│           │  ○───┼────┼──●───┼────────┼───○  │                 │
│           │ CAM  │    │BOLT  │        │ CAM  │                 │
│           │      │    │      │        │      │                 │
│           │      │    │      │        │      │                 │
│           └──────┘    └──────┘        └──────┘                 │
│                                                                 │
│  Double-ended bolt connects through center panel               │
│  - Bolt goes in center panel edge (8mm × 48mm)                │
│  - CAMs in both side panels                                    │
│  - Allows flat-pack furniture assembly                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 17.9 Calculation Examples

```typescript
// Example 1: Standard 18mm shelf with Minifix 15
const standardPlan = calculateJoinery({
  length: 800,
  thickness: 18,
  system: 'MINIFIX_15',
  boltLength: 24
});

console.log('=== Standard 18mm Shelf ===');
console.log('CAM:', standardPlan.specs.cam.name);
// 'Minifix 15 (18mm)' - Auto-selected!
console.log('CAM Item:', standardPlan.specs.cam.itemNo);
// '262.26.034'
console.log('Bolt:', standardPlan.specs.bolt.name);
// 'S200 Bolt (B=24)'
console.log('Margin:', standardPlan.meta.margin);
// 24mm


// Example 2: Heavy duty with Maxifix
const maxifixPlan = calculateJoinery({
  length: 600,
  thickness: 19,
  system: 'MAXIFIX_35',
  boltLength: 35
});

console.log('\n=== Maxifix Heavy Duty ===');
console.log('CAM Dia:', maxifixPlan.specs.cam.specs.diameter);
// 35mm
console.log('Bolt Dia:', maxifixPlan.specs.bolt.specs.diameter);
// 9mm


// Example 3: Mitre joint at 120°
const mitrePlan = calculateJoinery({
  length: 500,
  thickness: 19,
  boltType: 'MITRE',
  boltLength: 24,
  angle: 120
});

console.log('\n=== Mitre Joint 120° ===');
console.log('Formula:', mitrePlan.meta.formula);
// 'F = 49.5 - 20 = 29.5mm (B=24 rule)'
console.log('Actual Margin:', mitrePlan.meta.margin);
// 29.5mm (NOT 49.5mm!)


// Example 4: Generate CAM operations
const ops = generateMasterOps(
  'SHELF-001',
  800,
  18,
  'MINIFIX_15',
  90,
  'STANDARD',
  24
);

console.log('\n=== CAM Operations ===');
console.log('Total ops:', ops.length);
// 9 (3 sets × 3 ops per set)

const edgeOps = ops.filter(op => op.face === 'EDGE' && op.id.includes('bolt'));
console.log('Bolt channels:', edgeOps.length);  // 3
console.log('Bolt dia:', edgeOps[0].diameter);  // 5mm
console.log('Bolt depth:', edgeOps[0].depth);   // 25mm (24+1)

const faceOps = ops.filter(op => op.face === 'FACE');
console.log('CAM housings:', faceOps.length);   // 3
console.log('CAM dia:', faceOps[0].diameter);   // 15mm
console.log('CAM Y pos:', faceOps[0].y);        // 24mm (= Distance B!)
```

### 17.10 Technical Reference Table

| Parameter | Minifix 12 | Minifix 15 | Maxifix 35 | Unit |
|-----------|------------|------------|------------|------|
| **Housing Dia** | 12 | 15 | 35 | mm |
| **Min Thickness** | 10 | 12 | 19 | mm |
| **Max Thickness** | 15 | 34 | 50+ | mm |
| **Standard Bolt** | S200 (24) | S200 (24/34) | Maxi (35/55) | mm |
| **Bolt Diameter** | 5 | 5 | 9 | mm |
| **Dowel Standard** | 8×30 | 8×30 | 8×35 | mm |
| **Load Capacity** | Light | Standard | Heavy | - |
| **Price Level** | Economy | Standard | Premium | - |

### 17.11 Distance A vs Distance B Clarification

```
CRITICAL DISTINCTION:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  DISTANCE A (distA):                                           │
│  ═══════════════════                                            │
│  - ระยะกึ่งกลางความหนาไม้                                       │
│  - ใช้สำหรับ: เลือกรุ่น CAM ที่เหมาะสม                          │
│  - ไม่ใช่ตำแหน่งเจาะ!                                           │
│                                                                 │
│  ┌─────────────────────┐                                       │
│  │                     │                                       │
│  │ ← A → ○ ← A →       │  A ≈ Thickness / 2                   │
│  │      CAM            │                                       │
│  │                     │                                       │
│  └─────────────────────┘                                       │
│  ↑_____Thickness_____↑                                         │
│                                                                 │
│  DISTANCE B (distB):                                           │
│  ═══════════════════                                            │
│  - ระยะเจาะจากขอบแผ่นไม้                                        │
│  - ใช้สำหรับ: กำหนดตำแหน่ง Y ของ CAM Housing บนหน้าบาน         │
│  - นี่คือตำแหน่งเจาะจริง!                                       │
│                                                                 │
│  PANEL EDGE                                                     │
│       │                                                         │
│       │← B →│                                                   │
│       │     ○ ← CAM Housing position                           │
│       │                                                         │
│       │                                                         │
│       ▼                                                         │
│  ═══════════════════════                                        │
│                                                                 │
│  COMMON MISTAKE:                                                │
│  ❌ Using CAM's distA for Y position                           │
│  ✅ Using BOLT's distB for Y position                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 17.12 Quality Validation Checklist

```typescript
// Validation helper for joinery plans
export function validateJoineryPlan(plan: JoineryPlan): string[] {
  const errors: string[] = [];

  // 1. Check CAM matches thickness
  const cam = plan.specs.cam;
  const expectedDistA = cam.specs.distA;
  // distA should be approximately half the board thickness

  // 2. Check bolt distance is reasonable
  const bolt = plan.specs.bolt;
  if (bolt.specs.distB! < 20) {
    errors.push('Bolt distance B too short - may cause breakout');
  }

  // 3. Check connector spacing
  const positions = plan.sets.map(s => s.x);
  for (let i = 1; i < positions.length; i++) {
    const gap = positions[i] - positions[i - 1];
    if (gap < 100) {
      errors.push(`Connectors too close: ${gap}mm between positions`);
    }
  }

  // 4. Check margin from edge
  if (plan.meta.margin < 20) {
    errors.push(`Edge margin too small: ${plan.meta.margin}mm`);
  }

  return errors;
}
```

---

**เอกสารอ้างอิง:**
- Blum Technical Documentation
- Blum Catalog Pages 2, 5, 6, 13, 14-67, 64, 74-76, 84, 150, 410, 420, 430, 452
- Häfele Catalog PDF Pages 1-17 (Minifix, Maxifix, S-Series, Mitre, Double, Dowels)
- Häfele Selection 12 (Ixconnect SC/U/CC & Tofix)
- Häfele Selection 13 (Lamello P-System)
- Häfele Selection 14 (Ixconnect Dovetail)
- Häfele Selection 15 (Metalla 510 Standard Hinges)
- Häfele Selection 16 (Specialty Hinges)
- Häfele Selection 17 (Metalla 510 & Mounting Plates)
- Hettich Product Catalog
- Häfele Furniture Fittings Handbook
- European Kitchen Cabinet Standards (EN 16121)
