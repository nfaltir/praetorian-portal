/*
  Playlist link checker. The ONLY way a URL gets into the playlist table.

  Allowlist, not blocklist: a link is accepted only if it is https, on one
  of a few exact hosts, and has the shape of a playlist. The playlist ID is
  pulled out and a clean URL is rebuilt from it, so whatever else was in the
  pasted link (tracking codes, redirects, extra parameters) is dropped.

  Pure function, no imports: easy to test, safe to use on server or client.
*/

export type PlaylistProvider = "spotify" | "youtube" | "youtube_music" | "soundcloud";

export type ParsedPlaylist =
  | { ok: true; provider: PlaylistProvider; url: string }
  | { ok: false; message: string };

const GENERIC = "Use a playlist link from Spotify, YouTube, YouTube Music or SoundCloud.";

/* Short links hide where they go. Ask for the full address instead. */
const SHORTENERS = new Set([
  "spotify.link",
  "spoti.fi",
  "youtu.be",
  "on.soundcloud.com",
  "snd.sc",
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
]);

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const YOUTUBE_LIST = /^[A-Za-z0-9_-]{10,64}$/;
const SOUNDCLOUD_SLUG = /^[a-z0-9_-]{1,100}$/;
const SOUNDCLOUD_SECRET = /^s-[A-Za-z0-9]{1,40}$/;

const fail = (message: string): ParsedPlaylist => ({ ok: false, message });

export function parsePlaylistUrl(input: string): ParsedPlaylist {
  const raw = input.trim();
  if (!raw) return fail("Paste the playlist link.");
  if (raw.length > 500) return fail("That link is too long to be a playlist link.");

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return fail("That isn't a full web address. It should start with https://");
  }

  // URL() lowercases the host and converts lookalike letters to xn-- form,
  // so the exact matches below can't be fooled by look-alike characters
  const host = u.hostname;

  if (SHORTENERS.has(host)) {
    return fail("Short links aren't accepted. Open the link in your browser first, then copy the full address from the address bar.");
  }
  if (u.protocol !== "https:") return fail("The link must start with https://");
  if (u.username || u.password || u.port) return fail(GENERIC);

  const parts = u.pathname.split("/").filter(Boolean);

  /* Spotify: /playlist/<id> or /album/<id>, sometimes with /intl-xx/ in front */
  if (host === "open.spotify.com") {
    const p = parts[0]?.startsWith("intl-") ? parts.slice(1) : parts;
    const [kind, id] = p;
    if ((kind === "playlist" || kind === "album") && id && SPOTIFY_ID.test(id) && p.length === 2) {
      return { ok: true, provider: "spotify", url: `https://open.spotify.com/${kind}/${id}` };
    }
    return fail("Use a Spotify playlist or album link (open.spotify.com/playlist/...). Song and artist links aren't accepted.");
  }

  /* YouTube and YouTube Music: any page carrying ?list=<id> */
  const isYouTube = host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com";
  const isYouTubeMusic = host === "music.youtube.com";
  if (isYouTube || isYouTubeMusic) {
    const list = u.searchParams.get("list");
    const pageOk = parts.length === 1 && (parts[0] === "playlist" || parts[0] === "watch");
    if (!pageOk || !list || !YOUTUBE_LIST.test(list)) {
      return fail("Use a YouTube playlist link (it has list= in the address). Single videos aren't accepted.");
    }
    // WL = Watch Later, LL = Liked videos: private to the owner, nobody else can open them
    if (list === "WL" || list === "LL" || list.startsWith("RD")) {
      return fail("That's a personal or auto-generated list. Use a playlist you created and set to public or unlisted.");
    }
    return isYouTubeMusic
      ? { ok: true, provider: "youtube_music", url: `https://music.youtube.com/playlist?list=${list}` }
      : { ok: true, provider: "youtube", url: `https://www.youtube.com/playlist?list=${list}` };
  }

  /* SoundCloud: /<user>/sets/<name>, optionally /s-<secret> for private sets */
  if (host === "soundcloud.com" || host === "www.soundcloud.com" || host === "m.soundcloud.com") {
    const [user, sets, name, secret] = parts;
    const shapeOk =
      sets === "sets" &&
      !!user && SOUNDCLOUD_SLUG.test(user) &&
      !!name && SOUNDCLOUD_SLUG.test(name) &&
      (parts.length === 3 || (parts.length === 4 && !!secret && SOUNDCLOUD_SECRET.test(secret)));
    if (!shapeOk) return fail("Use a SoundCloud playlist link (soundcloud.com/<artist>/sets/<name>). Single tracks aren't accepted.");
    return {
      ok: true,
      provider: "soundcloud",
      url: `https://soundcloud.com/${user}/sets/${name}${parts.length === 4 ? `/${secret}` : ""}`,
    };
  }

  return fail(GENERIC);
}
