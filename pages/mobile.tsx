import GroupPage from "../components/app/GroupPage";
import MobileScreen from "../components/screens/Mobile";

export default function Mobile() {
  return (
    <GroupPage group="mobile" render={(screen) => {
      if (screen === "mobile") return <MobileScreen />;
      return null;
    }} />
  );
}
