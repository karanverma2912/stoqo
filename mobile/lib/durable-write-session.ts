export type SavedWrite = {
  version: 1;
  path: string;
  body: Record<string, any>;
};
type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};

// Each activation owns its state; an earlier async request cannot overwrite
// the pending request for another product, store or account.
export class DurableWriteSession {
  active = true;
  pending: SavedWrite | null = null;
  ready = false;
  error = "";
  private running = false;

  constructor(
    readonly key: string,
    private storage: Storage,
    private changed: (session: DurableWriteSession) => void,
  ) {}

  private notify() {
    if (this.active) this.changed(this);
  }

  deactivate() {
    this.active = false;
  }

  async restore() {
    try {
      const raw = await this.storage.getItem(this.key);
      if (!this.active) return;
      if (raw) {
        const record = JSON.parse(raw) as SavedWrite;
        if (
          record?.version !== 1 ||
          typeof record.path !== "string" ||
          !record.path ||
          !record.body ||
          typeof record.body !== "object" ||
          Array.isArray(record.body)
        )
          throw new Error("Invalid saved request");
        this.pending = record;
      }
      this.ready = true;
    } catch {
      if (!this.active) return;
      this.error =
        "The saved request could not be restored. Please contact support before repeating this action.";
    }
    this.notify();
  }

  async execute<T>(
    create: () => SavedWrite,
    send: (record: SavedWrite) => Promise<T>,
    isRejected: (error: unknown) => boolean,
  ): Promise<T> {
    if (!this.active || !this.ready)
      throw new Error("Wait for saved requests to load.");
    if (this.running) throw new Error("This request is already in progress.");
    this.running = true;
    try {
      let record = this.pending;
      if (!record) {
        record = create();
        await this.storage.setItem(this.key, JSON.stringify(record));
        this.pending = record;
        this.notify();
      }
      if (!this.active)
        throw new Error(
          "The store or product changed before this request was sent.",
        );
      const result = await send(record);
      await this.storage.removeItem(this.key);
      this.pending = null;
      this.notify();
      if (!this.active)
        throw new Error(
          "The store or product changed while this request completed.",
        );
      return result;
    } catch (error) {
      if (isRejected(error)) {
        await this.storage.removeItem(this.key);
        this.pending = null;
        this.notify();
      }
      throw error;
    } finally {
      this.running = false;
    }
  }
}
