import BannerForm from '../../../../../../components/admin/BannerForm';
import { getAllBanners } from '../../../../../../lib/banners-store';

export default async function AdminNewBannerPage() {
  const banners = await getAllBanners();
  const nextSortOrder =
    banners.length > 0 ? Math.max(...banners.map((banner) => banner.sortOrder)) + 1 : 1;

  return <BannerForm mode="create" nextSortOrder={nextSortOrder} />;
}
