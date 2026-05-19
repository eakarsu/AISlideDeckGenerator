import React from 'react';
import DeckCreationByTemplateChart from '../components/DeckCreationByTemplateChart';
import TemplateUsageHeatmap from '../components/TemplateUsageHeatmap';
import SlideLibraryExport from '../components/SlideLibraryExport';
import BrandRulesEditor from '../components/BrandRulesEditor';

export default function CustomViewsPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }} data-testid="custom-views-page">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Deck Views</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
          Custom views: deck creation analytics, template usage, slide library export, and brand rule management.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 16 }}>
        <DeckCreationByTemplateChart />
        <TemplateUsageHeatmap />
      </div>

      <div style={{ marginTop: 8 }}>
        <SlideLibraryExport />
        <BrandRulesEditor />
      </div>
    </div>
  );
}
