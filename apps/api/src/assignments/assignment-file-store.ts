import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const ASSIGNMENT_FILE_STORE = 'ASSIGNMENT_FILE_STORE';

export type StoredAssignmentFile = {
  storageKey: string;
  data: Buffer;
};

export interface AssignmentFileStore {
  save(schoolId: string, data: Buffer, namespace?: 'assignments' | 'messages'): Promise<string>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
}

/**
 * Local development implementation. Production deployments replace this provider
 * with a private object-store adapter using the same interface.
 */
@Injectable()
export class LocalAssignmentFileStore implements AssignmentFileStore {
  private readonly root = resolve(
    process.env.ASSIGNMENT_FILE_STORAGE_PATH ?? join(tmpdir(), 'pinkora-edukonekta-assignments'),
  );

  private pathFor(storageKey: string) {
    if (!/^(assignments|messages)\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i.test(storageKey))
      throw new NotFoundException('Attachment not found');
    const filePath = resolve(this.root, ...storageKey.split('/'));
    if (!filePath.startsWith(`${this.root}\\`) && !filePath.startsWith(`${this.root}/`))
      throw new NotFoundException('Attachment not found');
    return filePath;
  }

  async save(schoolId: string, data: Buffer, namespace = 'assignments') {
    if (!['assignments', 'messages'].includes(namespace))
      throw new NotFoundException('Attachment namespace is invalid');
    const storageKey = `${namespace}/${schoolId}/${randomUUID()}`;
    const filePath = this.pathFor(storageKey);
    await mkdir(resolve(filePath, '..'), { recursive: true });
    await writeFile(filePath, data, { flag: 'wx', mode: 0o600 });
    return storageKey;
  }

  async read(storageKey: string) {
    try {
      return await readFile(this.pathFor(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new NotFoundException('Attachment not found');
      throw error;
    }
  }

  async remove(storageKey: string) {
    await rm(this.pathFor(storageKey), { force: true });
  }
}
