import { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { api } from '@/lib/api';

interface VideoRoomProps {
  sessionId: string;
  accessToken: string;
  /** 'sidebar' = right-side panel (default), 'bar' = small top bar */
  layout?: 'sidebar' | 'bar';
}

export default function VideoRoom({ sessionId, accessToken, layout = 'sidebar' }: VideoRoomProps) {
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);

  const fetchToken = useCallback(async () => {
    setError(null);
    try {
      const result = await api<{ token: string; url: string; roomName: string }>(
        '/api/livekit/token',
        {
          method: 'POST',
          body: { sessionId },
          token: accessToken,
        },
      );
      setLivekitToken(result.token);
      setLivekitUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get video token');
    }
  }, [sessionId, accessToken]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-card rounded-lg border border-border">
        <div className="text-center p-4">
          <VideoOff className="w-6 h-6 text-text-muted mx-auto mb-2" />
          <p className="text-xs text-text-muted mb-1">{error}</p>
          <button
            onClick={fetchToken}
            className="text-xs text-accent-glow hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!livekitToken || !livekitUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-card rounded-lg border border-border">
        <div className="text-center p-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-text-muted">Connecting video...</p>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-card rounded-lg border border-border">
        <button
          onClick={() => setIsJoined(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Video className="w-4 h-4" />
          Join Video Call
        </button>
      </div>
    );
  }

  return (
    <div className="h-full bg-bg-card rounded-lg border border-border overflow-hidden video-room">
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={() => setIsJoined(false)}
        onError={(err) => {
          console.error('[LiveKit] Error:', err);
          setError(err.message);
        }}
        style={{ height: '100%' }}
      >
        {layout === 'sidebar' ? <SidebarVideoLayout /> : <CompactVideoLayout />}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

/** Stacked layout: one participant above, the other below */
function SidebarVideoLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="h-full flex flex-col">
      {/* Stacked vertically: one tile above the other */}
      <div className="flex-1 min-h-0 flex flex-col gap-1 p-1.5 overflow-hidden">
        {tracks.map((track, idx) => (
          <div key={idx} className="flex-1 min-h-0 rounded-lg overflow-hidden bg-black">
            <ParticipantTile trackRef={track} />
          </div>
        ))}
        {tracks.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-text-muted text-xs">
            Waiting for participants...
          </div>
        )}
      </div>
      <ControlBar
        variation="minimal"
        controls={{
          camera: true,
          microphone: true,
          screenShare: true,
          leave: true,
          chat: false,
          settings: false,
        }}
      />
    </div>
  );
}

/** Compact horizontal bar layout for minimal space use */
function CompactVideoLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <GridLayout tracks={tracks} style={{ height: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <ControlBar
        variation="minimal"
        controls={{
          camera: true,
          microphone: true,
          screenShare: false,
          leave: true,
          chat: false,
          settings: false,
        }}
      />
    </div>
  );
}
