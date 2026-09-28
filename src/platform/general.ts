import type { PlatformAdapter } from './base';
import {
  findInputGeneric,
  readInputGeneric,
  writeInputGeneric,
  findSendButtonGeneric,
  findInputShellGeneric
} from './base';

export const generalAdapter: PlatformAdapter = {
  hostname: /.*/,
  name: '通用',
  findInput: findInputGeneric,
  readInput: readInputGeneric,
  writeInput: writeInputGeneric,
  findAnchor(input) {
    return input.parentElement ?? document.body;
  },
  findSendButton(input) {
    return findSendButtonGeneric(input);
  },
  findInputShell(input) {
    return findInputShellGeneric(input);
  }
};