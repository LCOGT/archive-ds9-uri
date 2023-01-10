import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import fetch from "node-fetch";
import dedent from "dedent-js";
import { v4 as uuidv4 } from "uuid";
import { sendToast } from "./toast";
import { parseUrl, ParsedUrl } from "./parseUrl";
import { launchTaskStore } from "./launchTaskStore";
import { getPreferences } from "./preferences";
import { Result } from "../common/result";
import { URL } from "whatwg-url";
import type { Preferences } from "../common/preferences";
import { DeferredPromise } from "../common/deferredPromise";

const tasksById = new Map<string, ReturnType<typeof LaunchTask>>();

export const readyToHandle = DeferredPromise<void>();

export const handleURL = (url: string): void => {
  // validate the url
  const res = parseUrl(url);

  if (res.kind === "error") {
    sendToast({
      title: "Invalid",
      color: "danger",
      markdown: dedent`
        \`\`\`uri
        ${url}
        \`\`\`
        ${res.error}
      `,
    });
    return;
  }

  const t = LaunchTask(res.value);

  // save task reference for user aborting & deleting
  tasksById.set(t.id, t);

  // start doing stuff in the background
  t.go();
};

export const abortTask = async (id: string): Promise<Result<void, string>> => {
  const t = tasksById.get(id);

  if (t === undefined) {
    return Result.Err("Task Not Found");
  }
  try {
    await t.abort();
  } catch (err: unknown) {
    return Result.Err(`Failed to abort: ${err}`);
  }

  return Result.Ok(undefined);
};

export const deleteTask = async (id: string): Promise<Result<void, string>> => {
  const t = tasksById.get(id);

  if (t === undefined) {
    return Result.Err("Task Not Found");
  }

  tasksById.delete(id);

  try {
    await t.delete();
  } catch (err: unknown) {
    return Result.Err(`${err}`);
  }

  return Result.Ok(null);
};

const LaunchTask = (url: ParsedUrl) => {
  const id = uuidv4();
  const abortController = new AbortController();
  const done = DeferredPromise();

  const abort = async () => {
    if (abortController.signal.aborted) {
      return;
    }

    launchTaskStore.set((s) => {
      s[id].status = "Aborting";
    });

    abortController.abort("User Requested Abort");
  };

  const deleteState = async () => {
    await abort();
    await done.promise;
    launchTaskStore.set((s) => {
      delete s[id];
    });
  };

  const cleanup = async () => {
    if (launchTaskStore.get()[id].cleanup === "Skip") {
      launchTaskStore.set((s) => {
        s[id].cleanup = "Skipped";
      });
      return;
    }

    const downloadDir = launchTaskStore.get()[id].downloadDir;

    if (downloadDir === undefined) {
      launchTaskStore.set((s) => {
        s[id].cleanup = "Done";
      });
      return;
    }

    launchTaskStore.set((s) => {
      s[id].cleanup = "Attempting";
    });

    await fs.rm(downloadDir, { recursive: true, force: true });

    launchTaskStore.set((s) => {
      Object.values(s[id].frames).forEach((f) => {
        f.status = "Deleted";
      });
      s[id].cleanup = "Done";
    });
  };

  const main = async () => {
    // provide initial ui feedback
    launchTaskStore.set((s) => {
      s[id] = {
        id,
        sanitizedUrl: sanitizieUrl(url.raw).href,
        url: url.raw.href,
        status: "Initializing",
        frames: {},
        stdout: [],
        stderr: [],
        cleanup: "Pending",
        error: {},
      };
    });

    // get user preferences
    const prefs = getPreferences();

    if (prefs.customDownloadDir.enabled && !prefs.customDownloadDir.cleanup) {
      launchTaskStore.set((s) => {
        s[id].cleanup = "Skip";
      });
    }

    // make sure download directory exists
    const downloadDir = await ensureDownloadDir(prefs, id);

    launchTaskStore.set((s) => {
      s[id].downloadDir = downloadDir;
    });

    // make sure DS9 exists
    await ensureDs9(prefs);

    // fetch frame metadata
    await updateAllFramesMetadata(url, id, abortController.signal);

    // download frames
    await downloadAllFrames(downloadDir, id, abortController.signal);

    // launch DS9
    await launchDs9(prefs, id, abortController.signal);

    launchTaskStore.set((s) => {
      s[id].status = "Closed";
    });
  };

  const mainThenCleanup = async () => {
    try {
      await main();
    } finally {
      await cleanup();
    }
  };

  const go = async () => {
    await readyToHandle.promise;
    try {
      await mainThenCleanup();
      launchTaskStore.set((s) => {
        s[id].status = "Done";
      });
    } catch (err) {
      if (err instanceof Error) {
        launchTaskStore.set((s) => {
          s[id].error.name = err.name;
          s[id].error.message = err.message;
          s[id].error.stack = err.stack;
        });

        if (err.name === "AbortError" && abortController.signal.aborted) {
          launchTaskStore.set((s) => {
            s[id].status = "Aborted";
          });
        } else {
          launchTaskStore.set((s) => {
            s[id].status = "Failed";
          });
        }
      } else {
        launchTaskStore.set((s) => {
          s[id].status = "Failed";
          s[id].error.message = `${err}`;
        });
      }
    } finally {
      done.resolve(null);
    }
  };

  return {
    id,
    abort,
    go,
    delete: deleteState,
  };
};

