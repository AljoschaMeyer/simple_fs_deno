/**
 * An implementation of the [`simple_fs_abstraction`](https://jsr.io/@wormblossom/simple-fs-abstraction), backed by the Deno file system APIs.
 *
 * The central entrypoint is the {@linkcode SimpleFsDeno} class, which implements both {@linkcode SimpleFilesystem} and {@linkcode SimpleFilesystemExt}.
 *
 * @module
 */

import {
  ConcatPathError,
  FilesystemExt,
  type Mode,
  Path,
  type Pathish,
  type SimpleFilesystem,
  type SimpleFilesystemExt,
} from "@wormblossom/simple-fs-abstraction";
import { join } from "@std/path/join";
import { isAbsolute } from "@std/path";
import { copySync, moveSync } from "@std/fs";

/**
 * A {@linkcode SimpleFilesystem} (and {@linkcode SimpleFilesystemExt}) backed by the real, persistent file system.
 *
 * The root of the created {@linkcode SimpleFsDeno} is the directory `mount` (specified as a platform-specific path in the constructor). Use the {@linkcode SimpleFsDeno.prototype.getMount | getMount} method to later retrieve the native path at which the {@linkcode SimpleFsDeno} was mounted.
 *
 * Aside from the mount point, this class provides only the functionality of the {@linkcode SimpleFilesystem} and {@linkcode SimpleFilesystemExt} interfaces.
 */
export class SimpleFsDeno implements SimpleFilesystem, SimpleFilesystemExt {
  /** @ignore */
  private inner: FilesystemExt<SimpleFsDeno_>;
  /** @ignore */
  private mount: string;

  /**
   * Creates a {@linkcode SimpleFilesystem} (and {@linkcode SimpleFilesystemExt}) backed by the real, persistent file system.
   *
   * The root of the created {@linkcode SimpleFsDeno} is the directory `mount` (specified as a platform-specific path). Use the {@linkcode SimpleFsDeno.prototype.getMount | getMount} method to later retrieve the native path at which the {@linkcode SimpleFsDeno} was mounted.
   */
  constructor(mount: string) {
    this.inner = new FilesystemExt(new SimpleFsDeno_(mount));
    this.mount = mount;
  }

  /**
   * Returns the native file system path at which this {@linkcode SimpleFsDeno} is mounted.
   */
  getMount(): string {
    return this.mount;
  }

  pwd(): Path {
    return this.inner.pwd();
  }

  cd(path: Pathish): void {
    return this.inner.cd(path);
  }

  ls(path?: Pathish): Promise<Set<string>> {
    return this.inner.ls(path);
  }

  lsSync(path?: Pathish): Set<string> {
    return this.inner.lsSync(path);
  }

  stat(path: Pathish): Promise<"directory" | "data" | "nothing"> {
    return this.inner.stat(path);
  }

  statSync(path: Pathish): "directory" | "data" | "nothing" {
    return this.inner.statSync(path);
  }

  read(path: Pathish): Promise<Uint8Array> {
    return this.inner.read(path);
  }

  readSync(path: Pathish): Uint8Array {
    return this.inner.readSync(path);
  }

  write(path: Pathish, data: Uint8Array, mode?: Mode): Promise<void> {
    return this.inner.write(path, data, mode);
  }

  writeSync(path: Pathish, data: Uint8Array, mode?: Mode): void {
    return this.inner.writeSync(path, data, mode);
  }

  mkdir(path: Pathish, mode?: Mode): Promise<void> {
    return this.inner.mkdir(path, mode);
  }

  mkdirSync(path: Pathish, mode?: Mode): void {
    return this.inner.mkdirSync(path, mode);
  }

  remove(path: Pathish): Promise<void> {
    return this.inner.remove(path);
  }

  removeSync(path: Pathish): void {
    return this.inner.removeSync(path);
  }

  copy(src: Pathish, dst: Pathish, mode?: Mode): Promise<void> {
    return this.inner.copy(src, dst, mode);
  }

  copySync(src: Pathish, dst: Pathish, mode?: Mode): void {
    return this.inner.copySync(src, dst, mode);
  }

  move(src: Pathish, dst: Pathish, mode?: Mode): Promise<void> {
    return this.inner.move(src, dst, mode);
  }

