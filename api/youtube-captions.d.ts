export function isValidYouTubeId(videoId: unknown): boolean;
export function fetchFromYouTube(rawVideoId: string): Promise<{
  videoId: string;
  title: string;
  author: string;
  totalSubtitles: number;
  subtitles: Array<{
    id: string;
    start: number;
    end: number;
    text: string;
    translation: string;
  }>;
}>;
export default function handler(req: unknown, res: unknown): Promise<void>;
