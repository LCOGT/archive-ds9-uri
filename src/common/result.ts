export type Result<T, E> =
  | { kind: "ok"; value: T }
  | { kind: "error"; error: E };

const Ok = <T>(v: T): Result<T, never> => {
  return {
    kind: "ok",
    value: v,
  };
};

const Err = <T>(e: T): Result<never, T> => {
  return {
    kind: "error",
    error: e,
  };
};

const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.kind === "ok") {
    return r.value;
  }
  throw r.error;
};

const unwrapAwaitable = async <T, E>(a: Promise<Result<T, E>>): Promise<T> => {
  return unwrap(await a);
};

export const Result = {
  Ok,
  Err,
  unwrap,
  unwrapAwaitable,
};
