import MasterDataManager from "@/components/admin/MasterDataManager";

export default function AdminClients() {
  return <MasterDataManager resourceLabel="Client" resourceLabelPlural="Clients" apiBasePath="/clients" />;
}
