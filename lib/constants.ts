import type { Route } from "next";
import { DatabaseZap, Layers3, Package, ShieldCheck, ShoppingCart, Wrench } from "lucide-react";

export const navigation = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/" as Route, icon: Layers3 }],
  },
  {
    title: "Operations",
    items: [
      { label: "Printers", href: "/printers" as Route, icon: Layers3 },
      { label: "Material Systems", href: "/material-systems" as Route, icon: Layers3 },
      { label: "Build Plates", href: "/build-plates" as Route, icon: Layers3 },
      { label: "Hotends", href: "/hotends" as Route, icon: Layers3 },
      { label: "Filament", href: "/filament" as Route, icon: Package },
      { label: "Consumables", href: "/consumables" as Route, icon: Package },
      { label: "Safety", href: "/safety" as Route, icon: ShieldCheck },
      { label: "Smart Plugs", href: "/smart-plugs" as Route, icon: Layers3 },
      { label: "Tools / Parts", href: "/tools-parts" as Route, icon: Wrench },
      { label: "Wishlist", href: "/wishlist" as Route, icon: ShoppingCart },
      { label: "Maintenance Logs", href: "/maintenance" as Route, icon: Wrench },
      { label: "Imports", href: "/imports" as Route, icon: DatabaseZap },
    ],
  },
];
