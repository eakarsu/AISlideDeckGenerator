import React, { act } from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot } from 'react-dom/client';
import CrudPage from './components/CrudPage';
import SlideLibraryExport from './components/SlideLibraryExport';
import DeckCreationByTemplateChart from './components/DeckCreationByTemplateChart';
import TemplateUsageHeatmap from './components/TemplateUsageHeatmap';
import BrandRulesEditor from './components/BrandRulesEditor';
import AIReport from './components/AIReport';
import { AIResultValue } from './components/AIResultView';
import { completeExample } from './components/AIFieldPresets';
import { workspaceFields, workspacePresets } from './components/AIWorkspace';
import api from './services/api';

jest.mock('./services/api', () => ({ get: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let host;
let root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  api.get.mockReset();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
const render = async (element) => {
  await act(async () => root.render(element));
  await act(async () => { await Promise.resolve(); });
};
const seed = fs.readFileSync(path.join(process.cwd(), '../backend/seeds/seed.js'), 'utf8');
const slideSection = seed.match(/const slides = \[([\s\S]*?)\n  \];/)[1];
const records = [...slideSection.matchAll(/^\s*\[\d+,\s*\d+,\s*'([^']+)'/gm)].map((match, index) => ({ id: index + 1, title: match[1] }));
const templateSection = seed.match(/const templates = \[([\s\S]*?)\n  \];/)[1];
const templateNames = [...templateSection.matchAll(/^\s*\['([^']+)'/gm)].map((match) => match[1]);

test('CRUD list renders 15 paginated records', async () => {
  api.get.mockResolvedValue({ data: { data: records, pagination: { page: 1, total: 15 } } });
  await render(<CrudPage title="Slides" apiPath="slides" columns={['title']} fields={[]} />);
  expect(host.querySelectorAll('tbody tr')).toHaveLength(15);
  expect(host.textContent).toContain('15 items');
});

test('custom record views render project seed rows from valid API payloads', async () => {
  const slideNames = records.map(row => row.title);
  api.get.mockImplementation((path) => {
    if (path.includes('deck-creation')) return Promise.resolve({ data: { title: 'Decks', labels: templateNames, values: templateNames.map(() => 1) } });
    if (path.includes('heatmap')) return Promise.resolve({ data: { title: 'Usage', templates: templateNames, teams: ['Team'], matrix: templateNames.map(() => [1]) } });
    if (path.includes('brand-rules')) return Promise.resolve({ data: { data: ['Default Brand Rule', 'Pitch Deck Rule', 'Corporate Rule'].map((name, index) => ({ id: index + 1, name, fonts: [], colors: [] })) } });
    if (path.includes('slide-library')) return Promise.resolve({ data: { title: 'Slides', pages: slideNames.map((title, index) => ({ page: index + 1, title })) } });
    throw new Error(path);
  });
  await render(<><DeckCreationByTemplateChart /><TemplateUsageHeatmap /><BrandRulesEditor /><SlideLibraryExport /></>);
  expect(host.querySelectorAll('[data-testid="viz-deck-by-template"] [title]')).toHaveLength(15);
  expect(host.querySelectorAll('[data-testid="viz-template-heatmap"] tbody tr')).toHaveLength(15);
  expect(host.querySelectorAll('[data-testid="nonviz-brand-rules-editor"] tbody tr')).toHaveLength(3);
  await act(async () => host.querySelector('[data-testid="nonviz-slide-library-export"] button').click());
  expect(host.textContent).toContain('Page 15:');
});

test('returned and saved structured reports retain false, zero, empty strings and tables', async () => {
  const result = { review_status: { approved: false, score: 0, note: '' }, recommendations: [{ slide: 'Welcome & Agenda', action: 'Clarify opening' }, { slide: 'Revenue Highlights', action: 'Label chart' }] };
  await render(<><AIResultValue value={result} /><AIReport response={{ result }} title="Saved deck report" /></>);
  expect(host.textContent).toContain('Review status');
  expect(host.textContent).toContain('ApprovedNo');
  expect(host.textContent).toContain('0');
  expect(host.textContent).toContain('Note');
  expect(host.textContent).toContain('Empty string');
  expect(host.querySelectorAll('table tbody tr')).toHaveLength(4);
  expect(host.querySelectorAll('th').length).toBeGreaterThanOrEqual(4);
});

test('three preset variants fill required and optional fields without submitting or inventing references', () => {
  const fields = [
    { key: 'brief', required: true },
    { key: 'notes' },
    { key: 'presentation_id', required: true, recordReference: true },
    { key: 'upload', type: 'file' },
  ];
  const upload = new File(['fixture'], 'existing.txt');
  for (let index = 0; index < 3; index++) {
    const values = completeExample(fields, { values: { brief: 'Review this deck' } }, index, 'deck review', { presentation_id: 7, upload });
    expect(values.brief).toBe('Review this deck');
    expect(values.notes).toBeTruthy();
    expect(values.presentation_id).toBe(7);
    expect(values.upload).toBe(upload);
    expect(completeExample(fields, {}, index).presentation_id).toBe('');
    const workspace = workspacePresets({ title: 'Deck review' })[index].values;
    expect(workspaceFields.every((field) => workspace[field.key] !== undefined && workspace[field.key] !== '')).toBe(true);
  }
  expect(api.get).not.toHaveBeenCalled();
});
