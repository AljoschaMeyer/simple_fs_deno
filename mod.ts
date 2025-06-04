import {
  FilesystemExt,
  Mode,
  Path,
  Pathish,
  SimpleFilesystem,
  SimpleFilesystemExt,
} from "@aljoscha-meyer/simple-fs-abstraction";

export class SimpleFsDeno implements SimpleFilesystem, SimpleFilesystemExt {
  private inner: FilesystemExt<SimpleFsDeno_>;

  /**
   * Creates a {@linkcode SimpleFilesystem} (and {@linkcode SimpleFilesystemExt}) backed by the real, persistent file system. The root of the created {@linkcode SimpleFsDeno} is the directory `mount`.
   */
  constructor(mount: string) {
    this.inner = new FilesystemExt(new SimpleFsDeno_(mount));
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

class SimpleFsDeno_ implements SimpleFilesystem {
  private mount: string;
  private workingDirectory: Path;

  constructor(mount: string) {
    this.mount = mount;
    this.workingDirectory = Path.absolute([]);
  }

  private computeAbsolutePath(path: Pathish): Path {
    const path_ = Path.fromPathish(path);

    return path_.isAbsolute() ? path_ : this.workingDirectory.concat(path_);
  }

  private nativePath(path: Pathish): string {
    const absPath = this.computeAbsolutePath(path);
    return absPath.toNativeString();
  }

  pwd(): Path {
    return this.workingDirectory;
  }

  cd(path: Pathish): void {
    const nativeTarget = this.nativePath(path);
    Deno.chdir(nativeTarget);

    const target = this.computeAbsolutePath(path);
    this.workingDirectory = target;
  }

  ls(path?: Pathish): Promise<Set<string>> {
    throw new Error("Method not implemented.");
  }
  lsSync(path?: Pathish): Set<string> {
    throw new Error("Method not implemented.");
  }
  stat(path: Pathish): Promise<"directory" | "data" | "nothing"> {
    throw new Error("Method not implemented.");
  }
  statSync(path: Pathish): "directory" | "data" | "nothing" {
    throw new Error("Method not implemented.");
  }
  read(path: Pathish): Promise<Uint8Array> {
    throw new Error("Method not implemented.");
  }
  readSync(path: Pathish): Uint8Array {
    throw new Error("Method not implemented.");
  }
  write(path: Pathish, data: Uint8Array, mode?: Mode): Promise<void> {
    throw new Error("Method not implemented.");
  }
  writeSync(path: Pathish, data: Uint8Array, mode?: Mode): void {
    throw new Error("Method not implemented.");
  }
  mkdir(path: Pathish, mode?: Mode): Promise<void> {
    throw new Error("Method not implemented.");
  }
  mkdirSync(path: Pathish, mode?: Mode): void {
    throw new Error("Method not implemented.");
  }
  remove(path: Pathish): Promise<void> {
    throw new Error("Method not implemented.");
  }
  removeSync(path: Pathish): void {
    throw new Error("Method not implemented.");
  }
  copy(src: Pathish, dst: Pathish, mode?: Mode): Promise<void> {
    throw new Error("Method not implemented.");
  }
  copySync(src: Pathish, dst: Pathish, mode?: Mode): void {
    throw new Error("Method not implemented.");
  }
  move(src: Pathish, dst: Pathish, mode?: Mode): Promise<void> {
    throw new Error("Method not implemented.");
  }
  moveSync(src: Pathish, dst: Pathish, mode?: Mode): void {
    throw new Error("Method not implemented.");
  }
}