const downloadAllFrames = async (
  downloadDir: string,
  taskId: string,
  signal: AbortSignal
) => {
  launchTaskStore.set((s) => {
    s[taskId].status = "Downloading";
  });

  const siblingAbortController = new AbortController();
  signal.addEventListener("abort", () => {
    siblingAbortController.abort(signal.reason);
  });

  const frames = Object.values(launchTaskStore.get()).flatMap((t) =>
    Object.values(t.frames)
  );
  const promises = frames.map(async (f) => {
    return await downloadFrame(
      downloadDir,
      taskId,
      f.id,
      siblingAbortController.signal
    ).catch((err) => {
      siblingAbortController.abort();
      throw err;
    });
  });

  await Promise.all(promises);
};

const downloadFrame = async (
  downloadDir: string,
  taskId: string,
  frameId: string,
  signal: AbortSignal
) => {
  const f = launchTaskStore.get()[taskId].frames[frameId];
  const filepath = path.join(downloadDir, f.filename);

  const resp = await fetch(f.downloadUrl, { signal });

  if (!resp.ok) {
    throw new Error(`Failed to fetch file ${resp}`);
  }

  launchTaskStore.set((s) => {
    const f = s[taskId].frames[frameId];
    f.filepath = filepath;
    f.status = "Downloading";
  });

  async function* gen() {
    let count = 0;
    for await (const chunk of resp.body) {
      yield chunk;

      count += chunk.length;

      // update progress
      launchTaskStore.set((s) => {
        s[taskId].frames[frameId].downloadedBytes = count;
      });
    }
  }

  await fs.writeFile(filepath, gen(), { signal });

  launchTaskStore.set((s) => {
    s[taskId].frames[frameId].status = "Downloaded";
  });
};

const updateAllFramesMetadata = async (
  url: ParsedUrl,
  taskId: string,
  signal: AbortSignal
) => {
  const siblingAbortController = new AbortController();
  signal.addEventListener("abort", () => {
    siblingAbortController.abort(signal.reason);
  });

  const promises = url.frameIds.map(async (frameId) => {
    return await updateFrameMetadata(
      url,
      taskId,
      frameId,
      siblingAbortController.signal
    ).catch((err) => {
      siblingAbortController.abort();
      throw err;
    });
  });

  await Promise.allSettled(promises);
};

