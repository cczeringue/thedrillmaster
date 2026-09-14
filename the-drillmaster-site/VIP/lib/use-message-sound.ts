import { useCallback, useEffect, useRef, useState } from 'react';

export function useMessageSound() {
  const player = useRef<HTMLAudioElement | null>(null);
  const enabled = useRef(true);
  const [sound, setSound] = useState<'on' | 'off' | 'blocked'>('blocked');

  useEffect(() => {
    const audio = new Audio('/VIP/assets/grindr-notification.mp3');
    audio.preload = 'auto';
    audio.volume = 0.55;
    player.current = audio;
    return () => { audio.pause(); player.current = null; };
  }, []);

  const play = useCallback(() => {
    const audio = player.current;
    if (!audio || !enabled.current) return;
    audio.currentTime = 0;
    void audio.play().then(() => {
      if (enabled.current) setSound('on');
    }).catch(() => {
      if (enabled.current) setSound('blocked');
    });
  }, []);

  const toggle = useCallback(() => {
    if (sound === 'on') {
      enabled.current = false;
      player.current?.pause();
      setSound('off');
    } else {
      enabled.current = true;
      play(); // A direct click unlocks audio in browsers that block autoplay.
    }
  }, [sound, play]);

  return { play, sound, toggle };
}
