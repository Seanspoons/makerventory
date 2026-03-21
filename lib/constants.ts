import type { Route } from "next";
import {
  CircleUserRound,
  DatabaseZap,
  LayoutGrid,
  Layers3,
  Package,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Wrench,
} from "lucide-react";

export const navigation = [
  {
    title: "Overview",
    items: [{ label: "Control Center", href: "/dashboard" as Route, icon: LayoutGrid }],
  },
  {
    title: "Inventory",
    items: [
      { label: "Printers", href: "/printers" as Route, icon: Layers3 },
      { label: "Filament", href: "/filament" as Route, icon: Package },
      { label: "Build Plates", href: "/build-plates" as Route, icon: Layers3 },
      { label: "Hotends", href: "/hotends" as Route, icon: Layers3 },
      { label: "Material Systems", href: "/material-systems" as Route, icon: Layers3 },
      { label: "Consumables", href: "/consumables" as Route, icon: Package },
      { label: "Safety", href: "/safety" as Route, icon: ShieldCheck },
      { label: "Tools / Parts", href: "/tools-parts" as Route, icon: Wrench },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Maintenance", href: "/maintenance" as Route, icon: Wrench },
      { label: "Import Jobs", href: "/imports" as Route, icon: DatabaseZap },
      { label: "History", href: "/audit" as Route, icon: ScrollText },
    ],
  },
  {
    title: "Planning",
    items: [
      { label: "Wishlist", href: "/wishlist" as Route, icon: ShoppingCart },
      { label: "Smart Plugs", href: "/smart-plugs" as Route, icon: Layers3 },
    ],
  },
  {
    title: "Settings",
    items: [{ label: "My Account", href: "/account" as Route, icon: CircleUserRound }],
  },
];
