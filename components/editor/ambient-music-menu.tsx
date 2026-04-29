"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Music4, Pause, Play, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AmbientTrackId =
  | "lofi-drift"
  | "deep-house"
  | "late-jazz"
  | "rain-noise"
  | "ocean-noise"
  | "forest-noise";

type AmbientTrackKind = "music" | "soundscape";

interface AmbientTrackDefinition {
  id: AmbientTrackId;
  kind: AmbientTrackKind;
  label: string;
  subtitle: string;
  src: string;
}

const STORAGE_PREFIX = "slideboard-ambient-music";

const TRACKS: AmbientTrackDefinition[] = [
  {
    id: "lofi-drift",
    kind: "music",
    label: "Lo-fi Drift",
    subtitle: "CC0 mellow beat",
    src: "/audio/chill-lofi-inspired.ogg",
  },
  {
    id: "deep-house",
    kind: "music",
    label: "Deep House",
    subtitle: "CC0 synth house loop",
    src: "/audio/synthwave-house-loop.ogg",
  },
  {
    id: "late-jazz",
    kind: "music",
    label: "Late Jazz",
    subtitle: "CC0 jazzy lo-fi groove",
    src: "/audio/funky-hip-hop-lofi-jam.ogg",
  },
  {
    id: "rain-noise",
    kind: "soundscape",
    label: "Rain",
    subtitle: "CC0 steady rain",
    src: "/audio/ambient-rain.wav",
  },
  {
    id: "ocean-noise",
    kind: "soundscape",
    label: "Ocean",
    subtitle: "CC0 gentle waves",
    src: "/audio/gentle-ocean-waves.wav",
  },
  {
    id: "forest-noise",
    kind: "soundscape",
    label: "Forest",
    subtitle: "CC0 birds and leaves",
    src: "/audio/sunny-forest-ambience.wav",
  },
];

const MUSIC_TRACKS = TRACKS.filter((track) => track.kind === "music");
const SOUNDSCAPE_TRACKS = TRACKS.filter((track) => track.kind === "soundscape");

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getStorageKey(presentationId: string): string {
  return `${STORAGE_PREFIX}:${presentationId}`;
}

function readStoredSettings(
  presentationId: string,
): { trackId: AmbientTrackId; volume: number } {
  if (typeof window === "undefined") {
    return { trackId: "lofi-drift", volume: 0.38 };
  }

  const raw = window.localStorage.getItem(getStorageKey(presentationId));
  if (!raw) {
    return { trackId: "lofi-drift", volume: 0.38 };
  }

  try {
    const parsed = JSON.parse(raw) as { trackId?: AmbientTrackId; volume?: number };
    return {
      trackId:
        parsed.trackId && TRACKS.some((track) => track.id === parsed.trackId)
          ? parsed.trackId
          : "lofi-drift",
      volume:
        typeof parsed.volume === "number"
          ? clampVolume(parsed.volume)
          : 0.38,
    };
  } catch (error) {
    console.warn("Failed to hydrate ambient music settings", error);
    return { trackId: "lofi-drift", volume: 0.38 };
  }
}

interface AmbientMusicMenuProps {
  presentationId: string;
}

export function AmbientMusicMenu({ presentationId }: AmbientMusicMenuProps) {
  const initialSettings = useMemo(() => readStoredSettings(presentationId), [presentationId]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<AmbientTrackId>(initialSettings.trackId);
  const [volume, setVolume] = useState(initialSettings.volume);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedTrack = useMemo(
    () => TRACKS.find((track) => track.id === selectedTrackId) ?? TRACKS[0],
    [selectedTrackId],
  );

  const persistSettings = useCallback((nextTrackId: AmbientTrackId, nextVolume: number) => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      getStorageKey(presentationId),
      JSON.stringify({
        trackId: nextTrackId,
        volume: clampVolume(nextVolume),
      }),
    );
  }, [presentationId]);

  const syncAudioSource = useCallback((trackId: AmbientTrackId) => {
    const audio = audioRef.current;
    const track = TRACKS.find((candidate) => candidate.id === trackId);
    if (!audio || !track) return;

    if (audio.src.endsWith(track.src)) {
      return;
    }

    audio.src = track.src;
    audio.load();
  }, []);

  const handleTogglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    syncAudioSource(selectedTrackId);

    try {
      await audio.play();
      setAudioUnlocked(true);
      setIsPlaying(true);
    } catch (error) {
      console.error("Failed to start ambient audio", error);
      toast.error("Could not start this track. Check that the audio file exists.");
      setIsPlaying(false);
    }
  }, [isPlaying, selectedTrackId, syncAudioSource]);

  const handleTrackChange = useCallback(async (nextTrackId: string) => {
    const nextId = nextTrackId as AmbientTrackId;
    const audio = audioRef.current;
    const shouldContinue = Boolean(audio && !audio.paused);

    setSelectedTrackId(nextId);
    persistSettings(nextId, volume);

    if (!audio) {
      return;
    }

    syncAudioSource(nextId);

    if (!shouldContinue) {
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Failed to switch ambient audio track", error);
      toast.error("Could not switch to that track.");
      setIsPlaying(false);
    }
  }, [persistSettings, syncAudioSource, volume]);

  const handleVolumeChange = useCallback((nextValue: number) => {
    const nextVolume = clampVolume(nextValue);
    setVolume(nextVolume);
    persistSettings(selectedTrackId, nextVolume);

    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }
  }, [persistSettings, selectedTrackId]);

  const handleAudioEnded = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    void audioRef.current.play().catch(() => {
      setIsPlaying(false);
    });
  }, []);

  const handleAudioError = useCallback(() => {
    setIsPlaying(false);
    toast.error(
      `Missing audio file for ${selectedTrack.label}. Add it under public/audio/ as documented in public/audio/README.md.`,
    );
  }, [selectedTrack.label]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    syncAudioSource(selectedTrackId);
  }, [selectedTrackId, syncAudioSource, volume]);

  return (
    <>
      <audio
        ref={audioRef}
        loop={false}
        preload="none"
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={isPlaying ? "outline" : "ghost"}
            size="icon"
            aria-label="Ambient music controls"
          >
            <Music4 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex items-center justify-between gap-3">
            <span>Ambient audio</span>
            <span className="text-muted-foreground text-xs font-normal">
              {selectedTrack.label}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="px-2 py-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{selectedTrack.label}</p>
                <p className="text-muted-foreground text-xs">{selectedTrack.subtitle}</p>
              </div>
              <Button
                type="button"
                variant={isPlaying ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => void handleTogglePlayback()}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isPlaying ? "Pause" : audioUnlocked ? "Play" : "Start"}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Volume2 className="text-muted-foreground h-4 w-4 shrink-0" />
              <input
                aria-label="Ambient audio volume"
                className="accent-foreground h-2 w-full cursor-pointer"
                max="100"
                min="0"
                step="1"
                type="range"
                value={Math.round(volume * 100)}
                onChange={(event) => handleVolumeChange(Number(event.target.value) / 100)}
              />
              <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
                {Math.round(volume * 100)}
              </span>
            </div>
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Music</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={selectedTrackId} onValueChange={(value) => void handleTrackChange(value)}>
            {MUSIC_TRACKS.map((track) => (
              <DropdownMenuRadioItem key={track.id} value={track.id}>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="truncate">{track.label}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">{track.subtitle}</span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Nature</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={selectedTrackId} onValueChange={(value) => void handleTrackChange(value)}>
            {SOUNDSCAPE_TRACKS.map((track) => (
              <DropdownMenuRadioItem key={track.id} value={track.id}>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="truncate">{track.label}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">{track.subtitle}</span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
