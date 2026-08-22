export const dynamic = "force-dynamic";
import { Metadata } from "next";
import nextDynamic from 'next/dynamic'
const ClasificacionABCClientPage = nextDynamic(() => import('./page.client'))

export const metadata: Metadata = {
  title: "Clasificación ABC | Gestie",
  description: "Clasificación ABC de productos",
};

export default function ClasificacionABCPage() {
  return <ClasificacionABCClientPage />;
}
