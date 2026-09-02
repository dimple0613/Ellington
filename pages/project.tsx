import { useRouter } from "next/router";
import GroupPage from "../components/app/GroupPage";
import InventoryScreen from "../components/screens/Inventory";
import UnitScreen from "../components/screens/Unit";
import PricingScreen from "../components/screens/Pricing";
import ConstructionScreen from "../components/screens/Construction";

export default function Project() {
  const router = useRouter();
  const unitId = typeof router.query.unit === "string" ? router.query.unit : undefined;

  const openUnit = (id: string) => {
    const q: Record<string, string> = {};
    Object.entries(router.query).forEach(([k, v]) => {
      if (typeof v === "string" && v) q[k] = v;
    });
    q.s = "unit";
    q.unit = id;
    router.push({ pathname: "/project", query: q }, undefined, { shallow: true });
  };

  return (
    <GroupPage
      group="project"
      render={(screen, scope) => {
        if (screen === "inventory") return <InventoryScreen scope={scope} onSelectUnit={openUnit} />;
        if (screen === "unit") return <UnitScreen scope={scope} unitId={unitId} onSelectUnit={openUnit} />;
        if (screen === "pricing") return <PricingScreen scope={scope} />;
        if (screen === "construction") return <ConstructionScreen scope={scope} />;
        return null;
      }}
    />
  );
}