  moveSync(src: Pathish, dst: Pathish, mode?: Mode): void {
    return this.inner.moveSync(src, dst, mode);
  }

  readString(path: Pathish): Promise<string> {
    return this.inner.readString(path);
  }

  readStringSync(path: Pathish): string {
    return this.inner.readStringSync(path);
  }

  writeString(path: Pathish, data: string, mode?: Mode): Promise<void> {
    return this.inner.writeString(path, data, mode);
  }

  writeStringSync(path: Pathish, data: string, mode?: Mode): void {
    return this.inner.writeStringSync(path, data, mode);
  }

  ensureNot(path: Pathish, mode?: Mode): Promise<void> {
    return this.inner.ensureNot(path, mode);
  }

  ensureNotSync(path: Pathish, mode?: Mode): void {
    return this.inner.ensureNotSync(path, mode);
  }

  eq(other: SimpleFilesystem): boolean {
    return this.inner.eq(other);
  }
}

const NO_SUCH_FILE = "Addressed a file but there is no file of that name.";
const EXPECTED_DIRECTORY_GOT_DATA =
  "Wanted to address a directory but there was a data file instead.";
const EXPECTED_DATA_GOT_DIRECTORY =
  "Wanted to address a data file but there was a directory instead.";
const CANNOT_TURN_ROOT_INTO_DATA_FILE =
  "Tried to turn the root of a filesystem into a data file, but that is not allowed";
const CANNOT_COPY_OR_MOVE_INTO_ROOT =
  "Tried to copy or move a file to the root of a filesystem, but that is not allowed";
const CANNOT_DELETE_ROOT =
  "Tried to delete the root of a filesystem, but that is not allowed";
const TIMID =
  "A filesystem oepration of mode `timid` (the default mode) would have overwritten data, so it threw this error instead.";

class SimpleFsDeno_ implements SimpleFilesystem {
  private mount: string;
  private workingDirectory: Path;

  constructor(mount: string) {
    if (isAbsolute(mount)) {
      this.mount = mount;
    } else {
      this.mount = join(Deno.cwd(), mount);
    }
    this.workingDirectory = Path.absolute([]);
  }

  private computeAbsolutePath(path: Pathish): Path {
    const path_ = Path.fromPathish(path);

    if (path_.isAbsolute()) {
      return path_;
    } else {
      if (path_.getParentSteps() > this.workingDirectory.getComponentCount()) {
        throw new ConcatPathError(
          `Resolving a path for this operation would have had to step above the root of the SimpleFsDeno.`,
          this.workingDirectory,
          path_,
        );
      } else {
        return this.workingDirectory.concat(path_);
      }
    }
  }

  /**
   * Returns `true` if there is a file at the given path, false if there isn't. If `createParentDir`, creates all necessary parent directories.
   */
  private resolveAbsolutePath(
    path: Pathish,
    createParentDirs = false,
  ): "data" | "directory" | "nothing" {
    const path_ = Path.fromPathish(path);
    const components = path_.getComponents();

    let currentPrefix = Path.absolute([]);

    for (let i = 0; i < components.length; i++) {
      currentPrefix = currentPrefix.pushBack(components[i]);
      const stats = this.statSync(currentPrefix);

      if (i + 1 < components.length) {
        if (stats === "directory") {
          continue;
        } else if (stats === "data") {
          throw new DenoFsError(EXPECTED_DIRECTORY_GOT_DATA);
        } else if (createParentDirs) {
          const nativeCurrentPrefix = this.nativePath(currentPrefix);
          Deno.mkdirSync(nativeCurrentPrefix);
        } else {
          throw new DenoFsError(NO_SUCH_FILE);
        }
      } else {
        return stats;
      }
    }

    // Reached iff the path addresses the root of the simple FS:
    return "directory";
  }

  private nativePath(path: Pathish): string {
    const absPath = this.computeAbsolutePath(path);
    return join(this.mount, absPath.toNativeString().slice(1));
  }

  pwd(): Path {
    return this.workingDirectory;
  }

