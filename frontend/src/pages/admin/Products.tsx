import MasterDataManager from "@/components/admin/MasterDataManager";

export default function AdminProducts() {
  return <MasterDataManager resourceLabel="Product" resourceLabelPlural="Products" apiBasePath="/products" />;
}
