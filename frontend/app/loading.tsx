import { Container } from '@/components/ui/Primitives';
import { SkeletonPanel } from '@/components/ui/States';

export default function RootLoading() {
  return (
    <Container className="py-14">
      <SkeletonPanel rows={5} />
    </Container>
  );
}
