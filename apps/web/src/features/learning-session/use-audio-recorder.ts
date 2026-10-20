'use client';

import { useT } from '../../i18n/provider';
import { learningSessionMessages } from '../../i18n/messages/learningSession';

import { useCallback, useEffect, useRef, useState } from 'react';

const SUPPORTED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/wav',
] as const;

export type AudioRecorderStatus =
  | 'unsupported'
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'preview'
  | 'error';

export interface AudioRecorderState {
  readonly blob: Blob | null;
  readonly discard: () => void;
  readonly error: string | null;
  readonly mimeType: string | null;
  readonly previewUrl: string | null;
  readonly start: () => Promise<void>;
  readonly status: AudioRecorderStatus;
  readonly stop: () => void;
  readonly supported: boolean;
}

const hasRecorderSupport = (): boolean =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof MediaRecorder !== 'undefined' &&
  selectMimeType() !== null;

const selectMimeType = (): string | null => {
  if (typeof MediaRecorder === 'undefined') return null;
  if (typeof MediaRecorder.isTypeSupported !== 'function') return 'audio/webm';
  return SUPPORTED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
};

export function useAudioRecorder(): AudioRecorderState {
  const t = useT('learningSession', learningSessionMessages);
  const supported = hasRecorderSupport();
  const [status, setStatus] = useState<AudioRecorderStatus>(supported ? 'idle' : 'unsupported');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [errorKey, setError] = useState<'microphoneDenied' | 'microphoneError' | null>(null);
  const activeRef = useRef(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setBlob(null);
  }, []);

  const discard = useCallback(() => {
    revokePreview();
    setError(null);
    setStatus(supported ? 'idle' : 'unsupported');
  }, [revokePreview, supported]);

  const start = useCallback(async () => {
    if (!supported) {
      setStatus('unsupported');
      return;
    }
    revokePreview();
    setError(null);
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activeRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const selectedMimeType = selectMimeType();
      if (!selectedMimeType) throw new Error('No supported recording format is available.');
      const recorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
      const chunks: Blob[] = [];
      recorderRef.current = recorder;
      setMimeType(recorder.mimeType || selectedMimeType);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const recordedBlob = new Blob(chunks, { type: recorder.mimeType || selectedMimeType || 'audio/webm' });
        const url = URL.createObjectURL(recordedBlob);
        previewUrlRef.current = url;
        setBlob(recordedBlob);
        setPreviewUrl(url);
        setStatus('preview');
        recorderRef.current = null;
      };
      recorder.start();
      setStatus('recording');
    } catch (caught) {
      releaseStream();
      const denied = caught instanceof DOMException && caught.name === 'NotAllowedError';
      setError(denied
        ? 'microphoneDenied'
        : 'microphoneError');
      setStatus('error');
    }
  }, [releaseStream, revokePreview, supported]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    releaseStream();
  }, [releaseStream]);

  useEffect(() => { activeRef.current = true; return () => {
    activeRef.current = false;
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    releaseStream();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }; }, [releaseStream]);

  return { blob, discard, error: errorKey ? t(errorKey) : null, mimeType, previewUrl, start, status, stop, supported };
}
