import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalAssignmentFileStore } from './assignment-file-store';

describe('LocalAssignmentFileStore', () => {
  it('stores, reads, and safely removes private attachment bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'edukonekta-assignment-test-'));
    const previous = process.env.ASSIGNMENT_FILE_STORAGE_PATH;
    process.env.ASSIGNMENT_FILE_STORAGE_PATH = root;
    try {
      const store = new LocalAssignmentFileStore();
      const key = await store.save(
        '00000000-0000-0000-0000-000000000001',
        Buffer.from('private work'),
      );
      await expect(store.read(key)).resolves.toEqual(Buffer.from('private work'));
      await store.remove(key);
      await expect(store.read(key)).rejects.toThrow('Attachment not found');
    } finally {
      if (previous) process.env.ASSIGNMENT_FILE_STORAGE_PATH = previous;
      else delete process.env.ASSIGNMENT_FILE_STORAGE_PATH;
      await rm(root, { recursive: true, force: true });
    }
  });
});
