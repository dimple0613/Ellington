import { useRouter } from "next/router";
import GroupPage from "../components/app/GroupPage";
import PaymentsScreen from "../components/screens/Payments";
import CollectionsScreen from "../components/screens/Collections";
import EscrowScreen from "../components/screens/Escrow";

export default function Finance() {
  const router = useRouter();
  const buyer = typeof router.query.buyer === "string" ? router.query.buyer : undefined;
  return (
    <GroupPage group="finance" render={(screen) => {
      if (screen === "payments") return <PaymentsScreen buyer={buyer} />;
      if (screen === "collections") return <CollectionsScreen />;
      if (screen === "escrow") return <EscrowScreen />;
      return null;
    }} />
  );
}
