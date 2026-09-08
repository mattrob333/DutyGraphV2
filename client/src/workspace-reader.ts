/** Drops responses from an old selection or a superseded refresh. */
export function createWorkspaceReader<T>(load: (id: string) => Promise<T>) {
  let selected = "",
    generation = 0,
    request = 0;
  return {
    select(id: string) {
      if (id !== selected) {
        selected = id;
        generation++;
        request++;
      }
    },
    async read(id: string): Promise<T | undefined> {
      if (!id || id !== selected) return undefined;
      const currentGeneration = generation,
        currentRequest = ++request;
      const current = () =>
        id === selected &&
        currentGeneration === generation &&
        currentRequest === request;
      try {
        const value = await load(id);
        return current() ? value : undefined;
      } catch (error) {
        if (current()) throw error;
        return undefined;
      }
    },
  };
}