  cd(path: Pathish): void {
    const target = this.computeAbsolutePath(path);

    const stats = this.statSync(path);
    if (stats === "directory") {
      this.workingDirectory = target;
    } else if (stats === "data") {
      throw new CdError(
        `Cannot change the working directory to a data file.`,
        target,
      );
    } else {
      throw new CdError(
        `Cannot change the working directory to a non-existing file.`,
        target,
      );
    }
  }

  async ls(path?: Pathish): Promise<Set<string>> {
    const nativeTarget = this.nativePath(path ?? Path.relative([]));

    const components: Set<string> = new Set();
    for await (const dirEntry of Deno.readDir(nativeTarget)) {
      components.add(dirEntry.name);
    }

    return components;
  }

  lsSync(path?: Pathish): Set<string> {
    const nativeTarget = this.nativePath(path ?? Path.relative([]));

    const components: Set<string> = new Set();
    for (const dirEntry of Deno.readDirSync(nativeTarget)) {
      components.add(dirEntry.name);
    }

    return components;
  }

  async stat(path: Pathish): Promise<"directory" | "data" | "nothing"> {
    const nativeTarget = this.nativePath(path);

    try {
      const stats = await Deno.stat(nativeTarget);

      if (stats.isDirectory) {
        return "directory";
      } else if (stats.isFile) {
        return "data";
      }
    } catch (_) {
      return "nothing";
    }

    throw new UnusualFileError(
      `Encounter a file which was neither a data file nor a directory.`,
      nativeTarget,
    );
  }

  statSync(path: Pathish): "directory" | "data" | "nothing" {
    const nativeTarget = this.nativePath(path);

    try {
      const stats = Deno.statSync(nativeTarget);

      if (stats.isDirectory) {
        return "directory";
      } else if (stats.isFile) {
        return "data";
      }
    } catch (_) {
      return "nothing";
    }

    throw new UnusualFileError(
      `Encounter a file which was neither a data file nor a directory.`,
      nativeTarget,
    );
  }

  async read(path: Pathish): Promise<Uint8Array> {
    const nativeTarget = this.nativePath(path);

    return await Deno.readFile(nativeTarget);
  }

  readSync(path: Pathish): Uint8Array {
    const nativeTarget = this.nativePath(path);

    return Deno.readFileSync(nativeTarget);
  }

  write(path: Pathish, data: Uint8Array, mode: Mode = "timid"): Promise<void> {
    return Promise.resolve(this.writeSync(path, data, mode));
  }

  writeSync(path: Pathish, data: Uint8Array, mode: Mode = "timid"): void {
    const nativeTarget = this.nativePath(path);

    const target = this.computeAbsolutePath(path);
    const targetStats = this.resolveAbsolutePath(target, true);

    if (target.equals(Path.absolute([]))) {
      throw new DenoFsError(CANNOT_TURN_ROOT_INTO_DATA_FILE);
    } else if (targetStats !== "nothing") {
      if (mode === "timid") {
        throw new DenoFsError(TIMID);
      } else if (mode === "placid") {
        // Do nothing.
      } else {
        if (targetStats === "data") {
          Deno.writeFileSync(nativeTarget, data);
        } else {
          Deno.removeSync(nativeTarget, { recursive: true });
          Deno.writeFileSync(nativeTarget, data);
        }
      }
    } else {
      Deno.writeFileSync(nativeTarget, data);
    }
  }

  mkdir(path: Pathish, mode: Mode = "timid"): Promise<void> {
    return Promise.resolve(this.mkdirSync(path, mode));
  }

  mkdirSync(path: Pathish, mode: Mode = "timid"): void {
    const nativeTarget = this.nativePath(path);

    const target = this.computeAbsolutePath(path);
    const targetStats = this.resolveAbsolutePath(target, true);

    if (target.equals(Path.absolute([]))) {
      throw new DenoFsError(CANNOT_TURN_ROOT_INTO_DATA_FILE);
    } else if (targetStats !== "nothing") {
      if (mode === "timid") {
        throw new DenoFsError(TIMID);
      } else if (mode === "placid") {
        // Do nothing.
      } else {
        Deno.removeSync(nativeTarget, { recursive: true });
        Deno.mkdirSync(nativeTarget);
      }
    } else {
      Deno.mkdirSync(nativeTarget);
    }
  }

