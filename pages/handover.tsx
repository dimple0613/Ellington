import { useRouter } from "next/router";
import GroupPage from "../components/app/GroupPage";
import PipelineScreen from "../components/screens/Pipeline";
import SnaggingScreen from "../components/screens/Snagging";
import DeedsScreen from "../components/screens/Deeds";

export default function Handover() {
  const router = useRouter();
  return (
    <GroupPage group="handover" render={(screen) => {
      if (screen === "pipeline") return <PipelineScreen />;
      if (screen === "snagging") return <SnaggingScreen />;
      if (screen === "deeds") return <DeedsScreen />;
      return <PipelineScreen />;
    }} />
  );
}
