import { notFound } from 'next/navigation';
import BannerForm from '../../../../../../../components/admin/BannerForm';
import { getBannerById } from '../../../../../../../lib/banners-store';

export default async function AdminEditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const banner = await getBannerById(id);

  if (!banner) {
    notFound();
  }

  return <BannerForm mode="edit" initialBanner={banner} />;
}
