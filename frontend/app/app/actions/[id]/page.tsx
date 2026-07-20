import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Container } from '@/components/ui/Primitives';
import ActionSummary from '@/components/app/ActionSummary';

export const metadata = {
  title: 'Action Monitor',
  description: 'Monitor a live Bondsman action and receipt state.',
};

export const revalidate = 10;

export default async function ActionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let action;
  try {
    action = await api.action(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }

  return (
    <Container className="py-14 lg:py-20">
      <ActionSummary action={action} />
    </Container>
  );
}
