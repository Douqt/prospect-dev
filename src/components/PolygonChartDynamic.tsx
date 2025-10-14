import dynamic from 'next/dynamic';

interface PolygonChartDynamicProps {
  symbol: string;
}

export const PolygonChartDynamic = dynamic<PolygonChartDynamicProps>(
  () => import('./PolygonChart').then(mod => ({ default: mod.PolygonChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#e0a815]"></div>
      </div>
    )
  }
);
