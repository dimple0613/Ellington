import GroupPage from "../components/app/GroupPage";
import Sales from "../components/screens/Sales";

export default function SalesPage() {
  return <GroupPage group="sales" render={(screen, scope) => <Sales scope={scope} />} />;
}