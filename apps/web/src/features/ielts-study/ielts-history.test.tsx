import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ieltsFlowClient } from '../../lib/api/ielts-flow-client';
import { IeltsHistory } from './ielts-history';
vi.mock('../../lib/api/ielts-flow-client',()=>({ieltsFlowClient:{history:vi.fn()}}));
afterEach(cleanup);
it('keeps pinned legacy links and loads the next server cursor',async()=>{
  vi.mocked(ieltsFlowClient.history).mockResolvedValueOnce({items:[{id:'id',kind:'legacy-integrated',title:'Earlier 60-minute study',href:'/ielts/practice/owned',updatedAt:new Date().toISOString(),state:'in-progress'}],nextCursor:'opaque'}).mockResolvedValueOnce({items:[],nextCursor:null});
  render(<IeltsHistory />);
  expect(await screen.findByRole('link',{name:'Earlier 60-minute study'})).toHaveAttribute('href','/ielts/practice/owned');
  fireEvent.click(screen.getByRole('button',{name:'Load more history'}));
  expect(ieltsFlowClient.history).toHaveBeenLastCalledWith('opaque');
});