const updateFrameMetadata = async (
  url: ParsedUrl,
  taskId: string,
  frameId: string,
  signal: AbortSignal
) => {
  launchTaskStore.set((s) => {
    s[taskId].frames[frameId] = {
      id: frameId,
      status: "Initializing",
    };
  });

  const reqUrl = new URL(`${frameId}`, url.frameUrl);

  const resp = await fetch(reqUrl.href, {
    headers: {
      authorization: `Token ${url.token}`,
      "content-type": "application/json",
    },
    signal,
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch metadata from ${reqUrl}`);
  }

  interface MetadataResp {
    filename: string;
    url: string;
    instrument_id: string;
    reduction_level: number;
  }

  const json = (await resp.json()) as MetadataResp;

  // Can't make HTTP HEAD requests to the S3 pre-signed URL to get the file size.
  // So fake it using a Range request.
  // TODO: add the ability to do HEAD requests to archive-api to avoid this hack
  const fileResp = await fetch(json.url, {
    headers: {
      range: "bytes=0-0",
    },
    signal,
  });
  if (!fileResp.ok) {
    throw new Error(`Failed to make range request to ${json.url}`);
  }

  const totalBytes = Number(
    fileResp.headers
      .get("content-range")
      ?.split("/")
      .filter((x) => x)
      .at(-1)
  );

  launchTaskStore.set((s) => {
    const f = s[taskId].frames[frameId];
    f.status = "Pending";
    f.filename = json.filename;
    f.downloadUrl = json.url;
    f.totalBytes = totalBytes;
    f.downloadedBytes = 0;
    f.instrumentId = json.instrument_id;
    f.reductionLevel = json.reduction_level;
  });
};

const ensureDownloadDir = async (
  p: Preferences,
  suffix: string
): Promise<string> => {
  let downloadDir;
  if (p.customDownloadDir.enabled) {
    downloadDir = p.customDownloadDir.path;
  } else {
    downloadDir = path.join(os.tmpdir(), "archive-ds9-uri");
  }

  if (downloadDir === "") {
    throw new Error("Directory must not be empty");
  }

  if (!path.isAbsolute(downloadDir)) {
    throw new Error(`Directory must be absolute ${downloadDir}`);
  }

  downloadDir = path.join(downloadDir, suffix);

  try {
    await fs.mkdir(downloadDir, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create '${downloadDir}': ${err}`);
  }

  return downloadDir;
};

const sanitizieUrl = (u: URL): URL => {
  const n = new URL(u.href);
  n.searchParams.delete("token");
  return n;
};

const ensureDs9 = async (p: Preferences): Promise<void> => {
  try {
    await fs.access(
      p.ds9.path,
      fs.constants.F_OK | fs.constants.R_OK | fs.constants.X_OK
    );
  } catch (err) {
    throw new Error(`Not found or inaccessible: '${p.ds9.path}': ${err}`);
  }
};

const launchDs9 = async (
  p: Preferences,
  taskId: string,
  signal: AbortSignal
): Promise<number> => {
  launchTaskStore.set((s) => {
    s[taskId].status = "Launching";
  });

  const dp = DeferredPromise<number>();
  const frames = Object.values(launchTaskStore.get()[taskId].frames);

  const allMosaic = frames
    .map((f) => f.instrumentId?.includes("fa") && f.reductionLevel === 0)
    .every((x) => !!x);

  // If we're running in a Flatpak we have to wrap the call to DS9 with
  // 'flatpak-spawn --host' so that from DS9's POV it's still running on the
  // Host with all of the Host shared libraries that it needs.
  const command =
    process.env.FLATPAK_ID === undefined
      ? p.ds9.path
      : `flatpak-spawn --host ${p.ds9.path}`;

  const baseArgs = allMosaic ? p.ds9.mosaicArgs : p.ds9.args;

  const args = [baseArgs, ...frames.map((f) => f.filepath)];

  const ds9 = spawn(command, args, {
    signal,
    windowsHide: true,
    shell: true,
  });

  launchTaskStore.set((s) => {
    s[taskId].stdout.push(`$ ds9 ${args.join(" ")}`);
  });

  ds9.on("spawn", () => {
    launchTaskStore.set((s) => {
      s[taskId].status = "Launched";
    });
  });

  ds9.stdout.on("data", (data) => {
    launchTaskStore.set((s) => {
      s[taskId].stdout.push(`${data}`);
    });
  });

  ds9.stderr.on("data", (data) => {
    launchTaskStore.set((s) => {
      s[taskId].stderr.push(`${data}`);
    });
  });

  ds9.on("error", (err) => {
    dp.reject(err);
  });

  ds9.on("close", (code) => {
    dp.resolve(code);
  });

  return await dp.promise;
};
