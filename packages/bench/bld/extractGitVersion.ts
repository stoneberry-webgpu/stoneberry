import { promises as fs } from "fs";
import path from "path";

import { exec as execOrig } from "child_process";
import { promisify } from "util";

const exec = promisify(execOrig);

export async function gitVersion(): Promise<string> {
  const tag = await gitTag();
  const rev = tag.length ? tag : await gitHash();
  return rev + (await gitDirty());
}

export async function writeGitVersionTs(filePath: string): Promise<void> {
  const version = await gitVersion();
  const text = `export const gitVersion = "${version}";\n`;

  try {
    await fs.writeFile(filePath, text);
  } catch (e) {
    const dir = path.dirname(filePath);
    if (dir && dir !== ".") {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, text);
    }
  }
}

async function gitHash(): Promise<string> {
  const hashResult = await exec("git rev-parse --short=7 HEAD");
  return hashResult.stdout.trim();
}

async function gitTag(): Promise<string> {
  const tagResult = await exec("git tag --points-at HEAD");
  return tagResult.stdout.trim();
}

async function gitDirty(): Promise<string> {
  const status = await exec("git status --short");
  const dirty = status.stdout === "" ? "" : "*";
  return dirty;
}
