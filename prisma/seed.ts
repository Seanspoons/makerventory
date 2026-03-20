import {
  FilamentHygroscopicLevel,
  MaterialSystemStatus,
  MaterialSystemType,
  MaintenanceActionType,
  PrismaClient,
  PrinterStatus,
  SafetyStatus,
  SmartPlugStatus,
  StockStatus,
  WishlistPriority,
  WishlistStatus,
  BuildPlateStatus,
  HotendStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  await prisma.maintenanceConsumableUsage.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.printerMaterialSystem.deleteMany();
  await prisma.printerHotend.deleteMany();
  await prisma.printerBuildPlate.deleteMany();
  await prisma.filamentRecommendation.deleteMany();
  await prisma.materialSystem.deleteMany();
  await prisma.printer.deleteMany();
  await prisma.buildPlate.deleteMany();
  await prisma.hotend.deleteMany();
  await prisma.filamentSpool.deleteMany();
  await prisma.consumableItem.deleteMany();
  await prisma.safetyEquipment.deleteMany();
  await prisma.smartPlug.deleteMany();
  await prisma.toolPart.deleteMany();
  await prisma.wishlistItem.deleteMany();

  const smartPlugs = await Promise.all([
    prisma.smartPlug.create({
      data: {
        name: "A1 Mini",
        slug: "smart-plug-a1-mini",
        assignedDeviceLabel: "Bambu Lab A1 Mini",
        status: SmartPlugStatus.ONLINE,
        powerMonitoringCapable: true,
        notes: "Scheduled overnight shutoff available through Home Assistant.",
      },
    }),
    prisma.smartPlug.create({
      data: {
        name: "P2S",
        slug: "smart-plug-p2s",
        assignedDeviceLabel: "Bambu Lab P2S",
        status: SmartPlugStatus.ONLINE,
        powerMonitoringCapable: true,
        notes: "Primary production printer outlet with power draw tracking.",
      },
    }),
    prisma.smartPlug.create({
      data: {
        name: "Air Purifier",
        slug: "smart-plug-air-purifier",
        assignedDeviceLabel: "Levoit Core 300-P",
        status: SmartPlugStatus.ONLINE,
        powerMonitoringCapable: false,
      },
    }),
    prisma.smartPlug.create({
      data: {
        name: "Dryer",
        slug: "smart-plug-dryer",
        assignedDeviceLabel: "Creality Space Pi Filament Dryer Plus",
        status: SmartPlugStatus.OFFLINE,
        powerMonitoringCapable: false,
        notes: "Currently unplugged pending shelf cable cleanup.",
      },
    }),
  ]);

  const hotends = await Promise.all([
    prisma.hotend.create({
      data: {
        name: "A1 Mini 0.4mm Stainless",
        slug: "a1-mini-0-4mm-stainless",
        nozzleSize: 0.4,
        materialType: "Stainless Steel",
        quantity: 1,
        inUseCount: 0,
        spareCount: 1,
        status: HotendStatus.AVAILABLE,
        notes: "Kept as a clean PLA/PETG backup nozzle.",
      },
    }),
    prisma.hotend.create({
      data: {
        name: "A1 Mini 0.4mm Hardened Steel",
        slug: "a1-mini-0-4mm-hardened-steel",
        nozzleSize: 0.4,
        materialType: "Hardened Steel",
        quantity: 1,
        inUseCount: 1,
        spareCount: 0,
        status: HotendStatus.IN_USE,
        notes: "Installed to keep the A1 Mini ready for occasional abrasive work.",
      },
    }),
    prisma.hotend.create({
      data: {
        name: "P2S 0.4mm Hardened Steel",
        slug: "p2s-0-4mm-hardened-steel",
        nozzleSize: 0.4,
        materialType: "Hardened Steel",
        quantity: 3,
        inUseCount: 1,
        spareCount: 2,
        status: HotendStatus.IN_USE,
        notes: "Main daily-use nozzle set for PETG, ASA, and fiber-filled materials.",
      },
    }),
    prisma.hotend.create({
      data: {
        name: "P2S 0.6mm Hardened Steel",
        slug: "p2s-0-6mm-hardened-steel",
        nozzleSize: 0.6,
        materialType: "Hardened Steel",
        quantity: 1,
        inUseCount: 0,
        spareCount: 1,
        status: HotendStatus.AVAILABLE,
        notes: "Reserved for stronger functional parts and faster rough-draft prints.",
      },
    }),
  ]);

  const plates = await Promise.all([
    prisma.buildPlate.create({
      data: {
        name: "Bambu Lab Textured Build Plate 180mm",
        slug: "bambu-lab-textured-build-plate-180mm",
        sizeLabel: "180mm",
        sizeMm: 180,
        surfaceType: "Textured PEI",
        status: BuildPlateStatus.AVAILABLE,
      },
    }),
    prisma.buildPlate.create({
      data: {
        name: "Bambu Lab Smooth Build Plate 180mm",
        slug: "bambu-lab-smooth-build-plate-180mm",
        sizeLabel: "180mm",
        sizeMm: 180,
        surfaceType: "Smooth PEI",
        status: BuildPlateStatus.WORN,
        notes: "Slight edge wear from repeated small-part removal.",
      },
    }),
    prisma.buildPlate.create({
      data: {
        name: "Bambu Lab Dual Textured/Smooth Build Plate 180mm",
        slug: "bambu-lab-dual-textured-smooth-build-plate-180mm",
        sizeLabel: "180mm",
        sizeMm: 180,
        surfaceType: "Dual-Sided PEI",
        status: BuildPlateStatus.IN_USE,
      },
    }),
    prisma.buildPlate.create({
      data: {
        name: "Bambu Lab Textured Build Plate 256mm",
        slug: "bambu-lab-textured-build-plate-256mm",
        sizeLabel: "256mm",
        sizeMm: 256,
        surfaceType: "Textured PEI",
        status: BuildPlateStatus.AVAILABLE,
      },
    }),
    prisma.buildPlate.create({
      data: {
        name: "Bambu Lab Engineering Plate 256mm",
        slug: "bambu-lab-engineering-plate-256mm",
        sizeLabel: "256mm",
        sizeMm: 256,
        surfaceType: "Engineering",
        status: BuildPlateStatus.AVAILABLE,
      },
    }),
    prisma.buildPlate.create({
      data: {
        name: "Bambu Lab Cool Plate SuperTack 256mm",
        slug: "bambu-lab-cool-plate-supertack-256mm",
        sizeLabel: "256mm",
        sizeMm: 256,
        surfaceType: "SuperTack",
        status: BuildPlateStatus.IN_USE,
        notes: "Currently installed for PETG-heavy work.",
      },
    }),
    prisma.buildPlate.create({
      data: {
        name: "Bambu Lab Dual Textured/Smooth Build Plate 256mm",
        slug: "bambu-lab-dual-textured-smooth-build-plate-256mm",
        sizeLabel: "256mm",
        sizeMm: 256,
        surfaceType: "Dual-Sided PEI",
        status: BuildPlateStatus.AVAILABLE,
      },
    }),
  ]);

  const printers = await Promise.all([
    prisma.printer.create({
      data: {
        name: "Bambu Lab A1 Mini",
        slug: "bambu-lab-a1-mini",
        brand: "Bambu Lab",
        model: "A1 Mini",
        status: PrinterStatus.ACTIVE,
        buildVolumeX: 180,
        buildVolumeY: 180,
        buildVolumeZ: 180,
        location: "Workbench Left",
        notes: "Dialed in for quick PLA/PETG prints and small prototype runs.",
        smartPlugId: smartPlugs[0].id,
        installedHotendId: hotends[1].id,
        installedPlateId: plates[2].id,
      },
    }),
    prisma.printer.create({
      data: {
        name: "Bambu Lab P2S",
        slug: "bambu-lab-p2s",
        brand: "Bambu Lab",
        model: "P2S",
        status: PrinterStatus.ACTIVE,
        buildVolumeX: 256,
        buildVolumeY: 256,
        buildVolumeZ: 256,
        location: "Workbench Right",
        notes: "Primary enclosed machine for functional PETG, ASA, and CF parts.",
        smartPlugId: smartPlugs[1].id,
        installedHotendId: hotends[2].id,
        installedPlateId: plates[5].id,
      },
    }),
  ]);

  const materialSystems = await Promise.all([
    prisma.materialSystem.create({
      data: {
        name: "Bambu Lab AMS Lite",
        slug: "bambu-lab-ams-lite",
        type: MaterialSystemType.AMS_LITE,
        supportedMaterialsNotes: "Best used with PLA, PETG, and lighter flexible loads.",
        assignedPrinterId: printers[0].id,
        status: MaterialSystemStatus.ACTIVE,
        notes: "Dedicated to the A1 Mini for quick color swaps.",
      },
    }),
    prisma.materialSystem.create({
      data: {
        name: "Bambu Lab AMS 2 Pro",
        slug: "bambu-lab-ams-2-pro",
        type: MaterialSystemType.AMS_2_PRO,
        supportedMaterialsNotes: "General-purpose AMS for PLA, PETG, and conditioned TPU for AMS.",
        assignedPrinterId: printers[1].id,
        status: MaterialSystemStatus.ACTIVE,
        notes: "Primary multi-material feed unit for the P2S.",
      },
    }),
    prisma.materialSystem.create({
      data: {
        name: "Bambu Lab AMS HT",
        slug: "bambu-lab-ams-ht",
        type: MaterialSystemType.AMS_HT,
        supportedMaterialsNotes: "Reserved for engineering and dryer-sensitive spools.",
        assignedPrinterId: printers[1].id,
        status: MaterialSystemStatus.STANDBY,
        notes: "Not fully integrated into the workflow yet; planned for hygroscopic materials.",
      },
    }),
    prisma.materialSystem.create({
      data: {
        name: "Creality Space Pi Filament Dryer Plus",
        slug: "creality-space-pi-filament-dryer-plus",
        type: MaterialSystemType.DRYER,
        supportedMaterialsNotes: "Used to refresh PETG, ASA, TPU, and future nylon stock.",
        status: MaterialSystemStatus.ACTIVE,
        notes: "Usually parked near the exhaust setup; smart plug currently offline.",
      },
    }),
  ]);

  await prisma.printerBuildPlate.createMany({
    data: [
      ...plates.slice(0, 3).map((plate) => ({
        printerId: printers[0].id,
        buildPlateId: plate.id,
        notes: "180mm plate family for the A1 Mini.",
      })),
      ...plates.slice(3).map((plate) => ({
        printerId: printers[1].id,
        buildPlateId: plate.id,
        notes: "256mm plate family for the P2S.",
      })),
    ],
  });

  await prisma.printerHotend.createMany({
    data: [
      { printerId: printers[0].id, hotendId: hotends[0].id, notes: "A1 Mini-compatible hotend." },
      { printerId: printers[0].id, hotendId: hotends[1].id, notes: "A1 Mini-compatible hotend." },
      { printerId: printers[1].id, hotendId: hotends[2].id, notes: "P2S-compatible hotend." },
      { printerId: printers[1].id, hotendId: hotends[3].id, notes: "P2S-compatible hotend." },
    ],
  });

  await prisma.printerMaterialSystem.createMany({
    data: [
      { printerId: printers[0].id, materialSystemId: materialSystems[0].id, notes: "Daily multi-spool setup." },
      { printerId: printers[1].id, materialSystemId: materialSystems[1].id, notes: "Primary P2S feed unit." },
      { printerId: printers[1].id, materialSystemId: materialSystems[2].id, notes: "Secondary high-temp workflow." },
      { printerId: printers[0].id, materialSystemId: materialSystems[3].id, notes: "External shared dryer." },
      { printerId: printers[1].id, materialSystemId: materialSystems[3].id, notes: "External shared dryer." },
    ],
  });

  const filamentEntries: Array<
    [
      string,
      string,
      string | null,
      string | null,
      string,
      number,
      number,
      boolean,
      boolean,
      FilamentHygroscopicLevel,
      string,
      string,
      StockStatus,
      boolean,
      boolean,
      string,
    ]
  > = [
    ["Bambu Lab", "PLA", null, null, "White", 2, 1700, false, false, FilamentHygroscopicLevel.LOW, "Shelf A1", "Bambu Lab Store", StockStatus.HEALTHY, false, false, "Reliable default stock for prototyping."],
    ["Bambu Lab", "PLA", null, null, "Cocoa Brown", 1, 620, false, false, FilamentHygroscopicLevel.LOW, "Shelf A1", "Bambu Lab Store", StockStatus.HEALTHY, true, false, "Good for planters and accessory parts."],
    ["ELEGOO", "PLA+", null, null, "Black", 5, 3900, false, false, FilamentHygroscopicLevel.LOW, "Shelf A2", "Amazon", StockStatus.HEALTHY, true, false, "Bulk utility PLA+ for fixtures and shop helpers."],
    ["Bambu Lab", "PLA", "Matte", "Matte", "Dark Green", 1, 540, false, false, FilamentHygroscopicLevel.LOW, "Shelf A1", "Bambu Lab Store", StockStatus.LOW, true, true, "Opened spool running low after organizer bin prints."],
    ["Bambu Lab", "PLA", "Matte", "Matte", "Charcoal", 1, 760, false, false, FilamentHygroscopicLevel.LOW, "Shelf A1", "Bambu Lab Store", StockStatus.HEALTHY, true, false, "Clean cosmetic finish for desk accessories."],
    ["Polymaker", "PLA", "Matte", "Matte", "Lava Red", 1, 710, false, false, FilamentHygroscopicLevel.LOW, "Shelf A2", "3D Printing Canada", StockStatus.HEALTHY, true, false, "Reserved for visible accent parts."],
    ["ELEGOO", "PLA", "Silk", "Silk", "Gold", 1, 340, false, false, FilamentHygroscopicLevel.LOW, "Shelf A2", "Amazon", StockStatus.LOW, true, true, "Decorative filament; nearing empty."],
    ["Sunlu", "PLA", "Meta", "Meta", "Sakura Pink", 1, 560, false, false, FilamentHygroscopicLevel.LOW, "Shelf A2", "Amazon", StockStatus.HEALTHY, false, false, "Impulse color pick for gifts and novelty prints."],
    ["Bambu Lab", "PLA", "Metallic", "Metal", "Iridium Gold", 1, 480, false, false, FilamentHygroscopicLevel.LOW, "Shelf A1", "Bambu Lab Store", StockStatus.LOW, true, false, "Metallic finish benefits from slower outer walls."],
    ["Bambu Lab", "PETG", "HF", null, "White", 1, 760, true, false, FilamentHygroscopicLevel.MEDIUM, "Dry Box 1", "Bambu Lab Store", StockStatus.HEALTHY, true, false, "General-purpose functional PETG."],
    ["Bambu Lab", "PETG", "HF", null, "Black", 1, 510, true, false, FilamentHygroscopicLevel.MEDIUM, "Dry Box 1", "Bambu Lab Store", StockStatus.HEALTHY, true, false, "Frequent bracket and mount material."],
    ["Bambu Lab", "PETG", "HF", null, "Dark Grey", 1, 820, true, false, FilamentHygroscopicLevel.MEDIUM, "Dry Box 1", "Bambu Lab Store", StockStatus.HEALTHY, false, false, "Still sealed."],
    ["Bambu Lab", "PETG", "HF", null, "Blue", 1, 430, true, false, FilamentHygroscopicLevel.MEDIUM, "Dry Box 1", "Bambu Lab Store", StockStatus.LOW, true, true, "Low after cable chain prototypes."],
    ["AnyCubic", "PETG", null, null, "Black", 3, 2120, true, false, FilamentHygroscopicLevel.MEDIUM, "Dry Box 2", "Amazon", StockStatus.HEALTHY, true, false, "Bulk black PETG reserve stock."],
    ["AnyCubic", "PETG", null, null, "Grey", 2, 1460, true, false, FilamentHygroscopicLevel.MEDIUM, "Dry Box 2", "Amazon", StockStatus.HEALTHY, true, false, "Functional neutral-color stock."],
    ["Overture", "PETG", null, "Transparent", "Clear", 1, 290, true, false, FilamentHygroscopicLevel.MEDIUM, "Dry Box 2", "Amazon", StockStatus.LOW, true, true, "Useful but almost done."],
    ["ELEGOO", "PETG", "Rapid", null, "Orange", 1, 870, true, false, FilamentHygroscopicLevel.MEDIUM, "Dry Box 2", "Amazon", StockStatus.HEALTHY, false, false, "Fresh spool for high-visibility shop parts."],
    ["Bambu Lab", "PETG-CF", null, null, "Titan Gray", 1, 690, true, true, FilamentHygroscopicLevel.HIGH, "Dryer Shelf", "Bambu Lab Store", StockStatus.HEALTHY, true, false, "Requires hardened nozzle and dry handling."],
    ["Bambu Lab", "ASA", null, null, "Blue", 1, 760, true, false, FilamentHygroscopicLevel.MEDIUM, "Vent Shelf", "Bambu Lab Store", StockStatus.HEALTHY, false, false, "Use only with exhaust fan running."],
    ["Sunlu", "ASA", null, null, "Black", 1, 430, true, false, FilamentHygroscopicLevel.MEDIUM, "Vent Shelf", "Amazon", StockStatus.LOW, true, true, "Open spool should be dried before next long print."],
    ["Bambu Lab", "TPU", "For AMS", null, "Black", 1, 530, true, false, FilamentHygroscopicLevel.HIGH, "Dryer Shelf", "Bambu Lab Store", StockStatus.HEALTHY, true, false, "AMS-friendly flexible stock."],
    ["Bambu Lab", "TPU", "90A", null, "White", 1, 770, true, false, FilamentHygroscopicLevel.HIGH, "Dryer Shelf", "Bambu Lab Store", StockStatus.HEALTHY, false, false, "Mostly sealed."],
    ["Bambu Lab", "TPU", "85A", null, "Neon Orange", 1, 360, true, false, FilamentHygroscopicLevel.HIGH, "Dryer Shelf", "Bambu Lab Store", StockStatus.LOW, true, true, "Very soft; dry before use."],
    ["Siraya Tech", "TPU", "85A", null, "Black", 1, 610, true, false, FilamentHygroscopicLevel.HIGH, "Dryer Shelf", "Amazon", StockStatus.HEALTHY, true, false, "Excellent grip material for flexible parts."],
  ];

  for (const entry of filamentEntries) {
    const [
      brand,
      materialType,
      subtype,
      finish,
      color,
      quantity,
      estimatedRemainingGrams,
      dryingRequired,
      abrasive,
      hygroscopicLevel,
      storageLocation,
      purchaseSource,
      status,
      opened,
      nearlyEmpty,
      notes,
    ] = entry;

    await prisma.filamentSpool.create({
      data: {
        brand,
        materialType,
        subtype,
        finish,
        color,
        quantity,
        estimatedRemainingGrams,
        compatibilityTags: materialType.includes("TPU")
          ? ["Flexible", "Dryer Recommended"]
          : materialType.includes("ASA")
            ? ["Ventilation Required", "Enclosed Printer"]
            : materialType.includes("PETG-CF")
              ? ["Abrasive", "Hardened Nozzle"]
              : ["General Purpose"],
        dryingRequired,
        abrasive,
        hygroscopicLevel,
        storageLocation,
        purchaseSource,
        status,
        opened,
        nearlyEmpty,
        notes,
        filamentRecommendation: {
          create: {
            recommendedNozzle: abrasive ? "Hardened Steel 0.4mm+" : "Standard 0.4mm",
            dryerSuggested:
              dryingRequired || hygroscopicLevel === FilamentHygroscopicLevel.HIGH,
            hardenedNozzleNeeded: Boolean(abrasive),
            notes:
              abrasive
                ? "Fiber-filled stock should stay on hardened hardware and be kept dry."
                : hygroscopicLevel === FilamentHygroscopicLevel.HIGH
                  ? "High moisture sensitivity; dry before long prints."
                  : "Routine dry storage is sufficient.",
          },
        },
      },
    });
  }

  const consumables = await Promise.all([
    ["Glue Stick", "Bed Prep", 3, "sticks", 2, StockStatus.HEALTHY, "Drawer 1", "Mostly used on smooth/cool plates."],
    ["P2S Silicone Sock for Hotend", "Hotend", 3, "pcs", 2, StockStatus.HEALTHY, "Parts Bin A", "Enough reserve stock."],
    ["Lubricant Oil", "Maintenance", 7, "bottles", 2, StockStatus.HEALTHY, "Drawer 2", "Used on rods and light moving assemblies."],
    ["Lubricant Grease", "Maintenance", 3, "tubes", 2, StockStatus.HEALTHY, "Drawer 2", "Lead screw service stock."],
    ["P2S Nozzle Wiping Pad", "Maintenance", 1, "pcs", 1, StockStatus.LOW, "Parts Bin A", "One installed, one replacement needed soon."],
    ["A1 Mini Heatbed Nozzle Wiper", "Maintenance", 1, "pcs", 1, StockStatus.HEALTHY, "Parts Bin A", "Spare on hand."],
    ["Replacement Filament Cutter", "AMS", 3, "pcs", 2, StockStatus.HEALTHY, "Parts Bin B", "Shared with AMS maintenance."],
    ["99% Isopropyl Alcohol", "Cleaning", 1.5, "litres", 1, StockStatus.HEALTHY, "Cleaning Shelf", "Main plate cleaning supply."],
    ["5lb Reusable Orange Indicating Silica Desiccant Beads", "Dry Storage", 1, "bag", 1, StockStatus.HEALTHY, "Dry Storage Shelf", "Still active but due for regeneration cycle soon."],
    ["100 Reusable Organza Bags", "Dry Storage", 42, "bags", 20, StockStatus.HEALTHY, "Dry Storage Shelf", "Used for AMS desiccant packs."],
    ["Desiccant for AMS Unit", "AMS", 4, "packs", 4, StockStatus.LOW, "Dry Storage Shelf", "Exactly at threshold; queue reorder if AMS HT goes live."],
    ["PTFE Tubes Various Sizes", "Motion", 4, "pcs", 2, StockStatus.HEALTHY, "Tube Rack", "Pre-cut spares."],
    ["PTFE Tubes 4m Bulk Length", "Motion", 1, "roll", 1, StockStatus.HEALTHY, "Tube Rack", "Bulk stock for custom runs."],
    ["P2S 4-in-1 PTFE Adapter", "AMS", 2, "pcs", 1, StockStatus.HEALTHY, "Parts Bin B", "One spare, one active."],
    ["Brass Brush", "Cleaning", 3, "pcs", 1, StockStatus.HEALTHY, "Drawer 1", "For nozzle cleanup while warm."],
  ].map(([name, category, quantity, unit, reorderThreshold, status, storageLocation, notes]) =>
    prisma.consumableItem.create({
      data: {
        name: name as string,
        slug: slugify(name as string),
        category: category as string,
        quantity: quantity as number,
        unit: unit as string,
        reorderThreshold: reorderThreshold as number,
        status: status as StockStatus,
        storageLocation: storageLocation as string,
        notes: notes as string,
      },
    }),
  ));

  const safetyEquipment = await Promise.all([
    prisma.safetyEquipment.create({
      data: {
        name: "Levoit Core 300-P w/ Toxin Absorber Filter",
        slug: "levoit-core-300-p-toxin-absorber",
        type: "Air Purifier",
        status: SafetyStatus.ACTIVE,
        replacementSchedule: "Filter check every 90 days",
        notes: "Covers room background filtration. Best paired with enclosure exhaust when running ASA.",
      },
    }),
    prisma.safetyEquipment.create({
      data: {
        name: "P2S External Exhaust Fan Kit (no filter or ducting yet)",
        slug: "p2s-external-exhaust-fan-kit",
        type: "Exhaust",
        status: SafetyStatus.NEEDS_ATTENTION,
        replacementSchedule: "Complete ducting install before sustained ASA production",
        notes: "Fan hardware is present, but window path and hose kit are still on the wishlist.",
      },
    }),
    prisma.safetyEquipment.create({
      data: {
        name: "P2S Rear Panel",
        slug: "p2s-rear-panel",
        type: "Structural Component",
        status: SafetyStatus.ACTIVE,
        notes: "Installed to finish enclosure path before exhaust routing.",
      },
    }),
  ]);

  await Promise.all([
    ["Set of M3 Screws, Nuts and Bolts (Raised Head)", "Fasteners", 1, "Hardware Wall", "Useful for jigs and fixture builds."],
    ["Set of M3 Screws, Nuts and Bolts (Flat Head)", "Fasteners", 1, "Hardware Wall", "Shared stock for low-profile assemblies."],
    ["M3 Heat Threaders", "Hardware Inserts", 1, "Hardware Wall", "Used for durable printed assemblies."],
    ["Electric Bubble Maker Kit 01", "Project Parts", 1, "Project Shelf", "Current side project parts bundle."],
  ].map(([name, category, quantity, storageLocation, notes]) =>
    prisma.toolPart.create({
      data: {
        name: name as string,
        slug: slugify(name as string),
        category: category as string,
        quantity: quantity as number,
        storageLocation: storageLocation as string,
        notes: notes as string,
      },
    }),
  ));

  await Promise.all([
    ["PA6-GF", "Filament", WishlistPriority.HIGH, 69.99, "Bambu Lab", "https://ca.store.bambulab.com/products/pa6-gf?id=45444548034800", "Needs hardened nozzle plus dry handling workflow.", WishlistStatus.RESEARCHING],
    ["LED Strips", "Workspace", WishlistPriority.MEDIUM, 39.99, "Amazon", null, "Task lighting for the printer bench and camera visibility.", WishlistStatus.PLANNED],
    ["Phone-controlled lighting", "Workspace", WishlistPriority.LOW, 69.99, "Amazon", null, "Could tie into scene presets for night prints.", WishlistStatus.PLANNED],
    ["IKEA Bror Work Bench", "Workspace", WishlistPriority.HIGH, 249.0, "IKEA", "https://www.ikea.com/ca/en/p/bror-work-bench-black-pine-plywood-30333286/#content", "Would improve spacing and vibration isolation.", WishlistStatus.READY_TO_BUY],
    ["Window Duct Cover", "Air Quality & Safety", WishlistPriority.CRITICAL, 24.99, "Hardware Store", null, "Required to complete external exhaust path.", WishlistStatus.READY_TO_BUY],
    ["Exhaust Hose", "Air Quality & Safety", WishlistPriority.CRITICAL, 29.99, "Amazon", null, "Match hose diameter to P2S fan outlet.", WishlistStatus.READY_TO_BUY],
    ["Hose Clamp", "Air Quality & Safety", WishlistPriority.HIGH, 8.99, "Hardware Store", null, "Needed once hose size is confirmed.", WishlistStatus.PLANNED],
    ["Backdraft Damper", "Air Quality & Safety", WishlistPriority.HIGH, 19.99, "HVAC Supply", null, "Prevents cold-air backflow through the window vent.", WishlistStatus.RESEARCHING],
    ["A1 Mini Enclosure", "Air Quality & Safety", WishlistPriority.MEDIUM, 89.99, "Fnatr", "https://www.fnatr.com/products/fnatr-3d-printer-enclosure-for-bambu-lab-a1-mini", "Useful if ASA or draft-sensitive materials move to the A1 Mini.", WishlistStatus.RESEARCHING],
  ].map(([name, category, priority, estimatedCost, vendor, purchaseUrl, notes, status]) =>
    prisma.wishlistItem.create({
      data: {
        name: name as string,
        slug: slugify(name as string),
        category: category as string,
        priority: priority as WishlistPriority,
        estimatedCost: estimatedCost as number,
        vendor: vendor as string,
        purchaseUrl: purchaseUrl as string | null,
        notes: notes as string,
        status: status as WishlistStatus,
      },
    }),
  ));

  const [ipa, desiccant, grease, wipingPad] = [
    consumables.find((item) => item.name === "99% Isopropyl Alcohol"),
    consumables.find((item) => item.name === "Desiccant for AMS Unit"),
    consumables.find((item) => item.name === "Lubricant Grease"),
    consumables.find((item) => item.name === "P2S Nozzle Wiping Pad"),
  ];

  await prisma.maintenanceLog.create({
    data: {
      date: new Date("2026-03-18T10:15:00.000Z"),
      actionType: MaintenanceActionType.BED_CLEANING,
      actionPerformed: "Cleaned A1 Mini dual-sided build plate and re-leveled surface.",
      notes: "Removed matte PLA residue after several organizer bin prints.",
      printerId: printers[0].id,
      buildPlateId: plates[2].id,
      consumablesUsed: {
        create: ipa
          ? [
              {
                consumableItemId: ipa.id,
                quantityUsed: 0.02,
                unit: "litres",
              },
            ]
          : [],
      },
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      date: new Date("2026-03-16T15:30:00.000Z"),
      actionType: MaintenanceActionType.NOZZLE_SWAP,
      actionPerformed: "Installed 0.4mm hardened steel hotend on A1 Mini.",
      notes: "Swapped in anticipation of PETG-CF and abrasive experiments.",
      printerId: printers[0].id,
      hotendId: hotends[1].id,
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      date: new Date("2026-03-14T19:40:00.000Z"),
      actionType: MaintenanceActionType.LUBRICATION,
      actionPerformed: "Lubricated P2S motion system and inspected belts.",
      notes: "No unusual wear; next check in roughly 150 print hours.",
      printerId: printers[1].id,
      consumablesUsed: {
        create: grease
          ? [
              {
                consumableItemId: grease.id,
                quantityUsed: 0.1,
                unit: "tubes",
              },
            ]
          : [],
      },
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      date: new Date("2026-03-13T17:00:00.000Z"),
      actionType: MaintenanceActionType.DESICCANT_REFRESH,
      actionPerformed: "Repacked AMS Lite desiccant bags with regenerated beads.",
      notes: "Humidity indicator was trending up after several PETG runs.",
      materialSystemId: materialSystems[0].id,
      consumablesUsed: {
        create: desiccant
          ? [
              {
                consumableItemId: desiccant.id,
                quantityUsed: 1,
                unit: "packs",
              },
            ]
          : [],
      },
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      date: new Date("2026-03-12T20:20:00.000Z"),
      actionType: MaintenanceActionType.WIPER_REPLACEMENT,
      actionPerformed: "Inspected P2S nozzle wiping pad and flagged reorder.",
      notes: "Still usable, but replacement should be ordered before the next service cycle.",
      printerId: printers[1].id,
      consumablesUsed: {
        create: wipingPad
          ? [
              {
                consumableItemId: wipingPad.id,
                quantityUsed: 0,
                unit: "pcs",
              },
            ]
          : [],
      },
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      date: new Date("2026-03-11T14:10:00.000Z"),
      actionType: MaintenanceActionType.EXHAUST_UPDATE,
      actionPerformed: "Test-fitted P2S exhaust fan kit and measured window route.",
      notes: "Duct cover and hose are still missing; wishlist priorities updated.",
      printerId: printers[1].id,
      safetyEquipmentId: safetyEquipment[1].id,
    },
  });

  console.log("Makerventory seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
