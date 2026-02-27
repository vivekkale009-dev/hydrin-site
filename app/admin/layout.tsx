import DbStatus from '@/components/DbStatus';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <DbStatus />
      {children}
    </>
  );
}