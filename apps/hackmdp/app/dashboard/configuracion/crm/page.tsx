export const dynamic = "force-dynamic";
import nextDynamic from "next/dynamic";

const CrmConfigClient = nextDynamic(() => import("./page.client"));

export default function CrmConfigPage() {
  return <CrmConfigClient />;
}
