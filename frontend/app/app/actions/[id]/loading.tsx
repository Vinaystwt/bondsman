import { Container } from '@/components/ui/Primitives';
import { SkeletonPanel } from '@/components/ui/States';

export default function ActionLoading() {
  return (
    <Container className="py-14">
      <SkeletonPanel rows={8} />
    </Container>
  );
}