  remove(path: Pathish): Promise<void> {
    return Promise.resolve(this.removeSync(path));
  }

  removeSync(path: Pathish): void {
    const target = this.computeAbsolutePath(path);

    if (target.getComponentCount() === 0) {
      throw new DenoFsError(CANNOT_DELETE_ROOT);
    } else {
      const nativeTarget = this.nativePath(path);
      Deno.removeSync(nativeTarget, { recursive: true });
    }
  }

  copy(src: Pathish, dst: Pathish, mode: Mode = "timid"): Promise<void> {
    return Promise.resolve(this.copySync(src, dst, mode));
  }

  copySync(src: Pathish, dst: Pathish, mode: Mode = "timid"): void {
    const srcAbsolute = this.computeAbsolutePath(src);
    const srcStats = this.resolveAbsolutePath(srcAbsolute, false);

    if (srcStats === "nothing") {
      throw new DenoFsError(NO_SUCH_FILE);
    } else {
      const dstAbsolute = this.computeAbsolutePath(dst);
      const dstStats = this.resolveAbsolutePath(dstAbsolute, true);

      if (dstAbsolute.getComponentCount() === 0) {
        throw new DenoFsError(CANNOT_COPY_OR_MOVE_INTO_ROOT);
      } else {
        const nativeSrc = this.nativePath(src);
        const nativeDst = this.nativePath(dst);

        if (dstStats !== "nothing") {
          if (mode === "timid") {
            throw new DenoFsError(TIMID);
          } else if (mode === "placid") {
            // Do nothing.
          } else {
            Deno.removeSync(nativeDst, { recursive: true });
            copySync(nativeSrc, nativeDst);
          }
        } else {
          copySync(nativeSrc, nativeDst);
        }
      }
    }
  }

  move(src: Pathish, dst: Pathish, mode: Mode = "timid"): Promise<void> {
    return Promise.resolve(this.moveSync(src, dst, mode));
  }

  moveSync(src: Pathish, dst: Pathish, mode: Mode = "timid"): void {
    const srcAbsolute = this.computeAbsolutePath(src);
    const srcStats = this.resolveAbsolutePath(srcAbsolute, false);

    if (srcStats === "nothing") {
      throw new DenoFsError(NO_SUCH_FILE);
    } else {
      const dstAbsolute = this.computeAbsolutePath(dst);
      const dstStats = this.resolveAbsolutePath(dstAbsolute, true);

      if (dstAbsolute.getComponentCount() === 0) {
        throw new DenoFsError(CANNOT_COPY_OR_MOVE_INTO_ROOT);
      } else {
        const nativeSrc = this.nativePath(src);
        const nativeDst = this.nativePath(dst);

        if (dstStats !== "nothing") {
          if (mode === "timid") {
            throw new DenoFsError(TIMID);
          } else if (mode === "placid") {
            // Do nothing.
          } else {
            Deno.removeSync(nativeDst, { recursive: true });
            moveSync(nativeSrc, nativeDst);
          }
        } else {
          moveSync(nativeSrc, nativeDst);
        }
      }
    }
  }
}

/**
 * The type of errors thrown when a {@linkcode SimpleFsDeno} expects a directory or a path, but the real file system contains something else (a simlink, fifo, etc).
 */
export class UnusualFileError extends Error {
  path: string;

  constructor(message: string, path: string) {
    super(message);
    Object.setPrototypeOf(this, UnusualFileError.prototype);
    this.name = "UnusualFileErrorError";
    this.path = path;
  }
}

/**
 * The type of errors thrown by {@linkcode SimpleFsDeno} operations when trying to change the working directory to an invalid path.
 */
export class CdError extends Error {
  path: Path;

  constructor(message: string, path: Path) {
    super(message);
    Object.setPrototypeOf(this, CdError.prototype);
    this.name = "CdError";
    this.path = path;
  }
}

/**
 * The type of errors thrown by {@linkcode SimpleFsDeno} operations when the problem is neither a {@linkcode CdError} nor by an {@linkcode UnusualFileError}. The `name` property is always `"DenoFsError"`.
 */
export class DenoFsError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DenoFsError.prototype);
    this.name = "DenoFsError";
  }
}
