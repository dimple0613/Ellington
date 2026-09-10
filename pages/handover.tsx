import { useRouter } from "next/router";
import GroupPage from "../components/app/GroupPage";
import PipelineScreen from "../components/screens/Pipeline";
import SnaggingScreen from "../components/screens/Snagging";
import DeedsScreen from "../components/screens/Deeds";

export default function Handover() {
  const router = useRouter();
  return (
    <GroupPage group="handover" render={(screen, scope) => {
      if (screen === "pipeline") return <PipelineScreen scope={scope} />;
      if (screen === "snagging") return <SnaggingScreen scope={scope} />;
      if (screen === "deeds") return <DeedsScreen scope={scope} />;
      return <PipelineScreen scope={scope} />;
    }} />
  );
}

export const getServerSideProps = async () => ({ props: {} });
