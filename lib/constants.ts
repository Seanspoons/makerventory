import { Layers3, Package, ShieldCheck, ShoppingCart, Wrench } from "lucide-react";

export const navigation = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: Layers3 }],
  },
  {
    title: "Operations",
    items: [
      { label: "Printers", href: "/printers", icon: Layers3 },
      { label: "Material Systems", href: "/material-systems", icon: Layers3 },
      { label: "Build Plates", href: "/build-plates", icon: Layers3 },
      { label: "Hotends", href: "/hotends", icon: Layers3 },
      { label: "Filament", href: "/filament", icon: Package },
      { label: "Consumables", href: "/consumables", icon: Package },
      { label: "Safety", href: "/safety", icon: ShieldCheck },
      { label: "Smart Plugs", href: "/smart-plugs", icon: Layers3 },
      { label: "Tools / Parts", href: "/tools-parts", icon: Wrench },
      { label: "Wishlist", href: "/wishlist", icon: ShoppingCart },
      { label: "Maintenance Logs", href: "/maintenance", icon: Wrench },
    ],
  },
];
