import { URL } from "whatwg-url";

import { SCHEME } from "../common/scheme";
import { Result } from "../common/result";

export interface ParsedUrl {
  frameIds: string[];
  frameUrl: URL;
  raw: URL;
}

export const parseUrl = (url: string): Result<ParsedUrl, string> => {
  if (!url.startsWith(`${SCHEME}://`)) {
    return Result.Err(`Must start with \`${SCHEME}.\``);
  }

  let u;
  try {
    u = new URL(url);
  } catch (error) {
    return Result.Err(`Unable to construct URL object.`);
  }

  if (!u.searchParams.has("frame_ids")) {
    return Result.Err("Must specify `frame_ids` query parameter.");
  }

  const frameIds = u.searchParams
    .getAll("frame_ids")
    .map((commaFrameIds) => {
      return commaFrameIds.split(",").filter((x) => x !== "");
    })
    .flatMap((y) => y);

  if (frameIds.length === 0) {
    return Result.Err("Must specify at least 1 `frame_ids`");
  }

  if (!u.searchParams.has("frame_url")) {
    return Result.Err("Must specify `frame_url` query parameter.");
  }

  const frameURLString = u.searchParams.getAll("frame_url").at(-1);

  let frameUrl;
  try {
    frameUrl = new URL(frameURLString);
  } catch (error) {
    return Result.Err(`Unabled to parse \`frame_url\`: ${error}`);
  }

  if (!frameUrl.protocol.startsWith("http")) {
    return Result.Err(
      `\`frame_url\` must be a \`http\` URL, not \`${frameUrl.protocol}\``
    );
  }

  if (u.searchParams.has("token")) {
    return Result.Err(
      "Specifying `token` in query parameter is no longer supported. Set the API token in Preferences."
    );
  }

  return Result.Ok({
    frameIds,
    frameUrl,
    raw: u,
  });
};
