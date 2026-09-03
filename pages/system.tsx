import GroupPage from "../components/app/GroupPage";
import UsersScreen from "../components/screens/Users";
import SettingsScreen from "../components/screens/Settings";
import AuditLogScreen from "../components/screens/AuditLog";

export default function System() {
  return (
    <GroupPage group="system" render={(screen) => {
      if (screen === "users") return <UsersScreen />;
      if (screen === "settings") return <SettingsScreen />;
      if (screen === "audit") return <AuditLogScreen />;
      return null;
    }} />
  );
}
