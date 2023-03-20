import { dwarn, pretty } from "berry-pretty";

/**
 * A simple engine for writing templated wgsl shaders while keeping the wgsl
 * code valid for tools and IDE support (like wgsl-analyzer).

 * Template target locations are encoded as substitution patterns in wgsl comments.
 */
const prefix = /\s*/.source;
const findUnquoted = /(?<findUnquoted>[\w-<>.]+)/.source;
const findQuoted = /"(?<findQuoted>[^=]+)"/.source;
const replaceKey = /\s*(?<replaceKey>[\w-]+)/.source;
const replaceValue = /\s*"(?<replaceValue>[^"]+)"/.source;
const parseRule = new RegExp(
  `${prefix}(${findUnquoted}|${findQuoted})=(${replaceKey}|${replaceValue})`,
  "g"
);
const ifRule = /\s+IF\s+(?<ifKey>[\w-]+)/i;

/**
 * find template patch rules in a source file string and apply the patches.
 * patch rules are specially formatted comments, and so are safely ignored by tools that parse source files
 *
 * patch rules have the form:
 *      //! find=replaceKey
 *  or
 *      //! find="replaceLiteral"
 *  - find is a string to find in the string, searching for the rightmost match
 *  - find may be quoted.
 * the replacement values are looked up in a dictionary by replaceKey
 *  or replaced with a literal if the replace value is quoted
 *
 * lines may be optionally removed entirely with
 *      //! IF key
 * - the annotated src line is removed if the key is not present in the dictionary and truthy
 */
export function applyTemplate(wgsl: string, dict: { [key: string]: any }): string {
  const edit = wgsl
    .split("\n")
    .flatMap((line, i) => (line.includes("//!") ? changeLine(line, i + 1) : [line]));
  const result = edit.join("\n");
  // console.log(result);
  return result;

  function changeLine(line: string, lineNum: number): string[] {
    const [text, comment] = line.split("//!");
    const ifKey = comment.match(ifRule)?.groups?.ifKey;
    if (ifKey && (!(ifKey in dict) || dict[ifKey] === false)) {
      return [];
    }

    return applyPatches(text, comment, lineNum);
  }

  function applyPatches(text: string, comment: string, lineNum: number): string[] {
    const ruleMatches = [...comment.matchAll(parseRule)];

    let unpatched = text;
    const keysReplaced = []; // save keys used on this line so we can create a comment later
    const suffixes = []; // replacement suffixes applied from right to left

    ruleMatches.length;
    for (const patch of ruleMatches.reverse()) {
      const { prefix, newSuffix, replacedKey } = applyOnePatch(unpatched, patch, lineNum);
      replacedKey && keysReplaced.push(replacedKey);
      newSuffix && suffixes.push(newSuffix);
      unpatched = prefix;
    }
    const patchedLine = unpatched + suffixes.reverse().join("");

    const newComment = keysReplaced.length
      ? `// ${keysReplaced.reverse().join(" ")}`
      : "";
    const edited = patchedLine + newComment;
    return [edited];
  }

  interface AppliedPatch {
    prefix: string;
    newSuffix?: string;
    replacedKey?: string;
  }

  function applyOnePatch(
    src: string,
    patch: RegExpMatchArray,
    lineNum: number
  ): AppliedPatch {
    const findUnquoted = patch?.groups?.findUnquoted;
    const findQuoted = patch?.groups?.findQuoted;
    const find = findUnquoted || findQuoted;
    const replaceKey = patch?.groups?.replaceKey;
    const replaceValue = patch?.groups?.replaceValue;

    if (find && (replaceValue || replaceKey)) {
      const replacement = replaceValue ?? dict[replaceKey!];
      if (replacement !== undefined) {
        const revised = replaceRightmost(find, replacement, src);
        if (revised.newSuffix) {
          return { ...revised, replacedKey: replaceValue ?? replaceKey };
        } else {
          dwarn(`${lineNum}: could not find '${find}' in ${src}`);
        }
      } else {
        dwarn(
          `${lineNum}: could not find replacement for '${replaceKey}' in:\n${pretty(
            dict
          )}`
        );
      }
    } else {
      dwarn(`${lineNum}: could not parse rule: ${patch}`);
    }
    return { prefix: src, newSuffix: undefined };
  }

  function replaceRightmost(find: string, replace: string, text: string): AppliedPatch {
    const found = text.lastIndexOf(find);
    if (found >= 0) {
      const start = text.slice(0, found);
      const end = text.slice(found + find.length);
      const newEnd = replace + end;
      return { prefix: start, newSuffix: newEnd };
    } else {
      return { prefix: text, newSuffix: undefined };
    }
  }
}
