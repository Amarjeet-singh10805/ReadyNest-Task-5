import { Suspense } from 'react';
import AcceptInvitationContent from './AcceptInvitationContent';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
