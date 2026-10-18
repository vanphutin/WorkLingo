// Speech is global to the page. Media and speech share one owner so an old
// component's cleanup cannot interrupt a newer player.
class PlaybackOwnership {
  private current: { owner: symbol; cancel: () => void } | null = null;

  claim(owner: symbol, cancel: () => void) {
    const previous = this.current;
    this.current = null;
    previous?.cancel();
    this.current = { owner, cancel };
  }

  owns(owner: symbol) { return this.current?.owner === owner; }

  finish(owner: symbol) {
    if (this.owns(owner)) this.current = null;
  }

  stop(owner: symbol) {
    if (!this.owns(owner)) return;
    const previous = this.current;
    this.current = null;
    previous?.cancel();
  }
}

export const playbackOwnership = new PlaybackOwnership();

const mediaOwners = new WeakMap<HTMLMediaElement, symbol>();
let mediaSubscribers = 0;

function mediaOwner(media: HTMLMediaElement) {
  let owner = mediaOwners.get(media);
  if (!owner) {
    owner = Symbol('native-media');
    mediaOwners.set(media, owner);
  }
  return owner;
}

export function claimMediaPlayback(media: HTMLMediaElement) {
  const owner = mediaOwner(media);
  if (!playbackOwnership.owns(owner)) playbackOwnership.claim(owner, () => media.pause());
}

export function stopMediaPlayback(media: HTMLMediaElement) {
  playbackOwnership.stop(mediaOwner(media));
}

function onMediaPlay(event: Event) {
  if (event.target instanceof HTMLMediaElement) claimMediaPlayback(event.target);
}

function onMediaFinish(event: Event) {
  if (event.target instanceof HTMLMediaElement) playbackOwnership.finish(mediaOwner(event.target));
}

// Capture also covers existing native players outside the audio feature. Their
// play events do not bubble. Only one listener set exists for the whole page.
export function subscribeNativeMedia(): () => void {
  if (mediaSubscribers++ === 0) {
    document.addEventListener('play', onMediaPlay, true);
    document.addEventListener('ended', onMediaFinish, true);
    document.addEventListener('error', onMediaFinish, true);
  }
  return () => {
    if (--mediaSubscribers === 0) {
      document.removeEventListener('play', onMediaPlay, true);
      document.removeEventListener('ended', onMediaFinish, true);
      document.removeEventListener('error', onMediaFinish, true);
    }
  };
}
