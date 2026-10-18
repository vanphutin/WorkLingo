import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ieltsMockClient } from '../../lib/api/ielts-mock-client';
import { MockAudioPlayer } from './mock-audio-player';
vi.mock('../../lib/api/ielts-mock-client', () => ({ ieltsMockClient: { activatePlayback:vi.fn(), playback: vi.fn(), currentPlayback: vi.fn() } }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });
it('does not autoplay or create a lease on mount and restores the same lease after a failed play', async () => {
  vi.mocked(ieltsMockClient.currentPlayback).mockResolvedValue(null);
  vi.mocked(ieltsMockClient.playback).mockResolvedValue({ id: 'lease', streamUrl: '/api/v1/audio?leaseId=lease', expiresAt: new Date(Date.now()+30000).toISOString(), remainingSeconds: 20 });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(new Error('transport')).mockResolvedValue();
  render(<MockAudioPlayer attemptId="attempt" assetId="asset" part={1} strict paused={false} />);
  const button = await screen.findByRole('button', { name: 'Play listening part 1' });
  await waitFor(() => expect(button).toBeEnabled());
  expect(ieltsMockClient.playback).not.toHaveBeenCalled();
  expect(document.querySelector('audio')).not.toHaveAttribute('controls');
  fireEvent.click(button);
  expect(await screen.findByRole('alert')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Play listening part 1' }));
  await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2));
  expect(ieltsMockClient.playback).toHaveBeenCalledTimes(1);
});

it('activates the reserved lease only after actual playback succeeds',async()=>{
 vi.mocked(ieltsMockClient.currentPlayback).mockResolvedValue(null);
 const lease={id:'lease',streamUrl:'/stream',expiresAt:new Date(Date.now()+60000).toISOString(),remainingSeconds:20};
 vi.mocked(ieltsMockClient.playback).mockResolvedValue(lease);vi.mocked(ieltsMockClient.activatePlayback).mockResolvedValue(lease);
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
 render(<MockAudioPlayer attemptId="attempt" assetId="asset" part={1} strict paused={false}/>);
 const button=await screen.findByRole('button',{name:'Play listening part 1'});await waitFor(()=>expect(button).toBeEnabled());
 expect(ieltsMockClient.activatePlayback).not.toHaveBeenCalled();fireEvent.click(button);
 await waitFor(()=>expect(ieltsMockClient.activatePlayback).toHaveBeenCalledWith('attempt','asset','lease'));
});
