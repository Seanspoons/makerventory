import { NextResponse } from "next/server";

const templates: Record<string, string> = {
  printer: [
    "name,brand,model,buildVolumeX,buildVolumeY,buildVolumeZ,location,status,notes",
    'Bambu Lab A1 Mini,Bambu Lab,A1 Mini,180,180,180,Workbench,ACTIVE,"Primary small-format printer"',
  ].join("\n"),
  material_system: [
    "name,type,status,supportedMaterialsNotes,notes",
    'Bambu Lab AMS Lite,AMS_LITE,ACTIVE,"PLA, PETG","Four-slot feeder"',
  ].join("\n"),
  build_plate: [
    "name,sizeLabel,sizeMm,surfaceType,status,notes",
    'Bambu Lab Textured Build Plate 180mm,180mm,180,Textured,AVAILABLE,"A1 Mini compatible"',
  ].join("\n"),
  hotend: [
    "name,nozzleSize,materialType,quantity,inUseCount,spareCount,status,notes",
    'A1 Mini 0.4mm Hardened Steel,0.4,Hardened Steel,1,1,0,IN_USE,"Current abrasive-ready setup"',
  ].join("\n"),
  filament: [
    "brand,materialType,color,quantity,estimatedRemainingGrams,abrasive,dryingRequired,hygroscopicLevel,storageLocation,notes,recommendedNozzle,dryerSuggested,hardenedNozzleNeeded,recommendationNotes",
    'Polymaker,PLA,Army Green,2,1000,false,false,LOW,Shelf A,"Primary prototyping stock",Standard 0.4mm,false,false,"General purpose PLA"',
  ].join("\n"),
  consumable: [
    "name,category,quantity,unit,reorderThreshold,status,storageLocation,notes",
    'Isopropyl Alcohol,Cleaning,2,bottle,1,HEALTHY,Cabinet,"99 percent IPA"',
  ].join("\n"),
  safety: [
    "name,type,status,replacementSchedule,notes",
    'Levoit Core 300-P,Air Filter,ACTIVE,Every 6 months,"Primary filtration unit"',
  ].join("\n"),
  smart_plug: [
    "name,assignedDeviceLabel,status,powerMonitoringCapable,notes",
    'Printer Bench Plug,A1 Mini,ONLINE,false,"Main printer power control"',
  ].join("\n"),
  tool_part: [
    "name,category,quantity,storageLocation,notes",
    'M3 Socket Head Screws,Hardware,120,Drawer 4,"Mixed lengths"',
  ].join("\n"),
  wishlist: [
    "name,category,priority,estimatedCost,vendor,purchaseUrl,status,notes",
    'PA6-GF,Filament,HIGH,79.99,Bambu Lab,https://example.com,RESEARCHING,"Wanted for stronger functional prints"',
  ].join("\n"),
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;
  const content = templates[entity];

  if (!content) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entity}-template.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
